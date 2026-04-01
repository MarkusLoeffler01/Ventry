import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma/prisma", () => ({
  prisma: {
    registration: {
      findFirst: vi.fn(),
    },
    supportTicket: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/helpers/html", () => ({
  renderComponentToHTML: vi.fn(),
}));

vi.mock("@/lib/mail", () => ({
  sendMail: vi.fn(),
}));

import * as supportTicketRoute from "@/app/api/event/[id]/support-tickets/route";
import { prisma } from "@/lib/prisma/prisma";
import { getSession } from "@/lib/auth/session";
import { renderComponentToHTML } from "@/lib/helpers/html";
import { sendMail } from "@/lib/mail";

const mockedGetSession = getSession as unknown as ReturnType<typeof vi.fn>;
const mockedFindRegistration = prisma.registration.findFirst as unknown as ReturnType<typeof vi.fn>;
const mockedFindTickets = prisma.supportTicket.findMany as unknown as ReturnType<typeof vi.fn>;
const mockedCreateTicket = prisma.supportTicket.create as unknown as ReturnType<typeof vi.fn>;
const mockedFindAdmins = prisma.user.findMany as unknown as ReturnType<typeof vi.fn>;
const mockedRenderHtml = renderComponentToHTML as unknown as ReturnType<typeof vi.fn>;
const mockedSendMail = sendMail as unknown as ReturnType<typeof vi.fn>;

function getRequest(url: string) {
  return new NextRequest(url, { method: "GET" });
}

function postRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("App Router: /api/event/[id]/support-tickets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRenderHtml.mockResolvedValue("<html />");
    mockedSendMail.mockResolvedValue(undefined);
    mockedFindAdmins.mockResolvedValue([]);
  });

  describe("GET", () => {
    it("returns 401 when the user is not signed in", async () => {
      mockedGetSession.mockResolvedValue(null);

      const response = await supportTicketRoute.GET(
        getRequest("http://localhost/api/event/7/support-tickets"),
        { params: Promise.resolve({ id: "7" }) },
      );

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    });

    it("returns 403 when the user has no valid registration for the event", async () => {
      mockedGetSession.mockResolvedValue({ user: { id: "user-1" } });
      mockedFindRegistration.mockResolvedValue(null);

      const response = await supportTicketRoute.GET(
        getRequest("http://localhost/api/event/7/support-tickets"),
        { params: Promise.resolve({ id: "7" }) },
      );

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        error: "Only ticket holders can access support tickets for this event",
      });
    });

    it("returns serialized tickets for the signed-in ticket holder", async () => {
      mockedGetSession.mockResolvedValue({ user: { id: "user-1" } });
      mockedFindRegistration.mockResolvedValue({ id: "reg-1" });
      mockedFindTickets.mockResolvedValue([
        {
          id: "ticket-1",
          subject: "Need badge help",
          description: "My name badge has the wrong text.",
          status: "OPEN",
          adminResponse: null,
          resolvedAt: null,
          createdAt: new Date("2026-04-02T08:00:00.000Z"),
          updatedAt: new Date("2026-04-02T09:00:00.000Z"),
        },
      ]);

      const response = await supportTicketRoute.GET(
        getRequest("http://localhost/api/event/7/support-tickets"),
        { params: Promise.resolve({ id: "7" }) },
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        tickets: [
          {
            id: "ticket-1",
            subject: "Need badge help",
            description: "My name badge has the wrong text.",
            status: "OPEN",
            adminResponse: null,
            resolvedAt: null,
            createdAt: "2026-04-02T08:00:00.000Z",
            updatedAt: "2026-04-02T09:00:00.000Z",
          },
        ],
      });
    });
  });

  describe("POST", () => {
    it("returns 422 for invalid ticket payloads", async () => {
      mockedGetSession.mockResolvedValue({ user: { id: "user-1" } });

      const response = await supportTicketRoute.POST(
        postRequest("http://localhost/api/event/7/support-tickets", {
          subject: "bad",
          description: "short",
        }),
        { params: Promise.resolve({ id: "7" }) },
      );

      expect(response.status).toBe(422);
      expect(mockedCreateTicket).not.toHaveBeenCalled();
    });

    it("creates a support ticket and sends admin and attendee mails", async () => {
      mockedGetSession.mockResolvedValue({ user: { id: "user-1" } });
      mockedFindRegistration.mockResolvedValue({
        id: "reg-1",
        user: {
          name: "Jamie",
          email: "jamie@example.com",
        },
        event: {
          id: 7,
          name: "Furavia",
          owner: {
            user: {
              email: "owner@example.com",
            },
          },
        },
      });
      mockedCreateTicket.mockResolvedValue({
        id: "ticket-1",
        subject: "Badge printing issue",
        description: "My badge should use my nickname instead of my legal name.",
        status: "OPEN",
        adminResponse: null,
        resolvedAt: null,
        createdAt: new Date("2026-04-02T08:00:00.000Z"),
        updatedAt: new Date("2026-04-02T09:00:00.000Z"),
      });

      const response = await supportTicketRoute.POST(
        postRequest("http://localhost/api/event/7/support-tickets", {
          subject: "Badge printing issue",
          description: "My badge should use my nickname instead of my legal name.",
        }),
        { params: Promise.resolve({ id: "7" }) },
      );

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({
        ticket: {
          id: "ticket-1",
          subject: "Badge printing issue",
          description: "My badge should use my nickname instead of my legal name.",
          status: "OPEN",
          adminResponse: null,
          resolvedAt: null,
          createdAt: "2026-04-02T08:00:00.000Z",
          updatedAt: "2026-04-02T09:00:00.000Z",
        },
      });
      expect(mockedCreateTicket).toHaveBeenCalledWith({
        data: {
          eventId: 7,
          registrationId: "reg-1",
          userId: "user-1",
          subject: "Badge printing issue",
          description: "My badge should use my nickname instead of my legal name.",
        },
      });
      expect(mockedRenderHtml).toHaveBeenCalledTimes(2);
      expect(mockedSendMail).toHaveBeenCalledTimes(2);
      expect(mockedSendMail).toHaveBeenNthCalledWith(
        1,
        "owner@example.com",
        "New Support Ticket: Furavia",
        "<html />",
      );
      expect(mockedSendMail).toHaveBeenNthCalledWith(
        2,
        "jamie@example.com",
        "Support Ticket Received: Furavia",
        "<html />",
      );
    });

    it("falls back to platform admins when an event owner email is unavailable", async () => {
      mockedGetSession.mockResolvedValue({ user: { id: "user-1" } });
      mockedFindRegistration.mockResolvedValue({
        id: "reg-1",
        user: {
          name: "Jamie",
          email: "jamie@example.com",
        },
        event: {
          id: 7,
          name: "Furavia",
          owner: null,
        },
      });
      mockedCreateTicket.mockResolvedValue({
        id: "ticket-2",
        subject: "Payment question",
        description: "Can I update the card I used for this registration?",
        status: "OPEN",
        adminResponse: null,
        resolvedAt: null,
        createdAt: new Date("2026-04-02T08:00:00.000Z"),
        updatedAt: new Date("2026-04-02T09:00:00.000Z"),
      });
      mockedFindAdmins.mockResolvedValue([
        { email: "admin-a@example.com" },
        { email: "admin-b@example.com" },
      ]);

      const response = await supportTicketRoute.POST(
        postRequest("http://localhost/api/event/7/support-tickets", {
          subject: "Payment question",
          description: "Can I update the card I used for this registration?",
        }),
        { params: Promise.resolve({ id: "7" }) },
      );

      expect(response.status).toBe(201);
      expect(mockedFindAdmins).toHaveBeenCalledWith({
        where: { isAdmin: true },
        select: { email: true },
      });
      expect(mockedSendMail).toHaveBeenCalledTimes(3);
      expect(mockedSendMail).toHaveBeenCalledWith(
        "admin-a@example.com",
        "New Support Ticket: Furavia",
        "<html />",
      );
      expect(mockedSendMail).toHaveBeenCalledWith(
        "admin-b@example.com",
        "New Support Ticket: Furavia",
        "<html />",
      );
    });
  });
});
