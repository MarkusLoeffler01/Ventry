import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  account: {
    update: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/lib/prisma/prisma", () => ({
  default: prismaMock,
  prisma: prismaMock,
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/bcrypt", () => ({
  hashPassword: vi.fn(),
}));

import * as userRoute from "@/app/api/user/route";
import { getSession } from "@/lib/auth/session";

const mockedGetSession = getSession as unknown as ReturnType<typeof vi.fn>;

function patchRequest(body: unknown, headers: Record<string, string> = { "content-type": "application/json" }) {
  return new NextRequest("http://localhost/api/user", {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
}

describe("App Router: /api/user PATCH", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires authentication", async () => {
    mockedGetSession.mockResolvedValue(null);

    const response = await userRoute.PATCH(patchRequest({ id: "user-1", name: "User" }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("requires JSON content", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "user-1" } });

    const response = await userRoute.PATCH(
      patchRequest({ id: "user-1", name: "User" }, { "content-type": "text/plain" }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid content type" });
  });

  it("prevents users from updating another profile", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "user-1" } });

    const response = await userRoute.PATCH(patchRequest({ id: "user-2", name: "Other User" }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Forbidden - You can only update your own profile",
    });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("allows clearing optional country fields", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "user-1" } });
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      accounts: [],
    });
    prismaMock.user.update.mockImplementation(({ data }) => ({
      id: "user-1",
      ...data,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    }));

    const response = await userRoute.PATCH(
      patchRequest({
        id: "user-1",
        name: "Valid Name",
        country: null,
        addressCountry: null,
      }),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toMatchObject({
      id: "user-1",
      country: null,
      addressCountry: null,
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({
          country: null,
          addressCountry: null,
        }),
      }),
    );
  });

  it("returns validation errors for invalid profile fields", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "user-1" } });

    const response = await userRoute.PATCH(
      patchRequest({
        id: "user-1",
        country: 123,
      }),
    );

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error.properties.country.errors).toContain("Invalid input: expected string, received number");
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });
});
