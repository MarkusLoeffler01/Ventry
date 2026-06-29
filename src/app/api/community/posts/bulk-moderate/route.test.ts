import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const prismaMock = vi.hoisted(() => ({
  communityPost: {
    findMany: vi.fn(),
    updateMany: vi.fn(),
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

import * as bulkRoute from "./route";
import { checkEventAdminAuth } from "@/lib/auth/event-admin";
import { softDeletePost } from "@/lib/community/server";

const mockedCheckEventAdminAuth = checkEventAdminAuth as unknown as ReturnType<typeof vi.fn>;
const mockedFindMany = prismaMock.communityPost.findMany as unknown as ReturnType<typeof vi.fn>;
const mockedTransaction = prismaMock.$transaction as unknown as ReturnType<typeof vi.fn>;
const mockedSoftDeletePost = softDeletePost as unknown as ReturnType<typeof vi.fn>;

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/community/posts/bulk-moderate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function authorizedAdmin() {
  return {
    authorized: true,
    adminId: "admin-1",
    user: { id: "user-admin", email: "admin@example.com" },
  };
}

describe("POST /api/community/posts/bulk-moderate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCheckEventAdminAuth.mockResolvedValue(authorizedAdmin());
    mockedFindMany.mockResolvedValue([{ id: "post-1" }, { id: "post-2" }]);
    mockedTransaction.mockResolvedValue([{}, {}, {}]);
    mockedSoftDeletePost.mockResolvedValue(undefined);
  });

  it("returns 422 for missing eventId", async () => {
    const response = await bulkRoute.POST(
      postRequest({ postIds: ["post-1"], action: "approve" }),
    );

    expect(response.status).toBe(422);
    expect(mockedCheckEventAdminAuth).not.toHaveBeenCalled();
  });

  it("returns 422 for empty postIds array", async () => {
    const response = await bulkRoute.POST(
      postRequest({ eventId: 7, postIds: [], action: "approve" }),
    );

    expect(response.status).toBe(422);
  });

  it("returns 422 for invalid action", async () => {
    const response = await bulkRoute.POST(
      postRequest({ eventId: 7, postIds: ["post-1"], action: "pin" }),
    );

    expect(response.status).toBe(422);
  });

  it("returns 403 when caller is not event admin", async () => {
    mockedCheckEventAdminAuth.mockResolvedValue({ authorized: false, error: "Forbidden" });

    const response = await bulkRoute.POST(
      postRequest({ eventId: 7, postIds: ["post-1"], action: "approve" }),
    );

    expect(response.status).toBe(403);
    expect(mockedFindMany).not.toHaveBeenCalled();
  });

  it("filters posts to valid IDs within the event", async () => {
    mockedFindMany.mockResolvedValue([{ id: "post-1" }]);

    const response = await bulkRoute.POST(
      postRequest({ eventId: 7, postIds: ["post-1", "post-other-event"], action: "approve" }),
    );

    expect(response.status).toBe(200);
    const body = await response.json() as { processed: number; skipped: number };
    expect(body.processed).toBe(1);
    expect(body.skipped).toBe(1);
    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ eventId: 7 }),
      }),
    );
  });

  it("uses softDeletePost loop for remove action", async () => {
    mockedFindMany.mockResolvedValue([{ id: "post-1" }, { id: "post-2" }]);

    const response = await bulkRoute.POST(
      postRequest({ eventId: 7, postIds: ["post-1", "post-2"], action: "remove" }),
    );

    expect(response.status).toBe(200);
    expect(mockedSoftDeletePost).toHaveBeenCalledTimes(2);
    expect(mockedSoftDeletePost).toHaveBeenCalledWith({
      postId: "post-1",
      actor: expect.objectContaining({ id: "user-admin", isAdmin: true }),
    });
    expect(mockedSoftDeletePost).toHaveBeenCalledWith({
      postId: "post-2",
      actor: expect.objectContaining({ id: "user-admin", isAdmin: true }),
    });
    expect(mockedTransaction).not.toHaveBeenCalled();
  });

  it("uses $transaction for approve action", async () => {
    mockedFindMany.mockResolvedValue([{ id: "post-1" }, { id: "post-2" }]);

    const response = await bulkRoute.POST(
      postRequest({ eventId: 7, postIds: ["post-1", "post-2"], action: "approve" }),
    );

    expect(response.status).toBe(200);
    expect(mockedTransaction).toHaveBeenCalledOnce();
    expect(mockedSoftDeletePost).not.toHaveBeenCalled();
    const body = await response.json() as { processed: number; skipped: number };
    expect(body).toEqual({ processed: 2, skipped: 0 });
  });

  it("uses $transaction for reject action with reason", async () => {
    mockedFindMany.mockResolvedValue([{ id: "post-1" }]);

    const response = await bulkRoute.POST(
      postRequest({ eventId: 7, postIds: ["post-1"], action: "reject", reason: "Spam" }),
    );

    expect(response.status).toBe(200);
    expect(mockedTransaction).toHaveBeenCalledOnce();
    const body = await response.json() as { processed: number; skipped: number };
    expect(body.processed).toBe(1);
  });

  it("returns processed=0 skipped=N when all posts are from another event", async () => {
    mockedFindMany.mockResolvedValue([]);

    const response = await bulkRoute.POST(
      postRequest({ eventId: 7, postIds: ["post-x", "post-y"], action: "approve" }),
    );

    expect(response.status).toBe(200);
    const body = await response.json() as { processed: number; skipped: number };
    expect(body).toEqual({ processed: 0, skipped: 2 });
  });

  it("checks auth against the eventId in body, not post's event", async () => {
    await bulkRoute.POST(
      postRequest({ eventId: 42, postIds: ["post-1"], action: "approve" }),
    );

    expect(mockedCheckEventAdminAuth).toHaveBeenCalledWith(42, expect.anything());
  });
});
