import { type NextRequest, NextResponse } from "next/server";
import { ModerationAction, PostStatus } from "@/generated/prisma";
import { checkEventAdminAuth } from "@/lib/auth/event-admin";
import { softDeletePost } from "@/lib/community/server";
import { prisma } from "@/lib/prisma/prisma";
import { bulkModerateCommunityPostsSchema } from "@/types/schemas/community";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bulkModerateCommunityPostsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 422 });
  }

  const { eventId, postIds, action, reason } = parsed.data;

  const auth = await checkEventAdminAuth(eventId, req.headers);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const actor = {
    id: auth.user!.id,
    isAdmin: true,
    adminId: auth.adminId || null,
  };

  const posts = await prisma.communityPost.findMany({
    where: {
      id: { in: postIds },
      eventId,
      status: { not: PostStatus.DELETED },
    },
    select: { id: true },
  });

  const validIds = posts.map(p => p.id);

  if (action === "remove") {
    for (const postId of validIds) {
      await softDeletePost({ postId, actor });
    }
  } else {
    const statusMap = {
      approve: PostStatus.APPROVED,
      reject: PostStatus.REJECTED,
    } as const;

    const logActionMap = {
      approve: ModerationAction.APPROVED,
      reject: ModerationAction.REJECTED,
    } as const;

    await prisma.$transaction([
      prisma.communityPost.updateMany({
        where: { id: { in: validIds } },
        data: { status: statusMap[action] },
      }),
      ...validIds.map(postId =>
        prisma.postModerationLog.create({
          data: {
            postId,
            actorUserId: actor.id,
            actorAdminId: actor.adminId,
            action: logActionMap[action],
            reason: reason || null,
            metadata: {},
          },
        }),
      ),
    ]);
  }

  return NextResponse.json(
    { processed: validIds.length, skipped: postIds.length - validIds.length },
    { status: 200 },
  );
}
