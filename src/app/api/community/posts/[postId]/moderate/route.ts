import { type NextRequest, NextResponse } from "next/server";
import { ModerationAction, PostStatus } from "@/generated/prisma";
import { checkEventAdminAuth } from "@/lib/auth/event-admin";
import { softDeletePost } from "@/lib/community/server";
import { prisma } from "@/lib/prisma/prisma";
import { moderateCommunityPostSchema } from "@/types/schemas/community";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = moderateCommunityPostSchema.safeParse(body);
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

  const auth = await checkEventAdminAuth(post.eventId, req.headers);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const actor = {
    id: auth.user!.id,
    isAdmin: true,
    adminId: auth.adminId || null,
  };

  const { action, reason } = parsed.data;

  if (action === "remove") {
    await softDeletePost({ postId, actor });
    return NextResponse.json({ action: "removed" }, { status: 200 });
  }

  const statusMap = {
    approve: PostStatus.APPROVED,
    reject: PostStatus.REJECTED,
  } as const;

  const logActionMap = {
    approve: ModerationAction.APPROVED,
    reject: ModerationAction.REJECTED,
    pin: ModerationAction.PINNED,
    unpin: ModerationAction.UNPINNED,
  } as const;

  const [updated] = await prisma.$transaction([
    prisma.communityPost.update({
      where: { id: postId },
      data: {
        ...(action in statusMap ? { status: statusMap[action as keyof typeof statusMap] } : {}),
        ...(action === "pin" ? { pinned: true } : {}),
        ...(action === "unpin" ? { pinned: false } : {}),
      },
    }),
    prisma.postModerationLog.create({
      data: {
        postId,
        actorUserId: actor.id,
        actorAdminId: actor.adminId,
        action: logActionMap[action as keyof typeof logActionMap],
        reason: reason ?? null,
        metadata: {},
      },
    }),
  ]);

  return NextResponse.json(
    { post: { id: updated.id, status: updated.status, pinned: updated.pinned } },
    { status: 200 },
  );
}
