import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    paymentIntents: {
      retrieve: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma/prisma", () => ({
  prisma: {
    payment: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    registration: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import * as paymentStatusRoute from "@/app/api/payment/status/route";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/prisma";
import { stripe } from "@/lib/stripe";

const mockedGetSession = getSession as unknown as ReturnType<typeof vi.fn>;
const mockedRetrieveIntent = stripe.paymentIntents.retrieve as unknown as ReturnType<typeof vi.fn>;
const mockedFindPayment = prisma.payment.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockedUpdatePayment = prisma.payment.update as unknown as ReturnType<typeof vi.fn>;
const mockedUpdateRegistration = prisma.registration.update as unknown as ReturnType<typeof vi.fn>;
const mockedTransaction = prisma.$transaction as unknown as ReturnType<typeof vi.fn>;

describe("App Router: /api/payment/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when payment_intent is missing", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "user-1" } });

    const response = await paymentStatusRoute.GET(
      new NextRequest("http://localhost/api/payment/status"),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Missing payment_intent ID" });
  });

  it("returns 403 when the payment intent does not belong to the current user", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockedRetrieveIntent.mockResolvedValue({
      status: "requires_payment_method",
      metadata: {
        userId: "user-2",
      },
    });

    const response = await paymentStatusRoute.GET(
      new NextRequest("http://localhost/api/payment/status?payment_intent=pi_123"),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
  });

  it("syncs successful pending payments into the database", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockedRetrieveIntent.mockResolvedValue({
      id: "pi_123",
      status: "succeeded",
      metadata: {
        userId: "user-1",
        paymentId: "payment-1",
        registrationId: "registration-1",
      },
    });
    mockedFindPayment.mockResolvedValue({ paymentStatus: "PENDING" });
    mockedUpdatePayment.mockImplementation(({ where, data }) => ({ where, data }));
    mockedUpdateRegistration.mockImplementation(({ where, data }) => ({ where, data }));
    mockedTransaction.mockResolvedValue(undefined);

    const response = await paymentStatusRoute.GET(
      new NextRequest("http://localhost/api/payment/status?payment_intent=pi_123"),
    );

    expect(response.status).toBe(200);
    expect(mockedUpdatePayment).toHaveBeenCalledWith({
      where: { id: "payment-1" },
      data: { paymentStatus: "COMPLETED" },
    });
    expect(mockedUpdateRegistration).toHaveBeenCalledWith({
      where: { id: "registration-1" },
      data: { status: "CONFIRMED" },
    });
    expect(mockedTransaction).toHaveBeenCalledWith([
      {
        where: { id: "payment-1" },
        data: { paymentStatus: "COMPLETED" },
      },
      {
        where: { id: "registration-1" },
        data: { status: "CONFIRMED" },
      },
    ]);
  });
});
