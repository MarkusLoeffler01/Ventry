import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  notification: {
    updateMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma/prisma", () => ({ prisma: prismaMock }));

const getSessionMock = vi.fn();
vi.mock("@/lib/auth/session", () => ({ getSession: () => getSessionMock() }));

import { PATCH } from "./route";

const USER_ID = "user-1";

describe("PATCH /api/notifications/read-all", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({ user: { id: USER_ID } });
    prismaMock.notification.updateMany.mockResolvedValue({ count: 3 });
  });

  it("returns 401 without session", async () => {
    getSessionMock.mockResolvedValue(null);
    const res = await PATCH();
    expect(res.status).toBe(401);
  });

  it("marks all unread notifications as read for current user", async () => {
    const res = await PATCH();
    expect(res.status).toBe(200);

    const body = await res.json() as { updated: number };
    expect(body.updated).toBe(3);
    expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, read: false },
      data: { read: true },
    });
  });

  it("returns updated:0 when no unread notifications", async () => {
    prismaMock.notification.updateMany.mockResolvedValue({ count: 0 });
    const res = await PATCH();
    const body = await res.json() as { updated: number };
    expect(body.updated).toBe(0);
  });
});
