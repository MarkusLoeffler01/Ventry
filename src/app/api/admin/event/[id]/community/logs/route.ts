import { type NextRequest, NextResponse } from "next/server";
import { checkEventAdminAuth } from "@/lib/auth/event-admin";
import { prisma } from "@/lib/prisma/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const eventId = Number((await params).id);
  if (Number.isNaN(eventId)) {
    return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
  }

  const auth = await checkEventAdminAuth(eventId, req.headers);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor") || undefined;
  const limit = Math.min(Number(url.searchParams.get("limit") || "50") || 50, 100);

  const logs = await prisma.postModerationLog.findMany({
    where: { post: { eventId } },
    include: {
      post: { select: { id: true, type: true, content: true, status: true } },
      actorUser: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = logs.length > limit;
  const page = hasMore ? logs.slice(0, limit) : logs;

  return NextResponse.json({
    logs: page.map(log => ({
      id: log.id,
      postId: log.postId,
      action: log.action,
      reason: log.reason,
      createdAt: log.createdAt.toISOString(),
      post: log.post,
      actor: log.actorUser
        ? { id: log.actorUser.id, name: log.actorUser.name, email: log.actorUser.email }
        : null,
    })),
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
  });
}
