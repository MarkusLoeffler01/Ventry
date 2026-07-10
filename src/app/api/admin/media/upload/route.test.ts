import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const sharpMocks = vi.hoisted(() => ({
  sharp: vi.fn(),
  toBuffer: vi.fn(),
}));

vi.mock("sharp", () => ({
  default: sharpMocks.sharp,
}));

vi.mock("@/lib/auth/admin", () => ({
  checkAdminAuth: vi.fn(),
  forbiddenResponse: vi.fn((error?: string) =>
    new Response(JSON.stringify({ error: error ?? "Forbidden" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    }),
  ),
}));

vi.mock("@/lib/supabase", () => ({
  uploadEventImage: vi.fn(),
  getSignedUrl: vi.fn(),
}));

function installSharpMock() {
  sharpMocks.sharp.mockImplementation(() => {
    const pipeline = {
      rotate: vi.fn(() => pipeline),
      resize: vi.fn(() => pipeline),
      jpeg: vi.fn(() => pipeline),
      toBuffer: sharpMocks.toBuffer,
    };

    return pipeline;
  });
}

import * as mediaRoute from "@/app/api/admin/media/upload/route";
import { checkAdminAuth } from "@/lib/auth/admin";
import { getSignedUrl, uploadEventImage } from "@/lib/supabase";

const mockedCheckAdminAuth = checkAdminAuth as unknown as ReturnType<typeof vi.fn>;
const mockedUploadEventImage = uploadEventImage as unknown as ReturnType<typeof vi.fn>;
const mockedGetSignedUrl = getSignedUrl as unknown as ReturnType<typeof vi.fn>;

describe("App Router: /api/admin/media/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sharpMocks.toBuffer.mockResolvedValue(Buffer.from("optimized-banner"));
    installSharpMock();
    mockedCheckAdminAuth.mockResolvedValue({ authorized: true, adminId: "admin-1" });
    mockedUploadEventImage.mockResolvedValue({ path: "events/event-new.jpg" });
    mockedGetSignedUrl.mockResolvedValue({
      signedUrl: "https://cdn.example.com/event-new",
      expiresIn: 365 * 24 * 60 * 60,
    });
  });

  it("uploads event banners to the banners bucket and signs from that bucket", async () => {
    const mockFile = {
      size: 1024,
      arrayBuffer: vi.fn().mockResolvedValue(Buffer.from("raw-banner")),
    } as unknown as File;

    const request = {
      headers: new Headers(),
      formData: vi.fn().mockResolvedValue({
        get: vi.fn((key: string) => {
          if (key === "file") return mockFile;
          if (key === "mode") return "banner";
          return null;
        }),
      }),
    } as unknown as NextRequest;

    const response = await mediaRoute.POST(request);

    expect(response.status).toBe(200);
    expect(mockedUploadEventImage).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.stringMatching(/^event-.*\.jpg$/),
      "banners",
    );
    expect(mockedGetSignedUrl).toHaveBeenCalledWith(
      "events/event-new.jpg",
      365 * 24 * 60 * 60,
      "banners",
    );
  });

  it("keeps badge photos in the profile bucket", async () => {
    const mockFile = {
      size: 1024,
      arrayBuffer: vi.fn().mockResolvedValue(Buffer.from("raw-photo")),
    } as unknown as File;

    const request = {
      headers: new Headers(),
      formData: vi.fn().mockResolvedValue({
        get: vi.fn((key: string) => {
          if (key === "file") return mockFile;
          if (key === "mode") return "badge-photo";
          return null;
        }),
      }),
    } as unknown as NextRequest;

    const response = await mediaRoute.POST(request);

    expect(response.status).toBe(200);
    expect(mockedUploadEventImage).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.stringMatching(/^badge-photo-.*\.jpg$/),
      "profile",
    );
  });
});
