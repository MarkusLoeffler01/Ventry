import { type NextRequest, NextResponse } from "next/server";
import { ModerationAction, PostStatus } from "@/generated/prisma";
import {
  CommunityError,
  assertCanWriteInCommunity,
  assertCommunityEnabled,
  buildMentionMapForPosts,
  communityPostInclude,
  deriveCommunityPostTags,
  loadCommunityActor,
  loadCommunityEvent,
  refreshCommunityPostsProfilePictures,
  serializeCommunityPost,
} from "@/lib/community/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/prisma";
import { createCommunityPostSchema, listCommunityPostsSchema } from "@/types/schemas/community";

function toErrorResponse(error: unknown, logMessage: string) {
  if (error instanceof CommunityError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error(logMessage, error);
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}

export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(new URL(req.url).searchParams);
    const parsed = listCommunityPostsSchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 422 });
    }

    const session = await getSession();
    const event = await loadCommunityEvent(parsed.data.eventId);
    assertCommunityEnabled(event);

    const posts = await prisma.communityPost.findMany({
      where: {
        eventId: event.id,
        status: PostStatus.APPROVED,
      },
      include: communityPostInclude,
      orderBy: [
        { pinned: "desc" },
        { createdAt: "desc" },
        { id: "desc" },
      ],
      take: parsed.data.limit + 1,
      ...(parsed.data.cursor
        ? {
            cursor: { id: parsed.data.cursor },
            skip: 1,
          }
        : {}),
    });

    const hasMore = posts.length > parsed.data.limit;
    const page = hasMore ? posts.slice(0, parsed.data.limit) : posts;

    const mentionedUsersById = await buildMentionMapForPosts(page);
    await refreshCommunityPostsProfilePictures(page);

    return NextResponse.json(
      {
        posts: page.map(post => serializeCommunityPost(post, session?.user?.id, mentionedUsersById)),
        nextCursor: hasMore ? page[page.length - 1]?.id || null : null,
      },
      { status: 200 },
    );
  } catch (error) {
    return toErrorResponse(error, "Error listing community posts:");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createCommunityPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 422 });
    }

    const actor = await loadCommunityActor(session.user.id);
    if (!actor) {
      return NextResponse.json({ error: "User not found" }, { status: 403 });
    }

    const event = await loadCommunityEvent(parsed.data.eventId);
    assertCommunityEnabled(event);
    await assertCanWriteInCommunity(actor, event);
    const imageUrls = parsed.data.type === "IMAGE" ? parsed.data.imageUrls : [];
    const linkUrl = parsed.data.type === "LINK" ? parsed.data.linkUrl || null : null;
    const feedbacks = parsed.data.feedbacks.length > 0
      ? parsed.data.feedbacks.map(feedback => ({
          content: feedback.content || null,
          feedbackRating: feedback.feedbackRating ?? null,
          feedbackType: feedback.feedbackType,
        }))
      : parsed.data.type === "FEEDBACK" && parsed.data.feedbackType
        ? [
            {
              content: parsed.data.content || null,
              feedbackRating: parsed.data.feedbackRating ?? null,
              feedbackType: parsed.data.feedbackType,
            },
          ]
        : [];
    const primaryFeedback = feedbacks[0] || null;

    const post = await prisma.communityPost.create({
      data: {
        eventId: event.id,
        authorId: actor.id,
        type: parsed.data.type,
        tags: deriveCommunityPostTags({
          type: parsed.data.type,
          imageUrls,
          linkUrl,
          feedbacks,
          feedbackRating: primaryFeedback?.feedbackRating ?? null,
          feedbackType: primaryFeedback?.feedbackType ?? null,
        }),
        content: parsed.data.content || null,
        imageUrls,
        linkUrl,
        feedbackRating: primaryFeedback?.feedbackRating ?? null,
        feedbackType: primaryFeedback?.feedbackType ?? null,
        feedbackEntries: feedbacks,
        status: event.communityModerated ? PostStatus.PENDING : PostStatus.APPROVED,
        moderationLogs: {
          create: {
            actorUserId: actor.id,
            actorAdminId: actor.adminId,
            action: ModerationAction.CREATED,
            metadata: {},
          },
        },
      },
      include: communityPostInclude,
    });
    await refreshCommunityPostsProfilePictures([post]);

    return NextResponse.json(
      {
        post: serializeCommunityPost(post, actor.id),
        pending: post.status === PostStatus.PENDING,
      },
      { status: 201 },
    );
  } catch (error) {
    return toErrorResponse(error, "Error creating community post:");
  }
}
