import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const prismaMock = vi.hoisted(() => ({
  notification: {
    findFirst: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/prisma/prisma", () => ({ prisma: prismaMock }));

const getSessionMock = vi.fn();
vi.mock("@/lib/auth/session", () => ({ getSession: () => getSessionMock() }));

import { DELETE } from "./route";

const USER_ID = "user-1";
const NOTIF_ID = "notif-abc";
const PARAMS = { params: Promise.resolve({ id: NOTIF_ID }) };

function req() {
  return new NextRequest(`http://localhost/api/notifications/${NOTIF_ID}`, {
    method: "DELETE",
  });
}

describe("DELETE /api/notifications/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({ user: { id: USER_ID } });
    prismaMock.notification.findFirst.mockResolvedValue({ id: NOTIF_ID });
    prismaMock.notification.delete.mockResolvedValue({});
  });

  it("returns 401 without session", async () => {
    getSessionMock.mockResolvedValue(null);
    const res = await DELETE(req(), PARAMS);
    expect(res.status).toBe(401);
  });

  it("returns 404 when notification does not belong to user", async () => {
    prismaMock.notification.findFirst.mockResolvedValue(null);
    const res = await DELETE(req(), PARAMS);
    expect(res.status).toBe(404);
  });

  it("deletes notification and returns deleted:true", async () => {
    const res = await DELETE(req(), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json() as { deleted: boolean };
    expect(body.deleted).toBe(true);
    expect(prismaMock.notification.delete).toHaveBeenCalledWith({ where: { id: NOTIF_ID } });
  });

  it("only deletes own notification (findFirst scopes by userId)", async () => {
    await DELETE(req(), PARAMS);
    expect(prismaMock.notification.findFirst).toHaveBeenCalledWith({
      where: { id: NOTIF_ID, userId: USER_ID },
      select: { id: true },
    });
  });
});
