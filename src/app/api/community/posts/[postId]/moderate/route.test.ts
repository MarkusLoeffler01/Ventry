import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const prismaMock = vi.hoisted(() => ({
  communityPost: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  postModerationLog: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/auth/event-admin", () => ({
  checkEventAdminAuth: vi.fn(),
}));

vi.mock("@/lib/community/server", () => ({
  softDeletePost: vi.fn(),
}));

const createNotificationMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/notifications", () => ({
  createNotification: createNotificationMock,
}));

import * as moderateRoute from "./route";
import { checkEventAdminAuth } from "@/lib/auth/event-admin";
import { softDeletePost } from "@/lib/community/server";

const mockedCheckEventAdminAuth = checkEventAdminAuth as unknown as ReturnType<typeof vi.fn>;
const mockedFindPost = prismaMock.communityPost.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockedUpdatePost = prismaMock.communityPost.update as unknown as ReturnType<typeof vi.fn>;
const mockedCreateModerationLog = prismaMock.postModerationLog.create as unknown as ReturnType<typeof vi.fn>;
const mockedTransaction = prismaMock.$transaction as unknown as ReturnType<typeof vi.fn>;
const mockedSoftDeletePost = softDeletePost as unknown as ReturnType<typeof vi.fn>;

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/community/posts/post-abc/moderate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function activePost(overrides: Record<string, unknown> = {}) {
  return {
    id: "post-abc",
    eventId: 7,
    authorId: "post-author",
    type: "TEXT",
    content: "Pending post",
    author: { name: "Post Author" },
    status: "PENDING",
    pinned: false,
    ...overrides,
  };
}

function authorizedAdmin() {
  return {
    authorized: true,
    adminId: "admin-1",
    user: { id: "user-admin", email: "admin@example.com" },
  };
}

describe("POST /api/community/posts/[postId]/moderate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createNotificationMock.mockResolvedValue({});
    mockedCheckEventAdminAuth.mockResolvedValue(authorizedAdmin());
    mockedFindPost.mockResolvedValue(activePost());
    mockedUpdatePost.mockReturnValue({ query: "update-post" });
    mockedCreateModerationLog.mockReturnValue({ query: "create-log" });
    mockedTransaction.mockResolvedValue([
      { id: "post-abc", status: "APPROVED", pinned: false },
      {},
    ]);
  });

  it("returns 422 for missing action", async () => {
    const response = await moderateRoute.POST(
      postRequest({}),
      { params: Promise.resolve({ postId: "post-abc" }) },
    );

    expect(response.status).toBe(422);
    expect(mockedFindPost).not.toHaveBeenCalled();
  });

  it("returns 422 for invalid action value", async () => {
    const response = await moderateRoute.POST(
      postRequest({ action: "ban" }),
      { params: Promise.resolve({ postId: "post-abc" }) },
    );

    expect(response.status).toBe(422);
    expect(mockedFindPost).not.toHaveBeenCalled();
  });

  it("returns 404 when post does not exist", async () => {
    mockedFindPost.mockResolvedValue(null);

    const response = await moderateRoute.POST(
      postRequest({ action: "approve" }),
      { params: Promise.resolve({ postId: "no-such-post" }) },
    );

    expect(response.status).toBe(404);
    expect(mockedCheckEventAdminAuth).not.toHaveBeenCalled();
  });

  it("returns 404 when post is already deleted", async () => {
    mockedFindPost.mockResolvedValue(activePost({ status: "DELETED" }));

    const response = await moderateRoute.POST(
      postRequest({ action: "approve" }),
      { params: Promise.resolve({ postId: "post-abc" }) },
    );

    expect(response.status).toBe(404);
    expect(mockedCheckEventAdminAuth).not.toHaveBeenCalled();
  });

  it("returns 403 when caller is not event admin", async () => {
    mockedCheckEventAdminAuth.mockResolvedValue({ authorized: false, error: "Forbidden" });

    const response = await moderateRoute.POST(
      postRequest({ action: "approve" }),
      { params: Promise.resolve({ postId: "post-abc" }) },
    );

    expect(response.status).toBe(403);
    expect(mockedTransaction).not.toHaveBeenCalled();
  });

  it("calls softDeletePost and returns 200 for remove action", async () => {
    mockedSoftDeletePost.mockResolvedValue(undefined);

    const response = await moderateRoute.POST(
      postRequest({ action: "remove" }),
      { params: Promise.resolve({ postId: "post-abc" }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ action: "removed" });
    expect(mockedSoftDeletePost).toHaveBeenCalledWith({
      postId: "post-abc",
      actor: expect.objectContaining({ id: "user-admin", isAdmin: true, adminId: "admin-1" }),
    });
    expect(mockedTransaction).not.toHaveBeenCalled();
  });

  it("approves post atomically and returns updated post", async () => {
    mockedTransaction.mockResolvedValue([
      { id: "post-abc", status: "APPROVED", pinned: false },
      {},
    ]);

    const response = await moderateRoute.POST(
      postRequest({ action: "approve" }),
      { params: Promise.resolve({ postId: "post-abc" }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      post: { id: "post-abc", status: "APPROVED", pinned: false },
    });
    expect(mockedTransaction).toHaveBeenCalledWith(expect.arrayContaining([expect.anything(), expect.anything()]));
    expect(mockedSoftDeletePost).not.toHaveBeenCalled();
    expect(createNotificationMock).toHaveBeenCalledWith(
      "post-author",
      "COMMUNITY",
      "Your post was approved",
      undefined,
      "/events/7/community#post-post-abc",
    );
  });

  it("rejects post and logs reason atomically", async () => {
    mockedTransaction.mockResolvedValue([
      { id: "post-abc", status: "REJECTED", pinned: false },
      {},
    ]);

    const response = await moderateRoute.POST(
      postRequest({ action: "reject", reason: "Inappropriate content" }),
      { params: Promise.resolve({ postId: "post-abc" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json() as { post: { status: string } };
    expect(body.post.status).toBe("REJECTED");
  });

  it("pins post without changing its status", async () => {
    mockedFindPost.mockResolvedValue(activePost({ status: "APPROVED", pinned: false }));
    mockedTransaction.mockResolvedValue([
      { id: "post-abc", status: "APPROVED", pinned: true },
      {},
    ]);

    const response = await moderateRoute.POST(
      postRequest({ action: "pin" }),
      { params: Promise.resolve({ postId: "post-abc" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json() as { post: { pinned: boolean; status: string } };
    expect(body.post.pinned).toBe(true);
    expect(body.post.status).toBe("APPROVED");
  });

  it("unpins post without changing its status", async () => {
    mockedFindPost.mockResolvedValue(activePost({ status: "APPROVED", pinned: true }));
    mockedTransaction.mockResolvedValue([
      { id: "post-abc", status: "APPROVED", pinned: false },
      {},
    ]);

    const response = await moderateRoute.POST(
      postRequest({ action: "unpin" }),
      { params: Promise.resolve({ postId: "post-abc" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json() as { post: { pinned: boolean } };
    expect(body.post.pinned).toBe(false);
  });

  it("uses post's own eventId for auth check", async () => {
    mockedFindPost.mockResolvedValue(activePost({ eventId: 42 }));

    await moderateRoute.POST(
      postRequest({ action: "approve" }),
      { params: Promise.resolve({ postId: "post-abc" }) },
    );

    expect(mockedCheckEventAdminAuth).toHaveBeenCalledWith(42, expect.anything());
  });
});
