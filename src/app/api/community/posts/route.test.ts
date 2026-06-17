import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    event: {
      findUnique: vi.fn(),
    },
    registration: {
      findFirst: vi.fn(),
    },
    communityPost: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

import * as postsRoute from "./route";
import { prisma } from "@/lib/prisma/prisma";
import { getSession } from "@/lib/auth/session";

const mockedGetSession = getSession as unknown as ReturnType<typeof vi.fn>;
const mockedFindUser = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockedFindEvent = prisma.event.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockedFindRegistration = prisma.registration.findFirst as unknown as ReturnType<typeof vi.fn>;
const mockedFindPosts = prisma.communityPost.findMany as unknown as ReturnType<typeof vi.fn>;
const mockedCreatePost = prisma.communityPost.create as unknown as ReturnType<typeof vi.fn>;

function getRequest(url: string) {
  return new NextRequest(url, { method: "GET" });
}

function postRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function communityEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    ownerId: "admin-owner",
    endDate: new Date("2026-07-01T10:00:00.000Z"),
    communityEnabled: true,
    communityOpenAfterEnd: true,
    communityModerated: true,
    communityAttendeesOnly: true,
    ...overrides,
  };
}

function includedPost(overrides: Record<string, unknown> = {}) {
  return {
    id: "post-1",
    eventId: 7,
    authorId: "user-1",
    type: "TEXT",
    tags: ["text"],
    content: "Hello community",
    imageUrls: [],
    linkUrl: null,
    feedbackRating: null,
    feedbackType: null,
    feedbackEntries: [],
    status: "APPROVED",
    pinned: false,
    createdAt: new Date("2026-06-15T12:00:00.000Z"),
    updatedAt: new Date("2026-06-15T12:00:00.000Z"),
    author: {
      id: "user-1",
      name: "Jamie",
      image: null,
      profilePictures: [],
    },
    reactions: [
      { userId: "user-1", reaction: "LIKE" },
      { userId: "user-2", reaction: "LOVE" },
    ],
    ...overrides,
  };
}

describe("App Router: /api/community/posts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFindEvent.mockResolvedValue(communityEvent());
    mockedFindUser.mockResolvedValue({
      id: "user-1",
      isAdmin: false,
      adminProfile: null,
    });
  });

  describe("GET", () => {
    it("lists approved community posts with reaction counts", async () => {
      mockedGetSession.mockResolvedValue({ user: { id: "user-1" } });
      mockedFindPosts.mockResolvedValue([includedPost()]);

      const response = await postsRoute.GET(
        getRequest("http://localhost/api/community/posts?eventId=7&limit=20"),
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        posts: [
          expect.objectContaining({
            id: "post-1",
            tags: ["text"],
            author: {
              id: "user-1",
              name: "Jamie",
              imageUrl: null,
            },
            reactions: {
              LIKE: 1,
              LOVE: 1,
              CELEBRATE: 0,
              HELPFUL: 0,
            },
            viewerReactions: ["LIKE"],
          }),
        ],
        nextCursor: null,
      });
      expect(mockedFindPosts).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            eventId: 7,
            status: "APPROVED",
          },
        }),
      );
    });

    it("returns 403 when community is disabled", async () => {
      mockedGetSession.mockResolvedValue(null);
      mockedFindEvent.mockResolvedValue(communityEvent({ communityEnabled: false }));

      const response = await postsRoute.GET(
        getRequest("http://localhost/api/community/posts?eventId=7"),
      );

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "Community is disabled for this event" });
    });
  });

  describe("POST", () => {
    it("returns 401 when the user is not signed in", async () => {
      mockedGetSession.mockResolvedValue(null);

      const response = await postsRoute.POST(
        postRequest("http://localhost/api/community/posts", {
          eventId: 7,
          type: "TEXT",
          content: "Hello",
        }),
      );

      expect(response.status).toBe(401);
      expect(mockedCreatePost).not.toHaveBeenCalled();
    });

    it("blocks non-attendees when attendee-only mode is enabled", async () => {
      mockedGetSession.mockResolvedValue({ user: { id: "user-1" } });
      mockedFindRegistration.mockResolvedValue(null);

      const response = await postsRoute.POST(
        postRequest("http://localhost/api/community/posts", {
          eventId: 7,
          type: "TEXT",
          content: "Hello",
        }),
      );

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        error: "Only attendees can post in this event community",
      });
      expect(mockedCreatePost).not.toHaveBeenCalled();
    });

    it("creates pending posts when moderation is enabled", async () => {
      mockedGetSession.mockResolvedValue({ user: { id: "user-1" } });
      mockedFindRegistration.mockResolvedValue({ id: "reg-1" });
      mockedCreatePost.mockResolvedValue(includedPost({ status: "PENDING" }));

      const response = await postsRoute.POST(
        postRequest("http://localhost/api/community/posts", {
          eventId: 7,
          type: "TEXT",
          content: "Hello community",
        }),
      );

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({
        post: expect.objectContaining({
          id: "post-1",
          status: "PENDING",
        }),
        pending: true,
      });
      expect(mockedCreatePost).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventId: 7,
            authorId: "user-1",
            tags: ["text"],
            status: "PENDING",
          }),
        }),
      );
    });

    it("creates feedback posts with a typed feedback category and derived tags", async () => {
      mockedGetSession.mockResolvedValue({ user: { id: "user-1" } });
      mockedFindRegistration.mockResolvedValue({ id: "reg-1" });
      mockedCreatePost.mockResolvedValue(includedPost({
        type: "FEEDBACK",
        tags: ["feedback", "feedback:venue", "rating"],
        content: "The room setup worked well.",
        feedbackRating: 4,
        feedbackType: "VENUE",
        status: "APPROVED",
      }));
      mockedFindEvent.mockResolvedValue(communityEvent({ communityModerated: false }));

      const response = await postsRoute.POST(
        postRequest("http://localhost/api/community/posts", {
          eventId: 7,
          type: "FEEDBACK",
          content: "The room setup worked well.",
          feedbackRating: 4,
          feedbackType: "VENUE",
        }),
      );

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({
        post: expect.objectContaining({
          type: "FEEDBACK",
          tags: ["feedback", "feedback:venue", "rating"],
          feedbackRating: 4,
          feedbackType: "VENUE",
        }),
        pending: false,
      });
      expect(mockedCreatePost).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            feedbackRating: 4,
            feedbackType: "VENUE",
            feedbackEntries: [
              expect.objectContaining({
                feedbackType: "VENUE",
                feedbackRating: 4,
              }),
            ],
            tags: ["feedback", "feedback:venue", "rating"],
          }),
        }),
      );
    });

    it("appends multiple feedback items to the same post payload", async () => {
      mockedGetSession.mockResolvedValue({ user: { id: "user-1" } });
      mockedFindRegistration.mockResolvedValue({ id: "reg-1" });
      mockedCreatePost.mockResolvedValue(includedPost({
        type: "IMAGE",
        imageUrls: ["https://cdn.example.com/post.jpg"],
        feedbackEntries: [
          {
            content: "Great venue setup.",
            feedbackRating: 5,
            feedbackType: "VENUE",
          },
          {
            content: "The schedule was easy to follow.",
            feedbackRating: 4,
            feedbackType: "EVENTS",
          },
        ],
        tags: ["feedback", "feedback:venue", "feedback:events", "image", "media", "rating"],
        status: "APPROVED",
      }));
      mockedFindEvent.mockResolvedValue(communityEvent({ communityModerated: false }));

      const response = await postsRoute.POST(
        postRequest("http://localhost/api/community/posts", {
          eventId: 7,
          type: "IMAGE",
          content: "Conference recap",
          imageUrls: ["https://cdn.example.com/post.jpg"],
          feedbacks: [
            {
              content: "Great venue setup.",
              feedbackRating: 5,
              feedbackType: "VENUE",
            },
            {
              content: "The schedule was easy to follow.",
              feedbackRating: 4,
              feedbackType: "EVENTS",
            },
          ],
        }),
      );

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({
        post: expect.objectContaining({
          type: "IMAGE",
          imageUrls: ["https://cdn.example.com/post.jpg"],
          feedbacks: [
            expect.objectContaining({
              feedbackType: "VENUE",
              rating: 5,
            }),
            expect.objectContaining({
              feedbackType: "EVENTS",
              rating: 4,
            }),
          ],
        }),
        pending: false,
      });
      expect(mockedCreatePost).toHaveBeenCalledTimes(1);
      expect(mockedCreatePost).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "IMAGE",
            content: "Conference recap",
            imageUrls: ["https://cdn.example.com/post.jpg"],
            feedbackEntries: [
              expect.objectContaining({
                feedbackType: "VENUE",
                feedbackRating: 5,
              }),
              expect.objectContaining({
                feedbackType: "EVENTS",
                feedbackRating: 4,
              }),
            ],
            tags: ["feedback", "feedback:events", "feedback:venue", "image", "media", "rating"],
          }),
        }),
      );
    });

    it("lets event owners bypass attendee-only mode", async () => {
      mockedGetSession.mockResolvedValue({ user: { id: "owner-user" } });
      mockedFindUser.mockResolvedValue({
        id: "owner-user",
        isAdmin: false,
        adminProfile: { id: "admin-owner" },
      });
      mockedCreatePost.mockResolvedValue(includedPost({
        authorId: "owner-user",
        status: "APPROVED",
      }));
      mockedFindEvent.mockResolvedValue(communityEvent({ communityModerated: false }));

      const response = await postsRoute.POST(
        postRequest("http://localhost/api/community/posts", {
          eventId: 7,
          type: "TEXT",
          content: "Organizer update",
        }),
      );

      expect(response.status).toBe(201);
      expect(mockedFindRegistration).not.toHaveBeenCalled();
      expect(mockedCreatePost).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            authorId: "owner-user",
            tags: ["text"],
            status: "APPROVED",
          }),
        }),
      );
    });
  });
});
