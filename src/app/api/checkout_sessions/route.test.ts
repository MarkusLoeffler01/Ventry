import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
  },
}));

import * as checkoutSessionsRoute from "@/app/api/checkout_sessions/route";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";

const mockedHeaders = headers as unknown as ReturnType<typeof vi.fn>;
const mockedCreateSession = stripe.checkout.sessions.create as unknown as ReturnType<typeof vi.fn>;

describe("App Router: /api/checkout_sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedHeaders.mockResolvedValue(new Headers({ origin: "https://local.dev:3443" }));
  });

  it("redirects to the Stripe-hosted checkout page", async () => {
    mockedCreateSession.mockResolvedValue({
      url: "https://checkout.stripe.com/session/test_123",
    });

    const response = await checkoutSessionsRoute.POST();

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://checkout.stripe.com/session/test_123");
    expect(mockedCreateSession).toHaveBeenCalledWith({
      line_items: [
        {
          price: "price_1SwUDXGeUPx9JNNs5QdY5mcg",
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: "https://local.dev:3443/stripe/success?session_id={CHECKOUT_SESSION_ID}",
    });
  });

  it("returns the Stripe error status when session creation fails", async () => {
    const error = Object.assign(new Error("Stripe unavailable"), { statusCode: 503 });
    mockedCreateSession.mockRejectedValue(error);

    const response = await checkoutSessionsRoute.POST();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Stripe unavailable" });
  });
});
