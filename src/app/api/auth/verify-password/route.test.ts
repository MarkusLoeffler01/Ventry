import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma/prisma", () => ({
  prisma: {
    account: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/verify", () => ({
  verifyPassword: vi.fn(),
}));

import * as verifyPasswordRoute from "@/app/api/auth/verify-password/route";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/prisma";
import { verifyPassword } from "@/lib/auth/verify";

const mockedGetSession = getSession as unknown as ReturnType<typeof vi.fn>;
const mockedFindAccount = prisma.account.findFirst as unknown as ReturnType<typeof vi.fn>;
const mockedVerifyPassword = verifyPassword as unknown as ReturnType<typeof vi.fn>;

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/auth/verify-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("App Router: /api/auth/verify-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires an authenticated user", async () => {
    mockedGetSession.mockResolvedValue(null);

    const response = await verifyPasswordRoute.POST(postRequest({ password: "secret123" }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Not authenticated" });
  });

  it("requires a password in the request", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "user-1" } });

    const response = await verifyPasswordRoute.POST(postRequest({}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Password required" });
    expect(mockedFindAccount).not.toHaveBeenCalled();
  });

  it("rejects users without a credential password", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockedFindAccount.mockResolvedValue(null);

    const response = await verifyPasswordRoute.POST(postRequest({ password: "secret123" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "No password set" });
  });

  it("rejects an invalid password", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockedFindAccount.mockResolvedValue({ password: "hashed-password" });
    mockedVerifyPassword.mockResolvedValue(false);

    const response = await verifyPasswordRoute.POST(postRequest({ password: "wrong-password" }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Invalid password" });
  });

  it("returns success for a valid password", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockedFindAccount.mockResolvedValue({ password: "hashed-password" });
    mockedVerifyPassword.mockResolvedValue(true);

    const response = await verifyPasswordRoute.POST(postRequest({ password: "secret123" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, userId: "user-1" });
    expect(mockedVerifyPassword).toHaveBeenCalledWith({
      hash: "hashed-password",
      password: "secret123",
    });
  });
});
