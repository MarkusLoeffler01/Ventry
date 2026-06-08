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

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/events/registration-capacity", () => ({
  countActiveRegistrations: vi.fn(),
  releaseExpiredPendingRegistrations: vi.fn(),
}));

import * as updateRoute from "@/app/api/event/[id]/update/route";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/prisma";
import { releaseExpiredPendingRegistrations } from "@/lib/events/registration-capacity";

const mockedGetSession = getSession as unknown as ReturnType<typeof vi.fn>;
const mockedFindEvent = prisma.event.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockedTransaction = prisma.$transaction as unknown as ReturnType<typeof vi.fn>;
const mockedReleaseExpiredPendingRegistrations =
  releaseExpiredPendingRegistrations as unknown as ReturnType<typeof vi.fn>;

function patchRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createTx() {
  return {
    registration: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    registrationItem: {
      create: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn(),
    },
    waitlistEntry: {
      deleteMany: vi.fn(),
    },
    product: {
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn(),
    },
    payment: {
      create: vi.fn().mockResolvedValue({ id: "payment-addon" }),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

describe("App Router: user registration update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockedReleaseExpiredPendingRegistrations.mockResolvedValue(undefined);
  });

  it("lets paid registrations add an add-on without resending a current ticket product", async () => {
    mockedFindEvent.mockResolvedValue({
      id: 6,
      name: "Event",
      requireApproval: false,
      maxRegistrations: null,
      paymentDeadline: new Date("2026-07-01T00:00:00.000Z"),
      stayPolicy: null,
      startDate: new Date("2026-08-01T00:00:00.000Z"),
      endDate: new Date("2026-08-03T00:00:00.000Z"),
      products: [
        {
          id: "shirt-m",
          name: "TShirt Size M",
          price: 20,
          description: null,
          type: "ADDON",
          capacity: null,
          soldCount: 0,
          allowWaitlist: false,
        },
      ],
    });

    const tx = createTx();
    tx.registration.findUnique.mockResolvedValue({
      id: "reg-1",
      status: "CONFIRMED",
      expiresAt: null,
      preferences: {
        productId: "ticket-basic",
        productIds: ["ticket-basic", "hotel-stay"],
        accommodationId: "hotel-stay",
        needsHotel: true,
        earlyArrival: false,
        lateDeparture: false,
        showOnAttendees: true,
      },
      registrationItems: [
        { productId: "ticket-basic" },
        { productId: "hotel-stay" },
      ],
      waitlistEntries: [],
      payments: [
        {
          id: "payment-paid",
          amount: 100,
          paymentStatus: "COMPLETED",
        },
      ],
    });
    mockedTransaction.mockImplementation((callback) => callback(tx));

    const response = await updateRoute.PATCH(
      patchRequest("http://localhost/api/event/6/update", {
        mode: "extras",
        productIds: ["shirt-m"],
        preferences: {
          accommodationId: "hotel-stay",
          needsHotel: true,
          earlyArrival: false,
          lateDeparture: false,
          showOnAttendees: true,
          customFieldsData: {
            tshirtSponsorSize: "L",
          },
        },
      }),
      { params: Promise.resolve({ id: "6" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      message: "Registration updated",
      paymentId: "payment-addon",
    });
    expect(tx.registrationItem.create).toHaveBeenCalledWith({
      data: {
        registrationId: "reg-1",
        productId: "shirt-m",
        priceAtBooking: 20,
      },
    });
    expect(tx.payment.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        registrationId: "reg-1",
        amount: 20,
        currency: "EUR",
        paymentStatus: "PENDING",
        paymentProvider: "STRIPE",
      },
    });
    expect(tx.registration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          preferences: expect.objectContaining({
            productId: "ticket-basic",
            productIds: ["ticket-basic", "hotel-stay", "shirt-m"],
            accommodationId: "hotel-stay",
            customFieldsData: {
              tshirtSponsorSize: "L",
            },
          }),
        }),
      }),
    );
  });

  it("does not reject paid add-on updates when the extras payload omits accommodationId", async () => {
    mockedFindEvent.mockResolvedValue({
      id: 6,
      name: "Event",
      requireApproval: false,
      maxRegistrations: null,
      paymentDeadline: new Date("2026-07-01T00:00:00.000Z"),
      stayPolicy: null,
      startDate: new Date("2026-08-01T00:00:00.000Z"),
      endDate: new Date("2026-08-03T00:00:00.000Z"),
      products: [
        {
          id: "shirt-m",
          name: "TShirt Size M",
          price: 20,
          description: null,
          type: "ADDON",
          capacity: null,
          soldCount: 0,
          allowWaitlist: false,
        },
      ],
    });

    const tx = createTx();
    tx.registration.findUnique.mockResolvedValue({
      id: "reg-1",
      status: "CONFIRMED",
      expiresAt: null,
      preferences: {
        productId: "ticket-basic",
        productIds: ["ticket-basic", "hotel-stay"],
        showOnAttendees: true,
      },
      registrationItems: [
        { productId: "ticket-basic" },
        { productId: "hotel-stay" },
      ],
      waitlistEntries: [],
      payments: [
        {
          id: "payment-paid",
          amount: 100,
          paymentStatus: "COMPLETED",
        },
      ],
    });
    mockedTransaction.mockImplementation((callback) => callback(tx));

    const response = await updateRoute.PATCH(
      patchRequest("http://localhost/api/event/6/update", {
        mode: "extras",
        productId: "ticket-basic",
        productIds: ["shirt-m"],
        preferences: {
          productId: "ticket-basic",
          needsHotel: true,
          earlyArrival: false,
          lateDeparture: false,
          customFieldsData: {
            "1as4m9": true,
            "57ly5g": "L",
          },
          showOnAttendees: true,
        },
      }),
      { params: Promise.resolve({ id: "6" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      message: "Registration updated",
      paymentId: "payment-addon",
    });
    expect(tx.registration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          preferences: expect.objectContaining({
            productId: "ticket-basic",
            productIds: ["ticket-basic", "hotel-stay", "shirt-m"],
            needsHotel: true,
            earlyArrival: false,
            lateDeparture: false,
          }),
        }),
      }),
    );
  });
});
