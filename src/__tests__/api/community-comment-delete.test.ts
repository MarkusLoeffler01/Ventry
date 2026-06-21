import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE } from "@/app/api/community/comments/[commentId]/route";
import { NextRequest } from "next/server";
import { PostStatus } from "@/generated/prisma";

vi.mock("@/lib/prisma/prisma", () => ({
  prisma: {
    communityComment: { findUnique: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma/prisma";

const getSessionMock = vi.fn();
vi.mock("@/lib/auth/session", () => ({ getSession: () => getSessionMock() }));

type P = {
  communityComment: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  user: { findUnique: ReturnType<typeof vi.fn> };
};
const p = prisma as unknown as P;

const COMMENT_ID = "comment-1";
const AUTHOR_ID = "user-author";
const OTHER_ID = "user-other";
const EVENT_OWNER_ADMIN_ID = "admin-event-owner";

const mockComment = {
  id: COMMENT_ID,
  authorId: AUTHOR_ID,
  deletedAt: null,
  post: { event: { ownerId: EVENT_OWNER_ADMIN_ID } },
};

const PARAMS = { params: Promise.resolve({ commentId: COMMENT_ID }) };

function makeReq(): NextRequest {
  return new NextRequest(`http://localhost/api/community/comments/${COMMENT_ID}`, { method: "DELETE" });
}

describe("DELETE /api/community/comments/[commentId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    p.communityComment.update.mockResolvedValue({});
  });

  it("returns 401 without session", async () => {
    getSessionMock.mockReturnValue(null);

    const res = await DELETE(makeReq(), PARAMS);
    expect(res.status).toBe(401);
  });

  it("returns 404 when comment does not exist", async () => {
    getSessionMock.mockReturnValue({ user: { id: AUTHOR_ID } });
    p.communityComment.findUnique.mockResolvedValue(null);

    const res = await DELETE(makeReq(), PARAMS);
    expect(res.status).toBe(404);
  });

  it("returns 404 when comment is already soft-deleted", async () => {
    getSessionMock.mockReturnValue({ user: { id: AUTHOR_ID } });
    p.communityComment.findUnique.mockResolvedValue({ ...mockComment, deletedAt: new Date() });

    const res = await DELETE(makeReq(), PARAMS);
    expect(res.status).toBe(404);
  });

  it("allows comment author to delete their own comment", async () => {
    getSessionMock.mockReturnValue({ user: { id: AUTHOR_ID } });
    p.communityComment.findUnique.mockResolvedValue(mockComment);
    p.user.findUnique.mockResolvedValue({ id: AUTHOR_ID, isAdmin: false, adminProfile: null });

    const res = await DELETE(makeReq(), PARAMS);
    const body = await res.json() as { deleted: boolean };

    expect(res.status).toBe(200);
    expect(body.deleted).toBe(true);
    expect(p.communityComment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PostStatus.DELETED,
          content: null,
          imageUrls: [],
          gifUrl: null,
          deletedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("returns 403 when non-author without admin rights tries to delete", async () => {
    getSessionMock.mockReturnValue({ user: { id: OTHER_ID } });
    p.communityComment.findUnique.mockResolvedValue(mockComment);
    p.user.findUnique.mockResolvedValue({ id: OTHER_ID, isAdmin: false, adminProfile: null });

    const res = await DELETE(makeReq(), PARAMS);
    expect(res.status).toBe(403);
  });

  it("allows platform admin to delete any comment", async () => {
    getSessionMock.mockReturnValue({ user: { id: OTHER_ID } });
    p.communityComment.findUnique.mockResolvedValue(mockComment);
    p.user.findUnique.mockResolvedValue({ id: OTHER_ID, isAdmin: true, adminProfile: { id: "admin-profile-id" } });

    const res = await DELETE(makeReq(), PARAMS);
    expect(res.status).toBe(200);
  });

  it("allows event owner to delete comments in their event", async () => {
    getSessionMock.mockReturnValue({ user: { id: OTHER_ID } });
    // mockComment has post.event.ownerId = EVENT_OWNER_ADMIN_ID
    p.communityComment.findUnique.mockResolvedValue(mockComment);
    // actor.adminId matches ownerId
    p.user.findUnique.mockResolvedValue({ id: OTHER_ID, isAdmin: false, adminProfile: { id: EVENT_OWNER_ADMIN_ID } });

    const res = await DELETE(makeReq(), PARAMS);
    expect(res.status).toBe(200);
  });
});
