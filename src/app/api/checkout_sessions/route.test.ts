import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("@/lib/prisma/prisma", () => ({
  prisma: {
    product: {
      findUnique: vi.fn(),
    },
  },
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
import { prisma } from "@/lib/prisma/prisma";
import { stripe } from "@/lib/stripe";

const mockedHeaders = headers as unknown as ReturnType<typeof vi.fn>;
const mockedFindProduct = prisma.product.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockedCreateSession = stripe.checkout.sessions.create as unknown as ReturnType<typeof vi.fn>;

function createRequest(productId?: string) {
  const formData = new FormData();
  if (productId) {
    formData.set("productId", productId);
  }

  return {
    url: "https://local.dev:3443/api/checkout_sessions",
    formData: async () => formData,
  } as Request;
}

describe("App Router: /api/checkout_sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedHeaders.mockResolvedValue(new Headers({ origin: "https://local.dev:3443" }));
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("redirects to the Stripe-hosted checkout page using product data from the database", async () => {
    mockedFindProduct.mockResolvedValue({
      id: "prod_123",
      name: "Weekend Ticket",
      description: "Full event access",
      price: 149.5,
    });
    mockedCreateSession.mockResolvedValue({
      url: "https://checkout.stripe.com/session/test_123",
    });

    const response = await checkoutSessionsRoute.POST(createRequest("prod_123"));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://checkout.stripe.com/session/test_123");
    expect(mockedFindProduct).toHaveBeenCalledWith({
      where: { id: "prod_123" },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
      },
    });
    expect(mockedCreateSession).toHaveBeenCalledWith({
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Weekend Ticket",
              description: "Full event access",
              metadata: {
                productId: "prod_123",
              },
            },
            unit_amount: 14950,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: "https://local.dev:3443/stripe/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://local.dev:3443/dummy?canceled=true",
    });
  });

  it("returns 400 when no product id is submitted", async () => {
    const response = await checkoutSessionsRoute.POST(createRequest());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Product ID is required",
    });
  });

  it("returns 404 when the product does not exist", async () => {
    mockedFindProduct.mockResolvedValue(null);

    const response = await checkoutSessionsRoute.POST(createRequest("missing"));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Product not found" });
  });

  it("returns the Stripe error status when session creation fails", async () => {
    mockedFindProduct.mockResolvedValue({
      id: "prod_123",
      name: "Weekend Ticket",
      description: null,
      price: 149.5,
    });
    const error = Object.assign(new Error("Stripe unavailable"), { statusCode: 503 });
    mockedCreateSession.mockRejectedValue(error);

    const response = await checkoutSessionsRoute.POST(createRequest("prod_123"));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Stripe unavailable" });
  });
});
