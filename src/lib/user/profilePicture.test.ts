import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma/prisma", () => ({
    prisma: {
        profilePicture: {
            update: vi.fn(),
        },
    },
}));

vi.mock("@/lib/supabase", () => ({
    getSignedUrl: vi.fn(),
}));

import { prisma } from "@/lib/prisma/prisma";
import { getSignedUrl } from "@/lib/supabase";
import { refreshSignedUrls } from "./profilePicture";

const mockedGetSignedUrl = getSignedUrl as unknown as ReturnType<typeof vi.fn>;
const mockedUpdatePicture = prisma.profilePicture.update as unknown as ReturnType<typeof vi.fn>;

describe("refreshSignedUrls", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("refreshes missing and expired signed URLs", async () => {
        mockedGetSignedUrl.mockResolvedValue({
            signedUrl: "https://cdn.example.com/refreshed",
            expiresIn: 3600,
        });

        const result = await refreshSignedUrls([
            {
                id: "pic-expired",
                storagePath: "users/user-1/expired.jpg",
                signedUrl: "https://cdn.example.com/expired",
                cachedUntil: new Date("2026-04-01T10:00:00.000Z"),
            },
            {
                id: "pic-fresh",
                storagePath: "users/user-1/fresh.jpg",
                signedUrl: "https://cdn.example.com/fresh",
                cachedUntil: new Date("2099-04-01T10:00:00.000Z"),
            },
        ]);

        expect(result[0]?.signedUrl).toBe("https://cdn.example.com/refreshed");
        expect(result[1]?.signedUrl).toBe("https://cdn.example.com/fresh");
        expect(mockedGetSignedUrl).toHaveBeenCalledTimes(1);
        expect(mockedGetSignedUrl).toHaveBeenCalledWith("users/user-1/expired.jpg", 24 * 60 * 60);
        expect(mockedUpdatePicture).toHaveBeenCalledWith({
            where: { id: "pic-expired" },
            data: {
                signedUrl: "https://cdn.example.com/refreshed",
                cachedUntil: expect.any(Date),
            },
        });
    });
});
