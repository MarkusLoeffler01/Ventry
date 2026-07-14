import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const prismaMock = vi.hoisted(() => ({
  communityPost: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/auth/event-admin", () => ({
  checkEventAdminAuth: vi.fn(),
}));

vi.mock("@/lib/community/server", () => ({
  communityPostInclude: {},
  serializeCommunityPost: vi.fn((p: { id: string }) => ({ id: p.id, serialized: true })),
  buildMentionMapForPosts: vi.fn(() => Promise.resolve(new Map([["u1", { id: "u1", name: "Alice" }]]))),
  refreshCommunityPostsProfilePictures: vi.fn(() => Promise.resolve()),
}));

import * as postsRoute from "./route";
import { checkEventAdminAuth } from "@/lib/auth/event-admin";
import { buildMentionMapForPosts, refreshCommunityPostsProfilePictures, serializeCommunityPost } from "@/lib/community/server";

const mockedBuildMentionMap = buildMentionMapForPosts as unknown as ReturnType<typeof vi.fn>;
const mockedRefreshProfilePictures = refreshCommunityPostsProfilePictures as unknown as ReturnType<typeof vi.fn>;
const mockedSerialize = serializeCommunityPost as unknown as ReturnType<typeof vi.fn>;

const mockedCheckEventAdminAuth = checkEventAdminAuth as unknown as ReturnType<typeof vi.fn>;
const mockedFindMany = prismaMock.communityPost.findMany as unknown as ReturnType<typeof vi.fn>;

function getRequest(eventId: string, query: Record<string, string> = {}) {
  const url = new URL(`http://localhost/api/admin/event/${eventId}/community/posts`);
  for (const [k, v] of Object.entries(query)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString());
}

function authorizedAdmin() {
  return {
    authorized: true,
    adminId: "admin-1",
    user: { id: "user-admin", email: "admin@example.com" },
  };
}

function makePosts(count: number) {
  return Array.from({ length: count }, (_, i) => ({ id: `post-${i}` }));
}

describe("GET /api/admin/event/[id]/community/posts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCheckEventAdminAuth.mockResolvedValue(authorizedAdmin());
    mockedFindMany.mockResolvedValue(makePosts(3));
  });

  it("returns 400 for non-numeric event ID", async () => {
    const response = await postsRoute.GET(
      getRequest("not-a-number"),
      { params: Promise.resolve({ id: "not-a-number" }) },
    );

    expect(response.status).toBe(400);
    const body = await response.json() as { error: string };
    expect(body.error).toBe("Invalid event ID");
    expect(mockedCheckEventAdminAuth).not.toHaveBeenCalled();
  });

  it("returns 403 when caller is not event admin", async () => {
    mockedCheckEventAdminAuth.mockResolvedValue({ authorized: false, error: "Forbidden" });

    const response = await postsRoute.GET(
      getRequest("7"),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(response.status).toBe(403);
    expect(mockedFindMany).not.toHaveBeenCalled();
  });

  it("returns posts list with no nextCursor when under limit", async () => {
    mockedFindMany.mockResolvedValue(makePosts(3));

    const response = await postsRoute.GET(
      getRequest("7"),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json() as { posts: unknown[]; nextCursor: unknown };
    expect(body.posts).toHaveLength(3);
    expect(body.nextCursor).toBeNull();
  });

  it("excludes DELETED posts by default (no status param)", async () => {
    await postsRoute.GET(
      getRequest("7"),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: expect.objectContaining({ not: "DELETED" }),
        }),
      }),
    );
  });

  it("filters by specific status when status param provided", async () => {
    await postsRoute.GET(
      getRequest("7", { status: "PENDING" }),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "PENDING" }),
      }),
    );
  });

  it("returns only DELETED posts when status=DELETED", async () => {
    await postsRoute.GET(
      getRequest("7", { status: "DELETED" }),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "DELETED" }),
      }),
    );
  });

  it("ignores invalid status param and falls back to default filter", async () => {
    await postsRoute.GET(
      getRequest("7", { status: "BOGUS" }),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: expect.objectContaining({ not: "DELETED" }),
        }),
      }),
    );
  });

  it("paginates: returns nextCursor when more posts exist", async () => {
    mockedFindMany.mockResolvedValue(makePosts(51));

    const response = await postsRoute.GET(
      getRequest("7", { limit: "50" }),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json() as { posts: unknown[]; nextCursor: string };
    expect(body.posts).toHaveLength(50);
    expect(body.nextCursor).toBe("post-49");
  });

  it("passes cursor to findMany when cursor param provided", async () => {
    await postsRoute.GET(
      getRequest("7", { cursor: "post-50" }),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: "post-50" },
        skip: 1,
      }),
    );
  });

  it("clamps limit to 100 even if caller requests more", async () => {
    mockedFindMany.mockResolvedValue(makePosts(5));

    await postsRoute.GET(
      getRequest("7", { limit: "999" }),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 101,
      }),
    );
  });

  it("defaults limit to 50 for NaN limit param", async () => {
    mockedFindMany.mockResolvedValue(makePosts(3));

    await postsRoute.GET(
      getRequest("7", { limit: "abc" }),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 51,
      }),
    );
  });

  it("calls buildMentionMapForPosts with the page of posts", async () => {
    const posts = makePosts(3);
    mockedFindMany.mockResolvedValue(posts);

    await postsRoute.GET(
      getRequest("7"),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(mockedBuildMentionMap).toHaveBeenCalledWith(posts);
  });

  it("refreshes profile pictures before serializing posts", async () => {
    const posts = makePosts(3);
    mockedFindMany.mockResolvedValue(posts);

    await postsRoute.GET(
      getRequest("7"),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(mockedRefreshProfilePictures).toHaveBeenCalledWith(posts);
    expect(mockedRefreshProfilePictures.mock.invocationCallOrder[0]).toBeLessThan(
      mockedSerialize.mock.invocationCallOrder[0],
    );
  });

  it("passes mention map from buildMentionMapForPosts to serializeCommunityPost", async () => {
    const mentionMap = new Map([["u-x", { id: "u-x", name: "Xavier" }]]);
    mockedBuildMentionMap.mockResolvedValueOnce(mentionMap);
    mockedFindMany.mockResolvedValue(makePosts(2));

    await postsRoute.GET(
      getRequest("7"),
      { params: Promise.resolve({ id: "7" }) },
    );

    for (const call of mockedSerialize.mock.calls) {
      expect(call[2]).toBe(mentionMap);
    }
  });

  it("serializes each post in the page", async () => {
    mockedFindMany.mockResolvedValue(makePosts(3));

    const response = await postsRoute.GET(
      getRequest("7"),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(response.status).toBe(200);
    expect(mockedSerialize).toHaveBeenCalledTimes(3);
    const body = await response.json() as { posts: { id: string; serialized: boolean }[] };
    expect(body.posts.every(p => p.serialized)).toBe(true);
  });

  it("returns empty posts array when event has no posts", async () => {
    mockedFindMany.mockResolvedValue([]);

    const response = await postsRoute.GET(
      getRequest("7"),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json() as { posts: unknown[]; nextCursor: unknown };
    expect(body.posts).toHaveLength(0);
    expect(body.nextCursor).toBeNull();
  });

  it("filters posts by eventId", async () => {
    mockedFindMany.mockResolvedValue([]);

    await postsRoute.GET(
      getRequest("42"),
      { params: Promise.resolve({ id: "42" }) },
    );

    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ eventId: 42 }),
      }),
    );
  });
});
