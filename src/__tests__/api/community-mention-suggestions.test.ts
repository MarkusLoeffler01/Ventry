import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/community/events/[eventId]/mention-suggestions/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma/prisma", () => ({
  prisma: {
    user: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma/prisma";

const getSessionMock = vi.fn();
vi.mock("@/lib/auth/session", () => ({ getSession: () => getSessionMock() }));

type P = { user: { findMany: ReturnType<typeof vi.fn> } };
const p = prisma as unknown as P;

const EVENT_ID = 7;
const PARAMS = { params: Promise.resolve({ eventId: String(EVENT_ID) }) };

function makeReq(q?: string): NextRequest {
  const url = q
    ? `http://localhost/api/community/events/${EVENT_ID}/mention-suggestions?q=${encodeURIComponent(q)}`
    : `http://localhost/api/community/events/${EVENT_ID}/mention-suggestions`;
  return new NextRequest(url);
}

describe("GET /api/community/events/[eventId]/mention-suggestions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without session", async () => {
    getSessionMock.mockReturnValue(null);

    const res = await GET(makeReq(), PARAMS);
    expect(res.status).toBe(401);
  });

  it("returns 400 for non-numeric eventId", async () => {
    getSessionMock.mockReturnValue({ user: { id: "u1" } });

    const res = await GET(
      makeReq(),
      { params: Promise.resolve({ eventId: "not-a-number" }) },
    );
    expect(res.status).toBe(400);
  });

  it("returns matching users filtered by username prefix", async () => {
    getSessionMock.mockReturnValue({ user: { id: "u1" } });
    p.user.findMany.mockResolvedValue([
      { id: "u-alice", name: "Alice Smith", username: "alice-smith" },
      { id: "u-alex", name: "Alex Jones", username: "alex-jones" },
    ]);

    const res = await GET(makeReq("al"), PARAMS);
    const body = await res.json() as { users: { id: string; username: string; name: string }[] };

    expect(res.status).toBe(200);
    expect(body.users).toHaveLength(2);
    expect(body.users[0].username).toBe("alice-smith");

    expect(p.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          username: { contains: "al", mode: "insensitive" },
        }),
      }),
    );
  });

  it("searches without a username filter when query is empty", async () => {
    getSessionMock.mockReturnValue({ user: { id: "u1" } });
    p.user.findMany.mockResolvedValue([{ id: "u-bob", name: "Bob", username: "bob" }]);

    const res = await GET(makeReq(""), PARAMS);
    const body = await res.json() as { users: { id: string }[] };

    expect(res.status).toBe(200);
    expect(body.users).toHaveLength(1);
    // No `username` filter key in where when query empty
    expect(p.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ username: expect.anything() }),
      }),
    );
  });

  it("filters by eventId in OR conditions", async () => {
    getSessionMock.mockReturnValue({ user: { id: "u1" } });
    p.user.findMany.mockResolvedValue([]);

    await GET(makeReq("x"), PARAMS);

    const call = p.user.findMany.mock.calls[0][0] as { where: { OR: unknown[] } };
    expect(call.where.OR).toBeDefined();
    // Each branch should reference the event id
    const branches = JSON.stringify(call.where.OR);
    expect(branches).toContain(String(EVENT_ID));
  });

  it("omits users with no username from results", async () => {
    getSessionMock.mockReturnValue({ user: { id: "u1" } });
    p.user.findMany.mockResolvedValue([
      { id: "u-named", name: "Alice", username: "alice" },
      { id: "u-nousername", name: "Nameless", username: null },
    ]);

    const res = await GET(makeReq("a"), PARAMS);
    const body = await res.json() as { users: { id: string }[] };

    expect(body.users).toHaveLength(1);
    expect(body.users[0].id).toBe("u-named");
  });

  it("falls back to username when name is missing", async () => {
    getSessionMock.mockReturnValue({ user: { id: "u1" } });
    p.user.findMany.mockResolvedValue([{ id: "u1", name: null, username: "just-a-handle" }]);

    const res = await GET(makeReq("just"), PARAMS);
    const body = await res.json() as { users: { id: string; name: string; username: string }[] };

    expect(body.users[0].name).toBe("just-a-handle");
  });
});
