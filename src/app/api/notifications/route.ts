import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/prisma";
import type { NotificationType } from "@/generated/prisma";

const VALID_TYPES = new Set<string>(["COMMENT", "EVENT", "COMMUNITY", "SYSTEM"]);

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 50);
  const cursor = searchParams.get("cursor") ?? undefined;
  const rawType = searchParams.get("type");
  const type = rawType && VALID_TYPES.has(rawType) ? (rawType as NotificationType) : undefined;

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId: session.user.id,
        ...(type ? { type } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    }),
    prisma.notification.count({
      where: { userId: session.user.id, read: false },
    }),
  ]);

  const hasMore = notifications.length > limit;
  const page = hasMore ? notifications.slice(0, limit) : notifications;

  return NextResponse.json({
    notifications: page,
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
    unreadCount,
  });
}
