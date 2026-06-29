import { type NextRequest, NextResponse } from "next/server";
import { NotificationType, PostStatus } from "@/generated/prisma";
import {
  CommunityError,
  assertCanWriteInCommunity,
  assertCommunityEnabled,
  communityCommentInclude,
  loadCommunityActor,
  loadCommunityEvent,
  serializeCommunityComment,
} from "@/lib/community/server";
import { getSession } from "@/lib/auth/session";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma/prisma";
import { createCommunityCommentSchema, listCommunityCommentsSchema } from "@/types/schemas/community";

function toErrorResponse(error: unknown, logMessage: string) {
  if (error instanceof CommunityError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error(logMessage, error);
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}

function parseMentionNames(content: string | null | undefined): string[] {
  if (!content) return [];
  const matches = content.match(/@(\S+)/g) ?? [];
  return matches.map(m => m.slice(1).replace(/_/g, " "));
}

function buildCommentLink(eventId: number, postId: string, commentId: string) {
  return `/events/${eventId}/community#post-${postId}-comment-${commentId}`;
}

async function buildMentionedUsersMap(userIds: string[]): Promise<Map<string, { id: string; name: string }>> {
  if (userIds.length === 0) return new Map();
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });
  return new Map(users.map(u => [u.id, { id: u.id, name: u.name ?? "User" }]));
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const { postId } = await params;
    const searchParams = Object.fromEntries(new URL(req.url).searchParams);
    const parsed = listCommunityCommentsSchema.safeParse(searchParams);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 422 });
    }

    const post = await prisma.communityPost.findUnique({
      where: { id: postId },
      select: { id: true, eventId: true, status: true },
    });

    if (!post || post.status === PostStatus.DELETED) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const event = await loadCommunityEvent(post.eventId);
    assertCommunityEnabled(event);

    const comments = await prisma.communityComment.findMany({
      where: {
        postId,
        status: PostStatus.APPROVED,
        deletedAt: null,
      },
      include: communityCommentInclude,
      orderBy: { createdAt: "asc" },
      take: parsed.data.limit + 1,
      ...(parsed.data.cursor
        ? { cursor: { id: parsed.data.cursor }, skip: 1 }
        : {}),
    });

    const hasMore = comments.length > parsed.data.limit;
    const page = hasMore ? comments.slice(0, parsed.data.limit) : comments;

    const allMentionedIds = [...new Set(page.flatMap(c => c.mentionedUserIds))];
    const mentionedUsersById = await buildMentionedUsersMap(allMentionedIds);

    return NextResponse.json(
      {
        comments: page.map(c => serializeCommunityComment(c, mentionedUsersById)),
        nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
      },
      { status: 200 },
    );
  } catch (error) {
    return toErrorResponse(error, "Error listing community comments:");
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const { postId } = await params;

    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createCommunityCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 422 });
    }

    const post = await prisma.communityPost.findUnique({
      where: { id: postId },
      select: { id: true, eventId: true, status: true, authorId: true },
    });

    if (!post || post.status === PostStatus.DELETED) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const actor = await loadCommunityActor(session.user.id);
    if (!actor) {
      return NextResponse.json({ error: "User not found" }, { status: 403 });
    }

    const event = await loadCommunityEvent(post.eventId);
    assertCommunityEnabled(event);
    await assertCanWriteInCommunity(actor, event);

    const mentionNames = parseMentionNames(parsed.data.content);
    let mentionedUserIds = parsed.data.mentionedUserIds;
    if (mentionNames.length > 0) {
      const resolved = await prisma.user.findMany({
        where: { name: { in: mentionNames } },
        select: { id: true, name: true },
      });
      mentionedUserIds = [...new Set([...mentionedUserIds, ...resolved.map(u => u.id)])];
    }

    const commentPending = event.communityModerated && event.communityModerateComments;

    const comment = await prisma.communityComment.create({
      data: {
        postId,
        authorId: actor.id,
        content: parsed.data.content || null,
        imageUrls: parsed.data.imageUrls,
        gifUrl: parsed.data.gifUrl || null,
        mentionedUserIds,
        status: commentPending ? PostStatus.PENDING : PostStatus.APPROVED,
      },
      include: communityCommentInclude,
    });

    const mentionedUsersById = await buildMentionedUsersMap(mentionedUserIds);

    if (comment.status === PostStatus.APPROVED) {
      const commenterName = await prisma.user
        .findUnique({ where: { id: actor.id }, select: { name: true } })
        .then((u) => u?.name ?? "Someone");
      const commentUrl = buildCommentLink(post.eventId, postId, comment.id);
      const notifiedUserIds = new Set<string>();

      if (post.authorId !== actor.id) {
        notifiedUserIds.add(post.authorId);
        createNotification(
          post.authorId,
          NotificationType.COMMENT,
          `${commenterName} commented on your post`,
          undefined,
          commentUrl,
        ).catch(() => null);
      }

      const possibleReplyTargetIds = [...new Set(mentionedUserIds)].filter(
        userId => userId !== actor.id && !notifiedUserIds.has(userId),
      );

      if (possibleReplyTargetIds.length > 0) {
        const replyTargets = await prisma.communityComment.findMany({
          where: {
            postId,
            authorId: { in: possibleReplyTargetIds },
            id: { not: comment.id },
            status: PostStatus.APPROVED,
            deletedAt: null,
          },
          select: { authorId: true },
          distinct: ["authorId"],
        });

        await Promise.allSettled(
          replyTargets.map((target) => {
            notifiedUserIds.add(target.authorId);
            return createNotification(
              target.authorId,
              NotificationType.COMMENT,
              `${commenterName} replied to your comment`,
              undefined,
              commentUrl,
            );
          }),
        );

        const replyTargetIds = new Set(replyTargets.map(target => target.authorId));
        const mentionOnlyTargetIds = possibleReplyTargetIds.filter(
          userId => !replyTargetIds.has(userId),
        );

        await Promise.allSettled(
          mentionOnlyTargetIds.map(userId =>
            createNotification(
              userId,
              NotificationType.COMMENT,
              `${commenterName} mentioned you in a comment`,
              undefined,
              commentUrl,
            ),
          ),
        );
      }
    }

    return NextResponse.json(
      {
        comment: serializeCommunityComment(comment, mentionedUsersById),
        pending: comment.status === PostStatus.PENDING,
      },
      { status: 201 },
    );
  } catch (error) {
    return toErrorResponse(error, "Error creating community comment:");
  }
}
