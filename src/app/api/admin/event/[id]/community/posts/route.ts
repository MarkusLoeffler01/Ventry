import { type NextRequest, NextResponse } from "next/server";
import { PostStatus } from "@/generated/prisma";
import { checkEventAdminAuth } from "@/lib/auth/event-admin";
import { buildMentionMapForPosts, communityPostInclude, serializeCommunityPost } from "@/lib/community/server";
import { prisma } from "@/lib/prisma/prisma";

const VALID_STATUSES = Object.values(PostStatus);

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
  const statusParam = url.searchParams.get("status");
  const cursor = url.searchParams.get("cursor") || undefined;
  const limit = Math.min(Number(url.searchParams.get("limit") || "50") || 50, 100);

  const statusFilter =
    statusParam && VALID_STATUSES.includes(statusParam as PostStatus)
      ? { status: statusParam as PostStatus }
      : { status: { not: PostStatus.DELETED as PostStatus } };

  const posts = await prisma.communityPost.findMany({
    where: { eventId, ...statusFilter },
    include: communityPostInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = posts.length > limit;
  const page = hasMore ? posts.slice(0, limit) : posts;

  const mentionedUsersById = await buildMentionMapForPosts(page);

  return NextResponse.json({
    posts: page.map(p => serializeCommunityPost(p, auth.user?.id, mentionedUsersById)),
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
  });
}
