import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
  registration: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma/prisma", () => ({
  default: prismaMock,
  prisma: prismaMock,
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

import * as registrationsRoute from "@/app/api/user/registrations/route";
import { getSession } from "@/lib/auth/session";

const mockedGetSession = getSession as unknown as ReturnType<typeof vi.fn>;

function getRequest(url: string) {
  return new NextRequest(url, { method: "GET" });
}

describe("App Router: /api/user/registrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires authentication", async () => {
    mockedGetSession.mockResolvedValue(null);

    const response = await registrationsRoute.GET(
      getRequest("http://localhost/api/user/registrations?userId=user-1"),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("forbids non-admin users from reading another user's registrations", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "user-1" } });
    prismaMock.user.findUnique.mockResolvedValue({ isAdmin: false });

    const response = await registrationsRoute.GET(
      getRequest("http://localhost/api/user/registrations?userId=user-2"),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    expect(prismaMock.registration.findMany).not.toHaveBeenCalled();
  });

  it("returns the signed-in user's registrations", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "user-1" } });
    prismaMock.registration.findMany.mockResolvedValue([
      {
        id: "reg-1",
        event: {
          id: 7,
          name: "Event",
          startDate: new Date("2026-08-01T00:00:00.000Z"),
          location: { city: "Berlin" },
        },
        payments: [],
      },
    ]);

    const response = await registrationsRoute.GET(
      getRequest("http://localhost/api/user/registrations?userId=user-1"),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.registrations).toHaveLength(1);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.registration.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      include: expect.any(Object),
      orderBy: { createdAt: "desc" },
    });
  });

  it("lets admins read another user's registrations", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "admin-1" } });
    prismaMock.user.findUnique.mockResolvedValue({ isAdmin: true });
    prismaMock.registration.findMany.mockResolvedValue([]);

    const response = await registrationsRoute.GET(
      getRequest("http://localhost/api/user/registrations?userId=user-2"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ registrations: [] });
    expect(prismaMock.registration.findMany).toHaveBeenCalledWith({
      where: { userId: "user-2" },
      include: expect.any(Object),
      orderBy: { createdAt: "desc" },
    });
  });
});
