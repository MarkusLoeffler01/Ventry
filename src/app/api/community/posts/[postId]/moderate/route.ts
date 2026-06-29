import { type NextRequest, NextResponse } from "next/server";
import { ModerationAction, NotificationType, PostStatus } from "@/generated/prisma";
import { checkEventAdminAuth } from "@/lib/auth/event-admin";
import { softDeletePost } from "@/lib/community/server";
import { renderComponentToHTML } from "@/lib/helpers/html";
import { sendMail } from "@/lib/mail";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma/prisma";
import { moderateCommunityPostSchema } from "@/types/schemas/community";
import CommunityDigestMail from "@/components/emails/CommunityDigestMail";

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
    select: {
      id: true,
      eventId: true,
      status: true,
      authorId: true,
      type: true,
      content: true,
      author: { select: { name: true } },
    },
  });

  if (!post || post.status === PostStatus.DELETED) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const auth = await checkEventAdminAuth(post.eventId, req.headers);
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const actor = {
    id: auth.user.id,
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

  if (action === "approve") {
    const baseUrl = process.env.BETTER_AUTH_URL ?? "";
    const eventPath = `/events/${post.eventId}#post-${post.id}`;

    createNotification(
      post.authorId,
      NotificationType.COMMUNITY,
      "Your post was approved",
      undefined,
      eventPath,
    ).catch(() => null);

    sendCommunityDigest(post.eventId, {
      id: post.id,
      type: post.type,
      content: post.content,
      authorName: post.author?.name ?? "Attendee",
    }, baseUrl).catch(() => null);
  }

  return NextResponse.json(
    { post: { id: updated.id, status: updated.status, pinned: updated.pinned } },
    { status: 200 },
  );
}

const DIGEST_COOLDOWN_MS = 24 * 60 * 60 * 1000;

async function sendCommunityDigest(
  eventId: number,
  post: { id: string; type: string; content: string | null; authorName: string },
  baseUrl: string,
) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, name: true, lastDigestSentAt: true },
  });

  if (!event) return;

  if (
    event.lastDigestSentAt &&
    Date.now() - event.lastDigestSentAt.getTime() < DIGEST_COOLDOWN_MS
  ) {
    return;
  }

  const registrations = await prisma.registration.findMany({
    where: {
      eventId,
      status: { in: ["CONFIRMED", "APPROVED"] },
      communityNotifications: true,
    },
    select: {
      id: true,
      user: { select: { email: true, name: true } },
    },
  });

  if (registrations.length === 0) return;

  await prisma.event.update({
    where: { id: eventId },
    data: { lastDigestSentAt: new Date() },
  });

  const posts = [post];
  const eventUrl = `${baseUrl}/events/${eventId}/community`;

  await Promise.allSettled(
    registrations.map(async (reg) => {
      const { email, name } = reg.user;
      const unsubscribeUrl = `${baseUrl}/api/community/unsubscribe?registrationId=${reg.id}`;
      const html = await renderComponentToHTML(CommunityDigestMail, {
        userName: name ?? "Attendee",
        eventName: event.name,
        eventUrl,
        posts,
        unsubscribeUrl,
      });
      await sendMail(email, `New Community Posts: ${event.name}`, html);
    }),
  );
}
