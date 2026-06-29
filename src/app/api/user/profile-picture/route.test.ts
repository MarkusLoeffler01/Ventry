import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("sharp", () => ({
  default: vi.fn(() => {
    const pipeline = {
      toFormat: vi.fn(() => pipeline),
      toBuffer: vi.fn().mockResolvedValue(Buffer.from("processed-image")),
    };

    return pipeline;
  }),
}));

vi.mock("@/lib/helpers/user", () => ({
  getUserIdFromRequest: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  uploadProfilePicture: vi.fn(),
  getSignedUrl: vi.fn(),
}));

vi.mock("@/lib/user/profilePicture", () => ({
  add: vi.fn(),
  refreshSignedUrls: vi.fn(),
  remove: vi.fn(),
  setPrimary: vi.fn(),
}));

vi.mock("@/lib/prisma/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    profilePicture: {
      update: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import * as profilePictureRoute from "@/app/api/user/profile-picture/route";
import { getUserIdFromRequest } from "@/lib/helpers/user";
import { prisma } from "@/lib/prisma/prisma";
import { getSignedUrl, uploadProfilePicture } from "@/lib/supabase";
import { add, refreshSignedUrls, remove, setPrimary } from "@/lib/user/profilePicture";

const mockedGetUserIdFromRequest = getUserIdFromRequest as unknown as ReturnType<typeof vi.fn>;
const mockedFindUser = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockedFindPicture = prisma.profilePicture.findFirst as unknown as ReturnType<typeof vi.fn>;
const mockedFindPictureById = prisma.profilePicture.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockedUploadProfilePicture = uploadProfilePicture as unknown as ReturnType<typeof vi.fn>;
const mockedGetSignedUrl = getSignedUrl as unknown as ReturnType<typeof vi.fn>;
const mockedAddPicture = add as unknown as ReturnType<typeof vi.fn>;
const mockedRefreshSignedUrls = refreshSignedUrls as unknown as ReturnType<typeof vi.fn>;
const mockedRemovePicture = remove as unknown as ReturnType<typeof vi.fn>;
const mockedSetPrimary = setPrimary as unknown as ReturnType<typeof vi.fn>;

describe("App Router: /api/user/profile-picture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRefreshSignedUrls.mockImplementation(async pictures => pictures);
  });

  describe("GET", () => {
    it("returns 400 when userId is missing", async () => {
      const response = await profilePictureRoute.GET(
        new NextRequest("http://localhost/api/user/profile-picture"),
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Missing userId parameter" });
    });

    it("refreshes expired signed URLs before returning pictures", async () => {
      const profilePictures = [
        {
          id: "pic-stale",
          storagePath: "users/user-1/stale.jpg",
          signedUrl: "https://old.example.com/stale",
          cachedUntil: new Date("2026-04-01T10:00:00.000Z"),
          isPrimary: true,
          order: 0,
          createdAt: new Date("2026-03-31T10:00:00.000Z"),
        },
        {
          id: "pic-fresh",
          storagePath: "users/user-1/fresh.jpg",
          signedUrl: "https://cdn.example.com/fresh",
          cachedUntil: new Date("2099-04-01T10:00:00.000Z"),
          isPrimary: false,
          order: 1,
          createdAt: new Date("2026-03-30T10:00:00.000Z"),
        },
      ];
      const refreshedProfilePictures = [
        {
          ...profilePictures[0],
          signedUrl: "https://cdn.example.com/stale-refreshed",
          cachedUntil: new Date("2026-04-01T11:00:00.000Z"),
        },
        profilePictures[1],
      ];

      mockedFindUser.mockResolvedValue({
        profilePictures,
      });
      mockedRefreshSignedUrls.mockResolvedValue(refreshedProfilePictures);

      const response = await profilePictureRoute.GET(
        new NextRequest("http://localhost/api/user/profile-picture?userId=user-1"),
      );

      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload.profilePictures).toHaveLength(2);
      expect(payload.profilePictures[0].signedUrl).toBe("https://cdn.example.com/stale-refreshed");
      expect(mockedRefreshSignedUrls).toHaveBeenCalledWith(profilePictures);
    });
  });

  describe("POST", () => {
    it("returns 401 when uploading without a session", async () => {
      mockedGetUserIdFromRequest.mockResolvedValue(null);

      const response = await profilePictureRoute.POST(
        new NextRequest("http://localhost/api/user/profile-picture", {
          method: "POST",
          body: new FormData(),
        }),
      );

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    });

    it("uploads a processed image and marks it primary when requested", async () => {
      mockedGetUserIdFromRequest.mockResolvedValue("user-1");
      mockedUploadProfilePicture.mockResolvedValue({ path: "users/user-1/profile-new.jpg" });
      mockedGetSignedUrl.mockResolvedValue({
        signedUrl: "https://cdn.example.com/profile-new",
        expiresIn: 86400,
      });
      mockedFindPicture.mockResolvedValue({
        id: "pic-new",
        userID: "user-1",
        storagePath: "users/user-1/profile-new.jpg",
      });

      const mockFile = {
        arrayBuffer: vi.fn().mockResolvedValue(Buffer.from("raw-image")),
      } as unknown as File;

      const request = {
        formData: vi.fn().mockResolvedValue({
          get: vi.fn((key: string) => {
            if (key === "file") {
              return mockFile;
            }

            if (key === "isPrimary") {
              return "true";
            }

            return null;
          }),
        }),
      } as unknown as NextRequest;

      const response = await profilePictureRoute.POST(request);

      expect(response.status).toBe(200);
      expect(mockedUploadProfilePicture).toHaveBeenCalledWith(
        expect.any(Buffer),
        "user-1",
        expect.stringMatching(/^profile-.*\.jpg$/),
      );
      expect(mockedAddPicture).toHaveBeenCalledWith({
        userId: "user-1",
        path: "users/user-1/profile-new.jpg",
        signedUrl: "https://cdn.example.com/profile-new",
        expiresIn: 86400,
      });
      expect(mockedSetPrimary).toHaveBeenCalledWith({
        userId: "user-1",
        id: "pic-new",
        path: "users/user-1/profile-new.jpg",
      });
    });
  });

  describe("PATCH", () => {
    it("returns 404 when the picture does not belong to the current user", async () => {
      mockedGetUserIdFromRequest.mockResolvedValue("user-1");
      mockedFindPictureById.mockResolvedValue({
        id: "pic-1",
        userID: "user-2",
        storagePath: "users/user-2/pic-1.jpg",
      });

      const response = await profilePictureRoute.PATCH(
        new NextRequest("http://localhost/api/user/profile-picture", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ profilePictureId: "pic-1" }),
        }),
      );

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Profile picture not found" });
    });

    it("sets the selected picture as primary", async () => {
      mockedGetUserIdFromRequest.mockResolvedValue("user-1");
      mockedFindPictureById.mockResolvedValue({
        id: "pic-1",
        userID: "user-1",
        storagePath: "users/user-1/pic-1.jpg",
      });

      const response = await profilePictureRoute.PATCH(
        new NextRequest("http://localhost/api/user/profile-picture", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ profilePictureId: "pic-1" }),
        }),
      );

      expect(response.status).toBe(200);
      expect(mockedSetPrimary).toHaveBeenCalledWith({
        userId: "user-1",
        id: "pic-1",
        path: "users/user-1/pic-1.jpg",
      });
    });
  });

  describe("DELETE", () => {
    it("removes the selected profile picture", async () => {
      mockedGetUserIdFromRequest.mockResolvedValue("user-1");

      const response = await profilePictureRoute.DELETE(
        new NextRequest(
          "http://localhost/api/user/profile-picture?profilePictureId=pic-1",
          { method: "DELETE" },
        ),
      );

      expect(response.status).toBe(200);
      expect(mockedRemovePicture).toHaveBeenCalledWith({
        userId: "user-1",
        id: "pic-1",
      });
    });
  });
});
