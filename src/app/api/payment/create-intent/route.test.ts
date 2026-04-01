import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma/prisma", () => ({
  prisma: {
    payment: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    paymentIntents: {
      create: vi.fn(),
    },
  },
}));

import * as createIntentRoute from "@/app/api/payment/create-intent/route";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/prisma";
import { stripe } from "@/lib/stripe";

const mockedGetSession = getSession as unknown as ReturnType<typeof vi.fn>;
const mockedFindPayment = prisma.payment.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockedCreateIntent = stripe.paymentIntents.create as unknown as ReturnType<typeof vi.fn>;

describe("App Router: /api/payment/create-intent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the user is not authenticated", async () => {
    mockedGetSession.mockResolvedValue(null);

    const response = await createIntentRoute.POST(
      new NextRequest("http://localhost/api/payment/create-intent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paymentId: "payment-1" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 403 when the payment belongs to another user", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockedFindPayment.mockResolvedValue({
      id: "payment-1",
      userId: "user-2",
    });

    const response = await createIntentRoute.POST(
      new NextRequest("http://localhost/api/payment/create-intent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paymentId: "payment-1" }),
      }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
  });

  it("creates a payment intent and routes funds to the event owner when connected", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockedFindPayment.mockResolvedValue({
      id: "payment-1",
      amount: 49.99,
      currency: "EUR",
      registrationId: "registration-1",
      userId: "user-1",
      registration: {
        eventId: 7,
        event: {
          owner: {
            stripeConnectId: "acct_123",
          },
        },
      },
    });
    mockedCreateIntent.mockResolvedValue({ client_secret: "pi_secret_123" });

    const response = await createIntentRoute.POST(
      new NextRequest("http://localhost/api/payment/create-intent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paymentId: "payment-1" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ clientSecret: "pi_secret_123" });
    expect(mockedCreateIntent).toHaveBeenCalledWith({
      amount: 4999,
      currency: "eur",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        paymentId: "payment-1",
        registrationId: "registration-1",
        eventId: "7",
        userId: "user-1",
      },
      transfer_data: {
        destination: "acct_123",
      },
      on_behalf_of: "acct_123",
    });
  });
});
