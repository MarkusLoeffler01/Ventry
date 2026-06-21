import { type NextRequest, NextResponse } from "next/server";
import { PostStatus } from "@/generated/prisma";
import {
  CommunityError,
  isEventOwner,
  loadCommunityActor,
} from "@/lib/community/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/prisma";

function toErrorResponse(error: unknown, logMessage: string) {
  if (error instanceof CommunityError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error(logMessage, error);
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ commentId: string }> }) {
  try {
    const { commentId } = await params;

    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const comment = await prisma.communityComment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        authorId: true,
        deletedAt: true,
        post: {
          select: {
            event: {
              select: { ownerId: true },
            },
          },
        },
      },
    });

    if (!comment || comment.deletedAt) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const actor = await loadCommunityActor(session.user.id);
    if (!actor) {
      return NextResponse.json({ error: "User not found" }, { status: 403 });
    }

    const canDelete =
      comment.authorId === actor.id ||
      actor.isAdmin ||
      isEventOwner(actor, comment.post.event);

    if (!canDelete) {
      return NextResponse.json({ error: "You cannot delete this comment" }, { status: 403 });
    }

    await prisma.communityComment.update({
      where: { id: commentId },
      data: {
        status: PostStatus.DELETED,
        content: null,
        imageUrls: [],
        gifUrl: null,
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ deleted: true }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error, "Error deleting community comment:");
  }
}
