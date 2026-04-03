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
      findFirst: vi.fn(),
      update: vi.fn(),
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

vi.mock("@/lib/helpers/html", () => ({
  renderComponentToHTML: vi.fn(),
}));

vi.mock("@/lib/mail", () => ({
  sendMail: vi.fn(),
}));

import * as adminTicketUpdateRoute from "@/app/api/admin/event/[id]/support-tickets/[ticketId]/route";
import { prisma } from "@/lib/prisma/prisma";
import { checkEventAdminAuth } from "@/lib/auth/event-admin";
import { renderComponentToHTML } from "@/lib/helpers/html";
import { sendMail } from "@/lib/mail";

const mockedCheckEventAdminAuth = checkEventAdminAuth as unknown as ReturnType<typeof vi.fn>;
const mockedFindTicket = prisma.supportTicket.findFirst as unknown as ReturnType<typeof vi.fn>;
const mockedUpdateTicket = prisma.supportTicket.update as unknown as ReturnType<typeof vi.fn>;
const mockedRenderHtml = renderComponentToHTML as unknown as ReturnType<typeof vi.fn>;
const mockedSendMail = sendMail as unknown as ReturnType<typeof vi.fn>;

function patchRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("App Router: /api/admin/event/[id]/support-tickets/[ticketId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCheckEventAdminAuth.mockResolvedValue({
      authorized: true,
      adminId: "admin-1",
    });
    mockedRenderHtml.mockResolvedValue("<html />");
    mockedSendMail.mockResolvedValue(undefined);
  });

  it("returns 422 when no update fields are provided", async () => {
    const response = await adminTicketUpdateRoute.PATCH(
      patchRequest("http://localhost/api/admin/event/7/support-tickets/ticket-1", {}),
      { params: Promise.resolve({ id: "7", ticketId: "ticket-1" }) },
    );

    expect(response.status).toBe(422);
    expect(mockedFindTicket).not.toHaveBeenCalled();
  });

  it("returns 404 when the ticket does not exist for the event", async () => {
    mockedFindTicket.mockResolvedValue(null);

    const response = await adminTicketUpdateRoute.PATCH(
      patchRequest("http://localhost/api/admin/event/7/support-tickets/ticket-1", {
        status: "IN_PROGRESS",
      }),
      { params: Promise.resolve({ id: "7", ticketId: "ticket-1" }) },
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Support ticket not found" });
  });

  it("updates the ticket, stamps resolution, and sends a status mail", async () => {
    const existing = {
      id: "ticket-1",
      status: "OPEN",
      adminResponse: null,
      user: {
        name: "Jamie",
        email: "jamie@example.com",
      },
      event: {
        id: 7,
        name: "Furavia",
      },
      resolvedAt: null,
    };

    mockedFindTicket.mockResolvedValue(existing);
    mockedUpdateTicket.mockResolvedValue({
      id: "ticket-1",
      subject: "Badge issue",
      description: "Please reprint my badge.",
      status: "RESOLVED",
      adminResponse: "A corrected badge is ready at registration.",
      resolvedAt: new Date("2026-04-02T10:00:00.000Z"),
      createdAt: new Date("2026-04-02T08:00:00.000Z"),
      updatedAt: new Date("2026-04-02T10:00:00.000Z"),
      user: {
        id: "user-1",
        name: "Jamie",
        email: "jamie@example.com",
      },
      registration: {
        id: "reg-1",
        ticketId: 42,
      },
    });

    const response = await adminTicketUpdateRoute.PATCH(
      patchRequest("http://localhost/api/admin/event/7/support-tickets/ticket-1", {
        status: "RESOLVED",
        adminResponse: "A corrected badge is ready at registration.",
      }),
      { params: Promise.resolve({ id: "7", ticketId: "ticket-1" }) },
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.ticket.status).toBe("RESOLVED");
    expect(payload.ticket.adminResponse).toBe("A corrected badge is ready at registration.");
    expect(payload.ticket.resolvedAt).toBe("2026-04-02T10:00:00.000Z");
    expect(mockedUpdateTicket).toHaveBeenCalledWith({
      where: { id: "ticket-1" },
      data: expect.objectContaining({
        status: "RESOLVED",
        adminResponse: "A corrected badge is ready at registration.",
        lastUpdatedByAdminId: "admin-1",
        resolvedAt: expect.any(Date),
      }),
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
    });
    expect(mockedRenderHtml).toHaveBeenCalledWith(expect.anything(), {
      userName: "Jamie",
      eventName: "Furavia",
      eventUrl: "https://local.dev:3443/events/7",
      ticketId: "ticket-1",
      status: "RESOLVED",
      adminResponse: "A corrected badge is ready at registration.",
    });
    expect(mockedSendMail).toHaveBeenCalledWith(
      "jamie@example.com",
      "Support Ticket Updated: Furavia",
      "<html />",
    );
  });

  it("clears resolvedAt when reopening a previously resolved ticket", async () => {
    mockedFindTicket.mockResolvedValue({
      id: "ticket-1",
      status: "RESOLVED",
      adminResponse: "Done",
      user: {
        name: "Jamie",
        email: "jamie@example.com",
      },
      event: {
        id: 7,
        name: "Furavia",
      },
      resolvedAt: new Date("2026-04-02T10:00:00.000Z"),
    });
    mockedUpdateTicket.mockResolvedValue({
      id: "ticket-1",
      subject: "Badge issue",
      description: "Please reprint my badge.",
      status: "OPEN",
      adminResponse: "Looking into it again.",
      resolvedAt: null,
      createdAt: new Date("2026-04-02T08:00:00.000Z"),
      updatedAt: new Date("2026-04-02T11:00:00.000Z"),
      user: {
        id: "user-1",
        name: "Jamie",
        email: "jamie@example.com",
      },
      registration: {
        id: "reg-1",
        ticketId: 42,
      },
    });

    const response = await adminTicketUpdateRoute.PATCH(
      patchRequest("http://localhost/api/admin/event/7/support-tickets/ticket-1", {
        status: "OPEN",
        adminResponse: "Looking into it again.",
      }),
      { params: Promise.resolve({ id: "7", ticketId: "ticket-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mockedUpdateTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          resolvedAt: null,
        }),
      }),
    );
  });
});
