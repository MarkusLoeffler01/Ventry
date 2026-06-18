import type { Payment, Registration, RegistrationStatus } from "@/generated/prisma";

export type CheckInEligibilityInput = Pick<Registration, "status" | "expiresAt" | "checkedInAt"> & {
  payments: Array<Pick<Payment, "paymentStatus">>;
  scanOnce: boolean;
};

export type CheckInEligibility = {
  eligible: boolean;
  reason: string | null;
};

export function getCheckInEligibility(input: CheckInEligibilityInput): CheckInEligibility {
  if (input.status === "CANCELLED") {
    return { eligible: false, reason: "Registration is cancelled" };
  }

  if (input.status === "WAITLISTED") {
    return { eligible: false, reason: "Registration is waitlisted" };
  }

  if (input.expiresAt && input.status === "PENDING" && input.expiresAt < new Date()) {
    return { eligible: false, reason: "Registration is expired" };
  }

  if (input.payments.some(payment => payment.paymentStatus === "PENDING" || payment.paymentStatus === "FAILED")) {
    return { eligible: false, reason: "Payment is not complete" };
  }

  if (input.scanOnce && input.checkedInAt) {
    return { eligible: false, reason: "Ticket was already checked in" };
  }

  return { eligible: true, reason: null };
}

export function isRegistrationStatus(value: string): value is RegistrationStatus {
  return ["PENDING", "CONFIRMED", "CANCELLED", "APPROVED", "WAITLISTED"].includes(value);
}

export function estimateOperationBatchBytes(operations: unknown[]) {
  return new TextEncoder().encode(JSON.stringify({ operations })).length;
}

type CheckInProduct = {
  id: string;
  name: string;
  type: "TICKET" | "ACCOMMODATION" | "ADDON";
};

type CheckInRegistrationItem = {
  product: CheckInProduct;
};

function extractPreferenceProductIds(preferences: unknown) {
  if (!preferences || typeof preferences !== "object") {
    return [];
  }

  const source = preferences as {
    productId?: unknown;
    productIds?: unknown;
    accommodationId?: unknown;
  };
  const ids = [
    typeof source.productId === "string" ? source.productId : null,
    typeof source.accommodationId === "string" ? source.accommodationId : null,
    ...(Array.isArray(source.productIds)
      ? source.productIds.filter((id): id is string => typeof id === "string")
      : []),
  ];

  return Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
}

export function resolveCheckInProducts(
  registrationItems: CheckInRegistrationItem[],
  preferences: unknown,
  eventProducts: CheckInProduct[],
) {
  const productsById = new Map(eventProducts.map(product => [product.id, product]));
  const products = [...registrationItems.map(item => item.product)];

  for (const productId of extractPreferenceProductIds(preferences)) {
    const product = productsById.get(productId);
    if (product && !products.some(existing => existing.id === product.id)) {
      products.push(product);
    }
  }

  return products;
}

export function resolveTicketTier(
  registrationItems: CheckInRegistrationItem[],
  preferences: unknown,
  eventProducts: CheckInProduct[],
) {
  return resolveCheckInProducts(registrationItems, preferences, eventProducts).find(product => product.type === "TICKET") || null;
}
