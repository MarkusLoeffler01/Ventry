import { describe, it, expect, vi, beforeEach } from "vitest";
import { PostStatus, CommunityPostType } from "@/generated/prisma";

vi.mock("@/lib/prisma/prisma", () => ({
  prisma: {
    user: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/user/profilePicture", () => ({
  refreshSignedUrls: vi.fn(async pictures => pictures),
}));

import { prisma } from "@/lib/prisma/prisma";
import { refreshSignedUrls } from "@/lib/user/profilePicture";
import { buildMentionMapForPosts, refreshCommunityPostsProfilePictures, serializeCommunityPost } from "@/lib/community/server";
import type { CommunityPostWithInclude } from "@/lib/community/server";

type P = { user: { findMany: ReturnType<typeof vi.fn> } };
const p = prisma as unknown as P;
const mockedRefreshSignedUrls = refreshSignedUrls as unknown as ReturnType<typeof vi.fn>;

// ─── buildMentionMapForPosts ───────────────────────────────────────────────────

describe("buildMentionMapForPosts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty map when posts have no comments", async () => {
    const result = await buildMentionMapForPosts([]);
    expect(result.size).toBe(0);
    expect(p.user.findMany).not.toHaveBeenCalled();
  });

  it("returns empty map when all comments have no mentionedUserIds", async () => {
    const result = await buildMentionMapForPosts([{ comments: [{ mentionedUserIds: [] }] }]);
    expect(result.size).toBe(0);
    expect(p.user.findMany).not.toHaveBeenCalled();
  });

  it("fetches users for all mentionedUserIds across posts and returns map", async () => {
    p.user.findMany.mockResolvedValue([
      { id: "u1", name: "Alice" },
      { id: "u2", name: "Bob" },
    ]);

    const result = await buildMentionMapForPosts([
      { comments: [{ mentionedUserIds: ["u1"] }, { mentionedUserIds: ["u2"] }] },
      { comments: [{ mentionedUserIds: ["u1"] }] }, // duplicate u1
    ]);

    expect(result.size).toBe(2);
    expect(result.get("u1")).toEqual({ id: "u1", name: "Alice" });
    expect(result.get("u2")).toEqual({ id: "u2", name: "Bob" });
    // Deduplicates: only one DB call with unique IDs
    expect(p.user.findMany).toHaveBeenCalledTimes(1);
    expect(p.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: expect.arrayContaining(["u1", "u2"]) } } }),
    );
    // Passed array must not contain duplicates
    const call = p.user.findMany.mock.calls[0][0] as { where: { id: { in: string[] } } };
    expect(call.where.id.in).toHaveLength(2);
  });

  it("uses 'User' fallback name when DB returns null name", async () => {
    p.user.findMany.mockResolvedValue([{ id: "u1", name: null }]);

    const result = await buildMentionMapForPosts([{ comments: [{ mentionedUserIds: ["u1"] }] }]);
    expect(result.get("u1")).toEqual({ id: "u1", name: "User" });
  });
});

// ─── serializeCommunityPost mention pass-through ──────────────────────────────

function makePost(comments: { mentionedUserIds: string[] }[]): CommunityPostWithInclude {
  const base = {
    id: "post-1",
    eventId: 1,
    authorId: "author-1",
    type: CommunityPostType.TEXT,
    tags: [],
    content: "content",
    imageUrls: [],
    linkUrl: null,
    feedbackRating: null,
    feedbackType: null,
    feedbackEntries: [],
    muxAssetId: null,
    muxPlaybackId: null,
    status: PostStatus.APPROVED,
    pinned: false,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    deletedAt: null,
    author: {
      id: "author-1",
      name: "Post Author",
      image: null,
      profilePictures: [],
    },
    reactions: [],
    _count: { comments: comments.length },
    comments: comments.map((c, i) => ({
      id: `c-${i}`,
      postId: "post-1",
      authorId: "user-x",
      content: "reply",
      imageUrls: [],
      gifUrl: null,
      status: PostStatus.APPROVED,
      deletedAt: null,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      mentionedUserIds: c.mentionedUserIds,
      author: { id: "user-x", name: "Commenter", image: null, profilePictures: [] },
    })),
  };
  return base as unknown as CommunityPostWithInclude;
}

describe("serializeCommunityPost — mention pass-through to preloaded comments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes mentionedUsersById to preloaded comment serialization", () => {
    const mentionMap = new Map([["u-alice", { id: "u-alice", name: "Alice", username: "alice" }]]);
    const post = makePost([{ mentionedUserIds: ["u-alice"] }]);

    const result = serializeCommunityPost(post, null, mentionMap);

    expect(result.comments[0].mentionedUsers).toEqual([{ id: "u-alice", name: "Alice", username: "alice" }]);
  });

  it("returns empty mentionedUsers when no map provided", () => {
    const post = makePost([{ mentionedUserIds: ["u-alice"] }]);

    const result = serializeCommunityPost(post, null);

    expect(result.comments[0].mentionedUsers).toEqual([]);
  });

  it("skips mention IDs not present in the map", () => {
    const mentionMap = new Map([["u-alice", { id: "u-alice", name: "Alice", username: "alice" }]]);
    const post = makePost([{ mentionedUserIds: ["u-alice", "u-unknown"] }]);

    const result = serializeCommunityPost(post, null, mentionMap);

    expect(result.comments[0].mentionedUsers).toEqual([{ id: "u-alice", name: "Alice", username: "alice" }]);
  });

  it("includes commentCount from _count.comments", () => {
    const post = makePost([{ mentionedUserIds: [] }, { mentionedUserIds: [] }]);

    const result = serializeCommunityPost(post, null, new Map());

    expect(result.commentCount).toBe(2);
  });

  it("refreshes author and comment profile pictures before serialization", async () => {
    const post = makePost([{ mentionedUserIds: [] }]);
    const stalePicture = {
      id: "pic-1",
      signedUrl: "https://cdn.example.com/stale",
      storagePath: "users/author-1/profile.jpg",
      cachedUntil: new Date("2025-01-01"),
      isPrimary: true,
    };
    post.author.profilePictures = [stalePicture];
    post.comments[0].author.profilePictures = [stalePicture];
    mockedRefreshSignedUrls.mockResolvedValueOnce([
      {
        ...stalePicture,
        signedUrl: "https://cdn.example.com/refreshed",
        cachedUntil: new Date("2026-01-02"),
      },
    ]);

    await refreshCommunityPostsProfilePictures([post]);

    expect(mockedRefreshSignedUrls).toHaveBeenCalledWith([stalePicture]);
    expect(serializeCommunityPost(post, null).author.imageUrl).toBe("https://cdn.example.com/refreshed");
    expect(serializeCommunityPost(post, null).comments[0].author.imageUrl).toBe("https://cdn.example.com/refreshed");
  });
});
