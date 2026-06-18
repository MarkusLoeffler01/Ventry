import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const prismaMock = vi.hoisted(() => ({
  postModerationLog: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/auth/event-admin", () => ({
  checkEventAdminAuth: vi.fn(),
}));

import * as logsRoute from "./route";
import { checkEventAdminAuth } from "@/lib/auth/event-admin";

const mockedCheckEventAdminAuth = checkEventAdminAuth as unknown as ReturnType<typeof vi.fn>;
const mockedFindMany = prismaMock.postModerationLog.findMany as unknown as ReturnType<typeof vi.fn>;

function getRequest(eventId: string, query: Record<string, string> = {}) {
  const url = new URL(`http://localhost/api/admin/event/${eventId}/community/logs`);
  for (const [k, v] of Object.entries(query)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString());
}

function authorizedAdmin() {
  return {
    authorized: true,
    adminId: "admin-1",
    user: { id: "user-admin", email: "admin@example.com" },
  };
}

function makeLog(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    postId: `post-for-${id}`,
    action: "APPROVED",
    reason: null,
    createdAt: new Date("2026-06-18T12:00:00.000Z"),
    post: { id: `post-for-${id}`, type: "TEXT", content: "hello", status: "APPROVED" },
    actorUser: { id: "user-admin", name: "Admin User", email: "admin@example.com" },
    ...overrides,
  };
}

describe("GET /api/admin/event/[id]/community/logs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCheckEventAdminAuth.mockResolvedValue(authorizedAdmin());
    mockedFindMany.mockResolvedValue([makeLog("log-1"), makeLog("log-2")]);
  });

  it("returns 400 for non-numeric event ID", async () => {
    const response = await logsRoute.GET(
      getRequest("not-a-number"),
      { params: Promise.resolve({ id: "not-a-number" }) },
    );

    expect(response.status).toBe(400);
    const body = await response.json() as { error: string };
    expect(body.error).toBe("Invalid event ID");
    expect(mockedCheckEventAdminAuth).not.toHaveBeenCalled();
  });

  it("returns 403 when caller is not event admin", async () => {
    mockedCheckEventAdminAuth.mockResolvedValue({ authorized: false, error: "Forbidden" });

    const response = await logsRoute.GET(
      getRequest("7"),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(response.status).toBe(403);
    expect(mockedFindMany).not.toHaveBeenCalled();
  });

  it("returns log list with actor info and no nextCursor when under limit", async () => {
    mockedFindMany.mockResolvedValue([makeLog("log-1"), makeLog("log-2")]);

    const response = await logsRoute.GET(
      getRequest("7"),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json() as {
      logs: Array<{ id: string; actor: { id: string; name: string; email: string } | null }>;
      nextCursor: unknown;
    };
    expect(body.logs).toHaveLength(2);
    expect(body.nextCursor).toBeNull();

    const first = body.logs[0];
    expect(first?.id).toBe("log-1");
    expect(first?.actor).toEqual({
      id: "user-admin",
      name: "Admin User",
      email: "admin@example.com",
    });
  });

  it("serializes createdAt as ISO string", async () => {
    mockedFindMany.mockResolvedValue([makeLog("log-1")]);

    const response = await logsRoute.GET(
      getRequest("7"),
      { params: Promise.resolve({ id: "7" }) },
    );

    const body = await response.json() as { logs: Array<{ createdAt: string }> };
    expect(body.logs[0]?.createdAt).toBe("2026-06-18T12:00:00.000Z");
  });

  it("sets actor to null when no actorUser linked", async () => {
    mockedFindMany.mockResolvedValue([makeLog("log-1", { actorUser: null })]);

    const response = await logsRoute.GET(
      getRequest("7"),
      { params: Promise.resolve({ id: "7" }) },
    );

    const body = await response.json() as { logs: Array<{ actor: unknown }> };
    expect(body.logs[0]?.actor).toBeNull();
  });

  it("paginates: returns nextCursor when more logs exist", async () => {
    mockedFindMany.mockResolvedValue(
      Array.from({ length: 51 }, (_, i) => makeLog(`log-${i}`)),
    );

    const response = await logsRoute.GET(
      getRequest("7", { limit: "50" }),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json() as { logs: unknown[]; nextCursor: string };
    expect(body.logs).toHaveLength(50);
    expect(body.nextCursor).toBe("log-49");
  });

  it("passes cursor to findMany when cursor param provided", async () => {
    await logsRoute.GET(
      getRequest("7", { cursor: "log-50" }),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: "log-50" },
        skip: 1,
      }),
    );
  });

  it("clamps limit to 100 even if caller requests more", async () => {
    mockedFindMany.mockResolvedValue([makeLog("log-1")]);

    await logsRoute.GET(
      getRequest("7", { limit: "999" }),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 101,
      }),
    );
  });

  it("defaults limit to 50 for NaN limit param", async () => {
    mockedFindMany.mockResolvedValue([makeLog("log-1")]);

    await logsRoute.GET(
      getRequest("7", { limit: "abc" }),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 51,
      }),
    );
  });

  it("scopes query to eventId via post.eventId", async () => {
    await logsRoute.GET(
      getRequest("42"),
      { params: Promise.resolve({ id: "42" }) },
    );

    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { post: { eventId: 42 } },
      }),
    );
  });

  it("orders logs by createdAt descending", async () => {
    await logsRoute.GET(
      getRequest("7"),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
      }),
    );
  });
});
