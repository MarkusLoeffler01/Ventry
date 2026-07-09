import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/generated/prisma", () => ({
  NotificationType: {
    EVENT: "EVENT",
  },
}));

const prismaMock = vi.hoisted(() => ({
  registration: {
    findUnique: vi.fn(),
  },
  payment: {
    findMany: vi.fn(),
  },
  registrationItem: {
    findMany: vi.fn(),
  },
  event: {
    findFirst: vi.fn(),
  },
  adminOrganizationMembership: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/auth/admin", () => ({
  checkAdminAuth: vi.fn(),
  adminEventFilter: vi.fn(),
  checkEventAdminAuth: vi.fn(),
  forbiddenResponse: vi.fn((error?: string) =>
    new Response(JSON.stringify({ error: error ?? "Forbidden" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    }),
  ),
}));

vi.mock("@/lib/events/registration-capacity", () => ({
  cancelRegistrationAndReleaseCapacity: vi.fn(),
  syncReleasedProductStocks: vi.fn(),
}));

vi.mock("@/lib/helpers/html", () => ({
  renderComponentToHTML: vi.fn(),
}));

vi.mock("@/lib/mail", () => ({
  sendMail: vi.fn(),
}));

const createNotificationMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/notifications", () => ({
  createNotification: createNotificationMock,
}));

import { PATCH } from "./route";
import { checkAdminAuth, adminEventFilter, checkEventAdminAuth } from "@/lib/auth/admin";
import { syncReleasedProductStocks } from "@/lib/events/registration-capacity";
import { renderComponentToHTML } from "@/lib/helpers/html";
import { sendMail } from "@/lib/mail";

const mockedCheckAdminAuth = checkAdminAuth as unknown as ReturnType<typeof vi.fn>;
const mockedAdminEventFilter = adminEventFilter as unknown as ReturnType<typeof vi.fn>;
const mockedCheckEventAdminAuth = checkEventAdminAuth as unknown as ReturnType<typeof vi.fn>;
const mockedSyncReleasedProductStocks = syncReleasedProductStocks as unknown as ReturnType<typeof vi.fn>;
const mockedRenderHtml = renderComponentToHTML as unknown as ReturnType<typeof vi.fn>;
const mockedSendMail = sendMail as unknown as ReturnType<typeof vi.fn>;

function patchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/registrations/reg-1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function currentRegistration() {
  return {
    id: "reg-1",
    userId: "user-1",
    status: "PENDING",
    preferences: {},
    customFieldData: {},
    payments: [],
    registrationItems: [],
    event: {
      id: 7,
      name: "Furavia",
      requireApproval: false,
      paymentDeadline: null,
      products: [],
    },
  };
}

function txMock() {
  return {
    admin: {
      findUnique: vi.fn().mockResolvedValue({ id: "admin-1" }),
    },
    payment: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    registrationItem: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
      create: vi.fn(),
    },
    product: {
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    registration: {
      update: vi.fn().mockResolvedValue({
        id: "reg-1",
        userId: "user-1",
        status: "APPROVED",
        user: {
          name: "Jamie",
          email: "jamie@example.com",
        },
        event: {
          id: 7,
          name: "Furavia",
        },
        payments: [],
      }),
    },
    registrationHistory: {
      create: vi.fn(),
    },
  };
}

describe("PATCH /api/admin/registrations/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCheckAdminAuth.mockResolvedValue({
      authorized: true,
      adminId: "admin-1",
      user: { id: "admin-user-1", email: "admin@example.com" },
    });
    mockedAdminEventFilter.mockResolvedValue({ OR: [{ ownerId: "admin-1" }] });
    mockedCheckEventAdminAuth.mockResolvedValue({ authorized: true, adminId: "admin-1" });
    prismaMock.event.findFirst.mockResolvedValue({ id: 7 });
    prismaMock.adminOrganizationMembership.findMany.mockResolvedValue([]);
    mockedSyncReleasedProductStocks.mockResolvedValue(undefined);
    mockedRenderHtml.mockResolvedValue("<html />");
    mockedSendMail.mockResolvedValue(undefined);
    createNotificationMock.mockResolvedValue({});
    prismaMock.registration.findUnique.mockResolvedValue(currentRegistration());
    prismaMock.payment.findMany.mockResolvedValue([]);
    prismaMock.registrationItem.findMany.mockResolvedValue([]);
    prismaMock.$transaction.mockImplementation(async (callback: (tx: ReturnType<typeof txMock>) => unknown) =>
      callback(txMock()),
    );
  });

  it("creates an in-app notification when registration status changes", async () => {
    const response = await PATCH(
      patchRequest({ status: "APPROVED" }),
      { params: Promise.resolve({ id: "reg-1" }) },
    );

    expect(response.status).toBe(200);
    expect(createNotificationMock).toHaveBeenCalledWith(
      "user-1",
      "EVENT",
      "Registration status updated: Furavia",
      "Status changed from PENDING to APPROVED",
      "/events/7",
    );
  });
});
