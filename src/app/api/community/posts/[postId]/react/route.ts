import { type NextRequest, NextResponse } from "next/server";
import { PostStatus } from "@/generated/prisma";
import {
  CommunityError,
  assertCanWriteInCommunity,
  assertCommunityEnabled,
  communityPostInclude,
  loadCommunityActor,
  serializeCommunityPost,
} from "@/lib/community/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/prisma";
import { reactToCommunityPostSchema } from "@/types/schemas/community";

function toErrorResponse(error: unknown) {
  if (error instanceof CommunityError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("Error reacting to community post:", error);
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = reactToCommunityPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 422 });
    }

    const actor = await loadCommunityActor(session.user.id);
    if (!actor) {
      return NextResponse.json({ error: "User not found" }, { status: 403 });
    }

    const { postId } = await params;
    const post = await prisma.communityPost.findFirst({
      where: {
        id: postId,
        status: PostStatus.APPROVED,
      },
      select: {
        id: true,
        event: {
          select: {
            id: true,
            ownerId: true,
            endDate: true,
            communityEnabled: true,
            communityOpenAfterEnd: true,
            communityModerated: true,
            communityAttendeesOnly: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Community post not found" }, { status: 404 });
    }

    assertCommunityEnabled(post.event);
    await assertCanWriteInCommunity(actor, post.event);

    const existing = await prisma.postReaction.findUnique({
      where: {
        postId_userId_reaction: {
          postId: post.id,
          userId: actor.id,
          reaction: parsed.data.reaction,
        },
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.postReaction.delete({
        where: { id: existing.id },
      });
    } else {
      await prisma.postReaction.create({
        data: {
          postId: post.id,
          userId: actor.id,
          reaction: parsed.data.reaction,
        },
      });
    }

    const updatedPost = await prisma.communityPost.findUniqueOrThrow({
      where: { id: post.id },
      include: communityPostInclude,
    });
    const serialized = serializeCommunityPost(updatedPost, actor.id);

    return NextResponse.json(
      {
        reactions: serialized.reactions,
        viewerReactions: serialized.viewerReactions,
      },
      { status: 200 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
