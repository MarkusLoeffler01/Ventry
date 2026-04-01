import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma/prisma", () => ({
  prisma: {
    payment: {
      update: vi.fn(),
    },
    registration: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import * as stripeWebhookRoute from "@/app/api/webhooks/stripe/route";
import { prisma } from "@/lib/prisma/prisma";
import { stripe } from "@/lib/stripe";

const mockedConstructEvent = stripe.webhooks.constructEvent as unknown as ReturnType<typeof vi.fn>;
const mockedUpdatePayment = prisma.payment.update as unknown as ReturnType<typeof vi.fn>;
const mockedUpdateRegistration = prisma.registration.update as unknown as ReturnType<typeof vi.fn>;
const mockedTransaction = prisma.$transaction as unknown as ReturnType<typeof vi.fn>;

const originalWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

describe("App Router: /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  });

  afterEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = originalWebhookSecret;
  });

  it("returns 400 when the signature or webhook secret is missing", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const response = await stripeWebhookRoute.POST(
      new NextRequest("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: "{}",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Missing signature or secret" });
  });

  it("returns 400 when Stripe signature verification fails", async () => {
    mockedConstructEvent.mockImplementation(() => {
      throw new Error("bad signature");
    });

    const response = await stripeWebhookRoute.POST(
      new NextRequest("http://localhost/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "t=123,v1=signature" },
        body: "{}",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Webhook Error" });
  });

  it("marks payments complete when payment_intent.succeeded arrives", async () => {
    mockedConstructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: {
        object: {
          metadata: {
            paymentId: "payment-1",
            registrationId: "registration-1",
          },
        },
      },
    });
    mockedUpdatePayment.mockImplementation(({ where, data }) => ({ where, data }));
    mockedUpdateRegistration.mockImplementation(({ where, data }) => ({ where, data }));
    mockedTransaction.mockResolvedValue(undefined);

    const response = await stripeWebhookRoute.POST(
      new NextRequest("http://localhost/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "t=123,v1=signature" },
        body: JSON.stringify({ id: "evt_123" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(mockedConstructEvent).toHaveBeenCalledWith(
      JSON.stringify({ id: "evt_123" }),
      "t=123,v1=signature",
      "whsec_test",
    );
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
