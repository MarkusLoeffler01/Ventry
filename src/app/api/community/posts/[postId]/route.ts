import { type NextRequest, NextResponse } from "next/server";
import { PostStatus } from "@/generated/prisma";
import {
  CommunityError,
  assertCanDeletePost,
  loadCommunityActor,
  softDeletePost,
} from "@/lib/community/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/prisma";

function toErrorResponse(error: unknown) {
  if (error instanceof CommunityError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("Error deleting community post:", error);
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const actor = await loadCommunityActor(session.user.id);
    if (!actor) {
      return NextResponse.json({ error: "User not found" }, { status: 403 });
    }

    const { postId } = await params;
    const post = await prisma.communityPost.findFirst({
      where: {
        id: postId,
        status: { not: PostStatus.DELETED },
      },
      select: {
        id: true,
        authorId: true,
        event: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Community post not found" }, { status: 404 });
    }

    assertCanDeletePost(actor, post);
    await softDeletePost({ postId: post.id, actor });

    return NextResponse.json({ deleted: true }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
