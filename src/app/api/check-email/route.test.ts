import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import * as checkEmailRoute from "@/app/api/check-email/route";
import { prisma } from "@/lib/prisma/prisma";

const mockedFindUser = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/check-email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("App Router: /api/check-email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires an email string", async () => {
    const response = await checkEmailRoute.POST(postRequest({ email: null }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Email is required" });
    expect(mockedFindUser).not.toHaveBeenCalled();
  });

  it("normalizes email casing before lookup", async () => {
    mockedFindUser.mockResolvedValue({ id: "user-1" });

    const response = await checkEmailRoute.POST(postRequest({ email: "Test@Example.COM" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ exists: true });
    expect(mockedFindUser).toHaveBeenCalledWith({
      where: { email: "test@example.com" },
      select: { id: true },
    });
  });

  it("returns exists false when no matching user exists", async () => {
    mockedFindUser.mockResolvedValue(null);

    const response = await checkEmailRoute.POST(postRequest({ email: "new@example.com" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ exists: false });
  });
});
