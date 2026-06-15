import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/event-admin", () => ({
  checkEventAdminAuth: vi.fn(),
}));

vi.mock("@/lib/prisma/prisma", () => ({
  prisma: {
    badgeTemplate: {
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import * as badgeTemplatesRoute from "@/app/api/admin/event/[id]/badge-templates/route";
import { checkEventAdminAuth } from "@/lib/auth/event-admin";
import { prisma } from "@/lib/prisma/prisma";

const mockedCheckEventAdminAuth = checkEventAdminAuth as unknown as ReturnType<typeof vi.fn>;
const mockedFindMany = prisma.badgeTemplate.findMany as unknown as ReturnType<typeof vi.fn>;
const mockedCreate = prisma.badgeTemplate.create as unknown as ReturnType<typeof vi.fn>;
const mockedUpdateMany = prisma.badgeTemplate.updateMany as unknown as ReturnType<typeof vi.fn>;
const mockedTransaction = prisma.$transaction as unknown as ReturnType<typeof vi.fn>;

function request(method: string, url: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function templateRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "template-1",
    eventId: 7,
    name: "Staff Badge",
    isDefault: false,
    widthMm: 85,
    heightMm: 55,
    background: { color: "#ffffff", fit: "cover", positionX: 50, positionY: 50 },
    elements: [],
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    ...overrides,
  };
}

function templateInput(overrides: Record<string, unknown> = {}) {
  return {
    name: "Staff Badge",
    isDefault: true,
    widthMm: 85,
    heightMm: 55,
    background: { color: "#ffffff", fit: "cover", positionX: 50, positionY: 50 },
    elements: [],
    ...overrides,
  };
}

describe("App Router: /api/admin/event/[id]/badge-templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCheckEventAdminAuth.mockResolvedValue({ authorized: true, adminId: "admin-1" });
    mockedTransaction.mockImplementation(callback => callback(prisma));
  });

  it("lists only templates for the authorized event", async () => {
    mockedFindMany.mockResolvedValue([templateRow()]);

    const response = await badgeTemplatesRoute.GET(
      request("GET", "http://localhost/api/admin/event/7/badge-templates"),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(response.status).toBe(200);
    expect(mockedCheckEventAdminAuth).toHaveBeenCalledWith(7, expect.any(Headers));
    expect(mockedFindMany).toHaveBeenCalledWith({
      where: { eventId: 7 },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });
  });

  it("does not list templates when the event admin check fails", async () => {
    mockedCheckEventAdminAuth.mockResolvedValue({ authorized: false, error: "Only this event's admin can manage this event" });

    const response = await badgeTemplatesRoute.GET(
      request("GET", "http://localhost/api/admin/event/7/badge-templates"),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(response.status).toBe(403);
    expect(mockedFindMany).not.toHaveBeenCalled();
  });

  it("creates templates under the route event and clears defaults only for that event", async () => {
    mockedCreate.mockResolvedValue(templateRow({ isDefault: true }));

    const response = await badgeTemplatesRoute.POST(
      request("POST", "http://localhost/api/admin/event/7/badge-templates", templateInput()),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(response.status).toBe(201);
    expect(mockedUpdateMany).toHaveBeenCalledWith({
      where: { eventId: 7 },
      data: { isDefault: false },
    });
    expect(mockedCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventId: 7,
        name: "Staff Badge",
        isDefault: true,
      }),
    });
  });
});
