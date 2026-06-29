import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const prismaMock = vi.hoisted(() => ({
  notification: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/prisma/prisma", () => ({ prisma: prismaMock }));

const getSessionMock = vi.fn();
vi.mock("@/lib/auth/session", () => ({ getSession: () => getSessionMock() }));

import { PATCH } from "./route";

const USER_ID = "user-1";
const NOTIF_ID = "notif-abc";
const PARAMS = { params: Promise.resolve({ id: NOTIF_ID }) };

function req() {
  return new NextRequest(`http://localhost/api/notifications/${NOTIF_ID}/read`, {
    method: "PATCH",
  });
}

describe("PATCH /api/notifications/[id]/read", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({ user: { id: USER_ID } });
    prismaMock.notification.findFirst.mockResolvedValue({ id: NOTIF_ID });
    prismaMock.notification.update.mockResolvedValue({
      id: NOTIF_ID,
      read: true,
    });
  });

  it("returns 401 without session", async () => {
    getSessionMock.mockResolvedValue(null);
    const res = await PATCH(req(), PARAMS);
    expect(res.status).toBe(401);
  });

  it("returns 404 when notification does not belong to user", async () => {
    prismaMock.notification.findFirst.mockResolvedValue(null);
    const res = await PATCH(req(), PARAMS);
    expect(res.status).toBe(404);
  });

  it("marks notification as read and returns it", async () => {
    const res = await PATCH(req(), PARAMS);
    expect(res.status).toBe(200);

    const body = await res.json() as { notification: { id: string; read: boolean } };
    expect(body.notification.read).toBe(true);
    expect(prismaMock.notification.update).toHaveBeenCalledWith({
      where: { id: NOTIF_ID },
      data: { read: true },
    });
  });

  it("scopes ownership check to current user", async () => {
    await PATCH(req(), PARAMS);
    expect(prismaMock.notification.findFirst).toHaveBeenCalledWith({
      where: { id: NOTIF_ID, userId: USER_ID },
      select: { id: true },
    });
  });
});
