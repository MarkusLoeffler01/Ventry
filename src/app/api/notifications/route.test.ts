import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const prismaMock = vi.hoisted(() => ({
  notification: {
    findMany: vi.fn(),
    count: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma/prisma", () => ({ prisma: prismaMock }));

const getSessionMock = vi.fn();
vi.mock("@/lib/auth/session", () => ({ getSession: () => getSessionMock() }));

import { DELETE, GET } from "./route";

const USER_ID = "user-1";

function makeNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: "notif-1",
    userId: USER_ID,
    type: "COMMUNITY",
    title: "Your post was approved",
    body: null,
    link: "/events/7/community",
    read: false,
    createdAt: new Date("2026-06-01T12:00:00Z"),
    ...overrides,
  };
}

function req(url: string, method = "GET") {
  return new NextRequest(url, { method });
}

describe("GET /api/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({ user: { id: USER_ID } });
    prismaMock.notification.findMany.mockResolvedValue([]);
    prismaMock.notification.count.mockResolvedValue(0);
  });

  it("returns 401 without session", async () => {
    getSessionMock.mockResolvedValue(null);
    const res = await GET(req("http://localhost/api/notifications"));
    expect(res.status).toBe(401);
  });

  it("returns notifications with unreadCount", async () => {
    const notif = makeNotification();
    prismaMock.notification.findMany.mockResolvedValue([notif]);
    prismaMock.notification.count.mockResolvedValue(1);

    const res = await GET(req("http://localhost/api/notifications"));
    expect(res.status).toBe(200);

    const body = await res.json() as { notifications: unknown[]; unreadCount: number; nextCursor: string | null };
    expect(body.notifications).toHaveLength(1);
    expect(body.unreadCount).toBe(1);
    expect(body.nextCursor).toBeNull();
  });

  it("sets nextCursor when more items exist", async () => {
    const items = Array.from({ length: 6 }, (_, i) =>
      makeNotification({ id: `n-${i}` }),
    );
    prismaMock.notification.findMany.mockResolvedValue(items);
    prismaMock.notification.count.mockResolvedValue(5);

    const res = await GET(req("http://localhost/api/notifications?limit=5"));
    const body = await res.json() as { notifications: unknown[]; nextCursor: string | null };

    expect(body.notifications).toHaveLength(5);
    expect(body.nextCursor).toBe("n-4");
  });

  it("filters by type when type param is provided", async () => {
    prismaMock.notification.findMany.mockResolvedValue([]);
    prismaMock.notification.count.mockResolvedValue(0);

    await GET(req("http://localhost/api/notifications?type=COMMENT"));

    expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: "COMMENT" }),
      }),
    );
  });

  it("ignores invalid type param", async () => {
    prismaMock.notification.findMany.mockResolvedValue([]);
    prismaMock.notification.count.mockResolvedValue(0);

    await GET(req("http://localhost/api/notifications?type=INVALID"));

    expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: USER_ID }),
      }),
    );
    const call = prismaMock.notification.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(call.where.type).toBeUndefined();
  });

  it("unreadCount badge reflects only unread notifications", async () => {
    const read = makeNotification({ id: "n-read", read: true });
    const unread = makeNotification({ id: "n-unread", read: false });
    prismaMock.notification.findMany.mockResolvedValue([read, unread]);
    prismaMock.notification.count.mockResolvedValue(1);

    const res = await GET(req("http://localhost/api/notifications"));
    const body = await res.json() as { unreadCount: number };
    expect(body.unreadCount).toBe(1);
  });
});

describe("DELETE /api/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({ user: { id: USER_ID } });
    prismaMock.notification.deleteMany.mockResolvedValue({ count: 4 });
  });

  it("returns 401 without session", async () => {
    getSessionMock.mockResolvedValue(null);
    const res = await DELETE();
    expect(res.status).toBe(401);
  });

  it("deletes all notifications for current user", async () => {
    const res = await DELETE();
    expect(res.status).toBe(200);

    const body = await res.json() as { deleted: number };
    expect(body.deleted).toBe(4);
    expect(prismaMock.notification.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
    });
  });
});
