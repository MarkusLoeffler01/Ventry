import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/community/posts/[postId]/comments/route";
import { NextRequest } from "next/server";
import { PostStatus } from "@/generated/prisma";

vi.mock("@/lib/prisma/prisma", () => ({
  prisma: {
    communityPost: { findUnique: vi.fn() },
    event: { findUnique: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    communityComment: { findMany: vi.fn(), create: vi.fn() },
    registration: { findFirst: vi.fn() },
  },
}));

const createNotificationMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/notifications", () => ({
  createNotification: createNotificationMock,
}));

import { prisma } from "@/lib/prisma/prisma";

const getSessionMock = vi.fn();
vi.mock("@/lib/auth/session", () => ({ getSession: () => getSessionMock() }));

type P = {
  communityPost: { findUnique: ReturnType<typeof vi.fn> };
  event: { findUnique: ReturnType<typeof vi.fn> };
  user: { findUnique: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  communityComment: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  registration: { findFirst: ReturnType<typeof vi.fn> };
};
const p = prisma as unknown as P;

const POST_ID = "post-abc";
const EVENT_ID = 42;
const USER_ID = "user-1";
const COMMENT_ID = "comment-xyz";

const mockEvent = {
  id: EVENT_ID,
  ownerId: null,
  endDate: new Date(Date.now() + 86_400_000),
  communityEnabled: true,
  communityOpenAfterEnd: true,
  communityModerated: false,
  communityModerateComments: false,
  communityAttendeesOnly: false,
};

const mockCommentRow = {
  id: COMMENT_ID,
  postId: POST_ID,
  authorId: USER_ID,
  content: "Hello @John_Doe!",
  imageUrls: [],
  gifUrl: null,
  mentionedUserIds: ["user-john"],
  status: PostStatus.APPROVED,
  deletedAt: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  author: { id: USER_ID, name: "Test User", image: null, profilePictures: [] },
};

const PARAMS = { params: Promise.resolve({ postId: POST_ID }) };

function req(url: string, method = "GET", body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  });
}

// ─── GET ──────────────────────────────────────────────────────────────────────

describe("GET /api/community/posts/[postId]/comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    p.communityPost.findUnique.mockResolvedValue({ id: POST_ID, eventId: EVENT_ID, status: PostStatus.APPROVED });
    p.event.findUnique.mockResolvedValue(mockEvent);
  });

  it("returns 404 when post does not exist", async () => {
    p.communityPost.findUnique.mockResolvedValue(null);

    const res = await GET(req(`http://localhost/comments`), PARAMS);
    expect(res.status).toBe(404);
  });

  it("returns 403 when community is disabled", async () => {
    p.event.findUnique.mockResolvedValue({ ...mockEvent, communityEnabled: false });
    p.communityComment.findMany.mockResolvedValue([]);
    p.user.findMany.mockResolvedValue([]);

    const res = await GET(req(`http://localhost/comments`), PARAMS);
    expect(res.status).toBe(403);
  });

  it("returns comments with mentionedUsers resolved from IDs", async () => {
    p.communityComment.findMany.mockResolvedValue([mockCommentRow]);
    p.user.findMany.mockResolvedValue([{ id: "user-john", name: "John Doe" }]);

    const res = await GET(req(`http://localhost/comments`), PARAMS);
    const body = await res.json() as { comments: { mentionedUsers: { id: string; name: string }[] }[] };

    expect(res.status).toBe(200);
    expect(body.comments).toHaveLength(1);
    expect(body.comments[0].mentionedUsers).toEqual([{ id: "user-john", name: "John Doe" }]);
  });

  it("returns empty mentionedUsers for comments with no mentions", async () => {
    const noMentionRow = { ...mockCommentRow, content: "plain text", mentionedUserIds: [] };
    p.communityComment.findMany.mockResolvedValue([noMentionRow]);
    p.user.findMany.mockResolvedValue([]);

    const res = await GET(req(`http://localhost/comments`), PARAMS);
    const body = await res.json() as { comments: { mentionedUsers: unknown[] }[] };

    expect(res.status).toBe(200);
    expect(body.comments[0].mentionedUsers).toEqual([]);
  });

  it("sets nextCursor when more items exist beyond limit", async () => {
    const comments = Array.from({ length: 6 }, (_, i) => ({
      ...mockCommentRow, id: `c-${i}`, mentionedUserIds: [],
    }));
    p.communityComment.findMany.mockResolvedValue(comments);
    p.user.findMany.mockResolvedValue([]);

    const res = await GET(req(`http://localhost/comments?limit=5`), PARAMS);
    const body = await res.json() as { comments: unknown[]; nextCursor: string | null };

    expect(body.comments).toHaveLength(5);
    expect(body.nextCursor).toBe("c-4");
  });

  it("sets nextCursor to null when no more items", async () => {
    p.communityComment.findMany.mockResolvedValue([{ ...mockCommentRow, mentionedUserIds: [] }]);
    p.user.findMany.mockResolvedValue([]);

    const res = await GET(req(`http://localhost/comments?limit=5`), PARAMS);
    const body = await res.json() as { nextCursor: string | null };

    expect(body.nextCursor).toBeNull();
  });
});

// ─── POST ─────────────────────────────────────────────────────────────────────

describe("POST /api/community/posts/[postId]/comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createNotificationMock.mockResolvedValue({});
    getSessionMock.mockReturnValue({ user: { id: USER_ID } });
    p.communityPost.findUnique.mockResolvedValue({ id: POST_ID, eventId: EVENT_ID, status: PostStatus.APPROVED, authorId: USER_ID });
    p.user.findUnique.mockResolvedValue({ id: USER_ID, isAdmin: false, adminProfile: null });
    p.event.findUnique.mockResolvedValue(mockEvent);
    p.user.findMany.mockResolvedValue([]);
    p.communityComment.findMany.mockResolvedValue([]);
  });

  it("returns 401 without session", async () => {
    getSessionMock.mockReturnValue(null);

    const res = await POST(req(`http://localhost/comments`, "POST", { content: "hi" }), PARAMS);
    expect(res.status).toBe(401);
  });

  it("returns 422 when comment is empty", async () => {
    const res = await POST(req(`http://localhost/comments`, "POST", {}), PARAMS);
    expect(res.status).toBe(422);
  });

  it("creates comment and returns 201", async () => {
    const created = { ...mockCommentRow, content: "hi", mentionedUserIds: [] };
    p.communityComment.create.mockResolvedValue(created);

    const res = await POST(req(`http://localhost/comments`, "POST", { content: "hi" }), PARAMS);
    const body = await res.json() as { comment: { id: string }; pending: boolean };

    expect(res.status).toBe(201);
    expect(body.comment.id).toBe(COMMENT_ID);
    expect(body.pending).toBe(false);
  });

  it("notifies the post author with a direct comment anchor", async () => {
    p.communityPost.findUnique.mockResolvedValue({
      id: POST_ID,
      eventId: EVENT_ID,
      status: PostStatus.APPROVED,
      authorId: "post-author",
    });
    p.user.findUnique
      .mockResolvedValueOnce({ id: USER_ID, isAdmin: false, adminProfile: null })
      .mockResolvedValueOnce({ name: "Test User" });
    p.communityComment.create.mockResolvedValue({ ...mockCommentRow, content: "hi", mentionedUserIds: [] });

    const res = await POST(req(`http://localhost/comments`, "POST", { content: "hi" }), PARAMS);

    expect(res.status).toBe(201);
    expect(createNotificationMock).toHaveBeenCalledWith(
      "post-author",
      "COMMENT",
      "Test User commented on your post",
      undefined,
      `/events/${EVENT_ID}/community#post-${POST_ID}-comment-${COMMENT_ID}`,
    );
  });

  it("notifies a mentioned prior commenter as a reply", async () => {
    const priorCommenter = { id: "user-john", name: "John Doe" };
    p.user.findMany
      .mockResolvedValueOnce([priorCommenter])
      .mockResolvedValueOnce([priorCommenter]);
    p.user.findUnique
      .mockResolvedValueOnce({ id: USER_ID, isAdmin: false, adminProfile: null })
      .mockResolvedValueOnce({ name: "Test User" });
    p.communityComment.findMany.mockResolvedValueOnce([{ authorId: "user-john" }]);
    p.communityComment.create.mockResolvedValue({
      ...mockCommentRow,
      content: "Hey @John_Doe",
      mentionedUserIds: ["user-john"],
    });

    const res = await POST(req(`http://localhost/comments`, "POST", { content: "Hey @John_Doe" }), PARAMS);

    expect(res.status).toBe(201);
    expect(createNotificationMock).toHaveBeenCalledWith(
      "user-john",
      "COMMENT",
      "Test User replied to your comment",
      undefined,
      `/events/${EVENT_ID}/community#post-${POST_ID}-comment-${COMMENT_ID}`,
    );
  });

  it("does not notify for moderated comments that are still pending", async () => {
    p.event.findUnique.mockResolvedValue({ ...mockEvent, communityModerated: true, communityModerateComments: true });
    p.communityPost.findUnique.mockResolvedValue({
      id: POST_ID,
      eventId: EVENT_ID,
      status: PostStatus.APPROVED,
      authorId: "post-author",
    });
    p.communityComment.create.mockResolvedValue({ ...mockCommentRow, status: PostStatus.PENDING, mentionedUserIds: [] });

    const res = await POST(req(`http://localhost/comments`, "POST", { content: "hi" }), PARAMS);

    expect(res.status).toBe(201);
    expect(createNotificationMock).not.toHaveBeenCalled();
  });

  it("resolves @name tokens and stores user IDs in mentionedUserIds", async () => {
    const mentioned = { id: "user-john", name: "John Doe" };
    // First findMany: resolve name → ID. Second findMany: build mention map.
    p.user.findMany.mockResolvedValueOnce([mentioned]).mockResolvedValueOnce([mentioned]);
    const created = { ...mockCommentRow, content: "Hey @John_Doe", mentionedUserIds: ["user-john"] };
    p.communityComment.create.mockResolvedValue(created);

    const res = await POST(
      req(`http://localhost/comments`, "POST", { content: "Hey @John_Doe" }),
      PARAMS,
    );
    const body = await res.json() as { comment: { mentionedUsers: { id: string }[] } };

    expect(res.status).toBe(201);
    expect(body.comment.mentionedUsers).toEqual([{ id: "user-john", name: "John Doe" }]);
    expect(p.communityComment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ mentionedUserIds: ["user-john"] }),
      }),
    );
  });

  it("stores comment as PENDING when communityModerated + communityModerateComments", async () => {
    p.event.findUnique.mockResolvedValue({ ...mockEvent, communityModerated: true, communityModerateComments: true });
    p.communityComment.create.mockResolvedValue({ ...mockCommentRow, status: PostStatus.PENDING, mentionedUserIds: [] });

    const res = await POST(req(`http://localhost/comments`, "POST", { content: "hi" }), PARAMS);
    const body = await res.json() as { pending: boolean };

    expect(res.status).toBe(201);
    expect(body.pending).toBe(true);
    expect(p.communityComment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: PostStatus.PENDING }) }),
    );
  });

  it("stores comment as APPROVED when post moderation on but comment moderation off", async () => {
    p.event.findUnique.mockResolvedValue({ ...mockEvent, communityModerated: true, communityModerateComments: false });
    p.communityComment.create.mockResolvedValue({ ...mockCommentRow, status: PostStatus.APPROVED, mentionedUserIds: [] });

    await POST(req(`http://localhost/comments`, "POST", { content: "hi" }), PARAMS);

    expect(p.communityComment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: PostStatus.APPROVED }) }),
    );
  });

  it("returns 404 when post does not exist", async () => {
    p.communityPost.findUnique.mockResolvedValue(null);

    const res = await POST(req(`http://localhost/comments`, "POST", { content: "hi" }), PARAMS);
    expect(res.status).toBe(404);
  });
});
