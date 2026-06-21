import { type NextRequest, NextResponse } from "next/server";
import { PostStatus, RegistrationStatus } from "@/generated/prisma";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId: eventIdStr } = await params;
  const eventId = parseInt(eventIdStr, 10);
  if (isNaN(eventId)) {
    return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim().replace(/_/g, " ") ?? "";

  const users = await prisma.user.findMany({
    where: {
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      OR: [
        { communityPosts: { some: { eventId, status: PostStatus.APPROVED } } },
        {
          communityComments: {
            some: { post: { eventId }, status: PostStatus.APPROVED, deletedAt: null },
          },
        },
        {
          registrations: {
            some: {
              eventId,
              status: { in: [RegistrationStatus.APPROVED, RegistrationStatus.CONFIRMED, RegistrationStatus.PENDING] },
            },
          },
        },
      ],
    },
    select: { id: true, name: true },
    take: 10,
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    users: users
      .filter(u => u.name)
      .map(u => ({ id: u.id, name: u.name! })),
  });
}
