import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  calculatePlatformFeeAmount: (amountInCents: number) => {
    const feePercent = Number(process.env.PLATFORM_FEE_PERCENT) || 0;
    if (feePercent <= 0) return 0;
    return Math.floor((amountInCents * feePercent) / 100);
  },
}));

vi.mock("@/lib/billing/platformFee", () => ({
  shouldApplyPlatformFeeForEvent: vi.fn(),
}));

import * as createIntentRoute from "@/app/api/payment/create-intent/route";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/prisma";
import { stripe } from "@/lib/stripe";
import { shouldApplyPlatformFeeForEvent } from "@/lib/billing/platformFee";

const mockedGetSession = getSession as unknown as ReturnType<typeof vi.fn>;
const mockedFindPayment = prisma.payment.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockedCreateIntent = stripe.paymentIntents.create as unknown as ReturnType<typeof vi.fn>;
const mockedShouldApplyFee = shouldApplyPlatformFeeForEvent as unknown as ReturnType<typeof vi.fn>;

describe("App Router: /api/payment/create-intent", () => {
  const originalFeePercent = process.env.PLATFORM_FEE_PERCENT;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PLATFORM_FEE_PERCENT;
    mockedShouldApplyFee.mockResolvedValue(true);
  });

  afterEach(() => {
    if (originalFeePercent === undefined) delete process.env.PLATFORM_FEE_PERCENT;
    else process.env.PLATFORM_FEE_PERCENT = originalFeePercent;
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

  it("deducts the platform fee when PLATFORM_FEE_PERCENT is configured", async () => {
    process.env.PLATFORM_FEE_PERCENT = "2";
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

    await createIntentRoute.POST(
      new NextRequest("http://localhost/api/payment/create-intent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paymentId: "payment-1" }),
      }),
    );

    // 4999 cents * 2% = 99.98 -> rounds down to 99
    expect(mockedCreateIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 4999,
        application_fee_amount: 99,
        on_behalf_of: "acct_123",
      }),
    );
  });

  it("skips the platform fee while the event is under its free-ticket threshold", async () => {
    process.env.PLATFORM_FEE_PERCENT = "2";
    mockedShouldApplyFee.mockResolvedValue(false);
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

    await createIntentRoute.POST(
      new NextRequest("http://localhost/api/payment/create-intent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paymentId: "payment-1" }),
      }),
    );

    expect(mockedShouldApplyFee).toHaveBeenCalledWith(7);
    const callArgs = mockedCreateIntent.mock.calls[0][0];
    expect(callArgs.application_fee_amount).toBeUndefined();
  });
});
