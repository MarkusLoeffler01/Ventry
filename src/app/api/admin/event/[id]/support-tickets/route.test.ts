import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/generated/prisma", () => ({
  SupportTicketStatus: {
    OPEN: "OPEN",
    IN_PROGRESS: "IN_PROGRESS",
    RESOLVED: "RESOLVED",
    CLOSED: "CLOSED",
  },
}));

vi.mock("@/lib/prisma/prisma", () => ({
  prisma: {
    supportTicket: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/event-admin", () => ({
  checkEventAdminAuth: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({
  forbiddenResponse: vi.fn((error?: string) =>
    new Response(JSON.stringify({ error: error ?? "Forbidden" }), {
      status: 403,
      headers: {
        "content-type": "application/json",
      },
    }),
  ),
}));

import * as adminTicketsRoute from "@/app/api/admin/event/[id]/support-tickets/route";
import { prisma } from "@/lib/prisma/prisma";
import { checkEventAdminAuth } from "@/lib/auth/event-admin";
import { forbiddenResponse } from "@/lib/auth/admin";

const mockedFindTickets = prisma.supportTicket.findMany as unknown as ReturnType<typeof vi.fn>;
const mockedCheckEventAdminAuth = checkEventAdminAuth as unknown as ReturnType<typeof vi.fn>;
const mockedForbiddenResponse = forbiddenResponse as unknown as ReturnType<typeof vi.fn>;

function request(url: string) {
  return new NextRequest(url, { method: "GET" });
}

describe("App Router: /api/admin/event/[id]/support-tickets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCheckEventAdminAuth.mockResolvedValue({ authorized: true, adminId: "admin-1" });
  });

  it("returns 404 when the event is not found in admin auth", async () => {
    mockedCheckEventAdminAuth.mockResolvedValue({ authorized: false, error: "Event not found" });

    const response = await adminTicketsRoute.GET(
      request("http://localhost/api/admin/event/7/support-tickets"),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Event not found" });
  });

  it("returns 403 for unauthorized event admins", async () => {
    mockedCheckEventAdminAuth.mockResolvedValue({
      authorized: false,
      error: "Only this event's admin can manage these support tickets",
    });

    const response = await adminTicketsRoute.GET(
      request("http://localhost/api/admin/event/7/support-tickets"),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(response.status).toBe(403);
    expect(mockedForbiddenResponse).toHaveBeenCalledWith(
      "Only this event's admin can manage these support tickets",
    );
  });

  it("returns 400 for invalid status filters", async () => {
    const response = await adminTicketsRoute.GET(
      request("http://localhost/api/admin/event/7/support-tickets?status=BAD"),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid status filter" });
  });

  it("returns serialized admin tickets and forwards the status filter", async () => {
    mockedFindTickets.mockResolvedValue([
      {
        id: "ticket-1",
        subject: "Badge issue",
        description: "Please reprint my badge.",
        status: "IN_PROGRESS",
        adminResponse: "We are reprinting it now.",
        resolvedAt: null,
        createdAt: new Date("2026-04-02T08:00:00.000Z"),
        updatedAt: new Date("2026-04-02T09:00:00.000Z"),
        user: {
          id: "user-1",
          name: "Jamie",
          email: "jamie@example.com",
        },
        registration: {
          id: "reg-1",
          ticketId: 42,
        },
      },
    ]);

    const response = await adminTicketsRoute.GET(
      request("http://localhost/api/admin/event/7/support-tickets?status=IN_PROGRESS"),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      tickets: [
        {
          id: "ticket-1",
          subject: "Badge issue",
          description: "Please reprint my badge.",
          status: "IN_PROGRESS",
          adminResponse: "We are reprinting it now.",
          resolvedAt: null,
          createdAt: "2026-04-02T08:00:00.000Z",
          updatedAt: "2026-04-02T09:00:00.000Z",
          user: {
            id: "user-1",
            name: "Jamie",
            email: "jamie@example.com",
          },
          registration: {
            id: "reg-1",
            ticketId: 42,
          },
        },
      ],
    });
    expect(mockedFindTickets).toHaveBeenCalledWith({
      where: {
        eventId: 7,
        status: "IN_PROGRESS",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        registration: {
          select: {
            id: true,
            ticketId: true,
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }],
    });
  });
});
