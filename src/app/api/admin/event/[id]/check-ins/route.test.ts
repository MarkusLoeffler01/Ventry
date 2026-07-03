import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma/prisma", () => ({
  prisma: {
    event: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/auth/admin", () => ({
  forbiddenResponse: vi.fn((error?: string) =>
    new Response(JSON.stringify({ error: error ?? "Forbidden" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    }),
  ),
}));

vi.mock("@/lib/auth/event-admin", () => ({
  checkEventAdminAuth: vi.fn(),
}));

import * as snapshotRoute from "@/app/api/admin/event/[id]/check-ins/snapshot/route";
import * as batchRoute from "@/app/api/admin/event/[id]/check-ins/batch/route";
import { prisma } from "@/lib/prisma/prisma";
import { checkEventAdminAuth } from "@/lib/auth/event-admin";

const mockedCheckEventAdminAuth = checkEventAdminAuth as unknown as ReturnType<typeof vi.fn>;
const mockedFindEvent = prisma.event.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockedTransaction = prisma.$transaction as unknown as ReturnType<typeof vi.fn>;

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

function createTx(overrides: Record<string, unknown> = {}) {
  return {
    registrationCheckInLog: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(({ data }) => Promise.resolve({
        ...data,
        serverProcessedAt: new Date("2026-06-08T12:00:00.000Z"),
      })),
    },
    registration: {
      findFirst: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        checkedInAt: new Date("2026-06-08T12:00:00.000Z"),
        checkInCount: 1,
      }),
    },
    ...overrides,
  };
}

describe("App Router: admin event check-ins", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCheckEventAdminAuth.mockResolvedValue({ authorized: true, adminId: "admin-1" });
  });

  it("returns a minimal snapshot without address fields", async () => {
    mockedFindEvent.mockResolvedValue({
      id: 7,
      name: "Event",
      scanOnce: true,
      updatedAt: new Date("2026-06-08T10:00:00.000Z"),
      products: [
        {
          id: "ticket-basic",
          name: "Basic",
          type: "TICKET",
        },
      ],
      registrations: [
        {
          id: "reg-1",
          ticketId: 42,
          status: "CONFIRMED",
          preferences: {},
          expiresAt: null,
          checkedInAt: null,
          checkInCount: 0,
          user: {
            name: "Display Name",
            legalName: "Legal Name",
            addressLine1: "Should not leak",
          },
          registrationItems: [
            {
              product: {
                id: "ticket-basic",
                name: "Basic",
                type: "TICKET",
              },
            },
          ],
          payments: [],
        },
      ],
    });

    const response = await snapshotRoute.GET(
      getRequest("http://localhost/api/admin/event/7/check-ins/snapshot"),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.registrations[0]).toMatchObject({
      ticketId: 42,
      attendeeName: "Display Name",
      displayName: "Display Name",
      legalName: "Legal Name",
      eligible: true,
      ticketTier: "Basic",
    });
    expect(JSON.stringify(payload)).not.toContain("Should not leak");
    expect(JSON.stringify(payload)).not.toContain("addressLine1");
  });

  it("resolves the ticket tier from registration preferences when items are incomplete", async () => {
    mockedFindEvent.mockResolvedValue({
      id: 7,
      name: "Event",
      scanOnce: true,
      updatedAt: new Date("2026-06-08T10:00:00.000Z"),
      products: [
        {
          id: "ticket-sponsor",
          name: "Sponsor",
          type: "TICKET",
        },
      ],
      registrations: [
        {
          id: "reg-1",
          ticketId: 42,
          status: "CONFIRMED",
          preferences: { productId: "ticket-sponsor" },
          expiresAt: null,
          checkedInAt: null,
          checkInCount: 0,
          user: {
            name: "Display Name",
            legalName: "Legal Name",
          },
          registrationItems: [],
          payments: [],
        },
      ],
    });

    const response = await snapshotRoute.GET(
      getRequest("http://localhost/api/admin/event/7/check-ins/snapshot"),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.registrations[0]).toMatchObject({
      ticketTier: "Sponsor",
      bookedItems: [
        {
          id: "ticket-sponsor",
          name: "Sponsor",
          type: "TICKET",
        },
      ],
    });
  });

  it("accepts an eligible batch check-in and writes a log", async () => {
    mockedFindEvent.mockResolvedValue({ id: 7, scanOnce: true });
    const tx = createTx();
    tx.registration.findFirst.mockResolvedValue({
      id: "reg-1",
      ticketId: 42,
      status: "CONFIRMED",
      expiresAt: null,
      checkedInAt: null,
      payments: [],
      preferences: {},
      event: {
        products: [
          {
            id: "ticket-basic",
            name: "Basic",
            type: "TICKET",
          },
        ],
      },
      user: { name: "Display Name", legalName: "Legal Name" },
      registrationItems: [
        {
          product: {
            id: "ticket-basic",
            name: "Basic",
            type: "TICKET",
          },
        },
      ],
    });
    mockedTransaction.mockImplementation((callback) => callback(tx));

    const response = await batchRoute.POST(
      postRequest("http://localhost/api/admin/event/7/check-ins/batch", {
        operations: [
          {
            clientOperationId: "operation-1",
            ticketId: 42,
            scannedAt: "2026-06-08T11:55:00.000Z",
          },
        ],
      }),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(response.status).toBe(200);
    expect(tx.registration.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.not.objectContaining({
          preferences: true,
        }),
      }),
    );
    expect(tx.registration.updateMany).toHaveBeenCalledWith({
      where: { id: "reg-1", checkedInAt: null },
      data: {
        checkedInAt: expect.any(Date),
        checkedInByAdminId: "admin-1",
        checkInCount: { increment: 1 },
      },
    });
    expect(tx.registrationCheckInLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          result: "ACCEPTED",
          registrationId: "reg-1",
          clientOperationId: "operation-1",
          notes: expect.objectContaining({
            attendeeName: "Display Name",
            displayName: "Display Name",
            legalName: "Legal Name",
          }),
        }),
      }),
    );
  });

  it("rejects duplicate scan-once check-ins", async () => {
    mockedFindEvent.mockResolvedValue({ id: 7, scanOnce: true });
    const tx = createTx();
    tx.registration.findFirst.mockResolvedValue({
      id: "reg-1",
      ticketId: 42,
      status: "CONFIRMED",
      expiresAt: null,
      checkedInAt: new Date("2026-06-08T10:00:00.000Z"),
      payments: [],
      preferences: {},
      event: { products: [] },
      user: { name: "Display Name", legalName: "Legal Name" },
      registrationItems: [],
    });
    mockedTransaction.mockImplementation((callback) => callback(tx));

    const response = await batchRoute.POST(
      postRequest("http://localhost/api/admin/event/7/check-ins/batch", {
        operations: [
          {
            clientOperationId: "operation-duplicate",
            ticketId: 42,
          },
        ],
      }),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(response.status).toBe(200);
    expect(tx.registration.updateMany).not.toHaveBeenCalled();
    expect(tx.registrationCheckInLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          result: "REJECTED",
          notes: expect.objectContaining({
            reason: "Ticket was already checked in",
          }),
        }),
      }),
    );
  });
});
