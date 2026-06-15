import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/event-admin", () => ({
  checkEventAdminAuth: vi.fn(),
}));

vi.mock("@/lib/prisma/prisma", () => ({
  prisma: {
    badgeTemplate: {
      updateMany: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import * as badgeTemplateRoute from "@/app/api/admin/event/[id]/badge-templates/[templateId]/route";
import { checkEventAdminAuth } from "@/lib/auth/event-admin";
import { prisma } from "@/lib/prisma/prisma";

const mockedCheckEventAdminAuth = checkEventAdminAuth as unknown as ReturnType<typeof vi.fn>;
const mockedUpdateMany = prisma.badgeTemplate.updateMany as unknown as ReturnType<typeof vi.fn>;
const mockedFindFirst = prisma.badgeTemplate.findFirst as unknown as ReturnType<typeof vi.fn>;
const mockedDeleteMany = prisma.badgeTemplate.deleteMany as unknown as ReturnType<typeof vi.fn>;
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
    name: "Updated Badge",
    isDefault: true,
    widthMm: 85,
    heightMm: 55,
    background: { color: "#ffffff", fit: "cover", positionX: 50, positionY: 50 },
    elements: [],
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    ...overrides,
  };
}

describe("App Router: /api/admin/event/[id]/badge-templates/[templateId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCheckEventAdminAuth.mockResolvedValue({ authorized: true, adminId: "admin-1" });
    mockedTransaction.mockImplementation(callback => callback(prisma));
  });

  it("updates only a template belonging to the route event", async () => {
    mockedUpdateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 2 });
    mockedFindFirst.mockResolvedValue(templateRow());

    const response = await badgeTemplateRoute.PATCH(
      request("PATCH", "http://localhost/api/admin/event/7/badge-templates/template-1", {
        name: "Updated Badge",
        isDefault: true,
      }),
      { params: Promise.resolve({ id: "7", templateId: "template-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mockedUpdateMany).toHaveBeenNthCalledWith(1, {
      where: { id: "template-1", eventId: 7 },
      data: {
        name: "Updated Badge",
        isDefault: true,
      },
    });
    expect(mockedUpdateMany).toHaveBeenNthCalledWith(2, {
      where: { eventId: 7, id: { not: "template-1" } },
      data: { isDefault: false },
    });
    expect(mockedFindFirst).toHaveBeenCalledWith({
      where: { id: "template-1", eventId: 7 },
    });
  });

  it("returns 404 instead of updating when the template belongs to another event", async () => {
    mockedUpdateMany.mockResolvedValue({ count: 0 });

    const response = await badgeTemplateRoute.PATCH(
      request("PATCH", "http://localhost/api/admin/event/7/badge-templates/template-from-event-8", {
        name: "Nope",
      }),
      { params: Promise.resolve({ id: "7", templateId: "template-from-event-8" }) },
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Badge template not found" });
    expect(mockedUpdateMany).toHaveBeenCalledTimes(1);
    expect(mockedUpdateMany).toHaveBeenCalledWith({
      where: { id: "template-from-event-8", eventId: 7 },
      data: { name: "Nope" },
    });
    expect(mockedFindFirst).not.toHaveBeenCalled();
  });

  it("deletes only a template belonging to the route event", async () => {
    mockedDeleteMany.mockResolvedValue({ count: 1 });

    const response = await badgeTemplateRoute.DELETE(
      request("DELETE", "http://localhost/api/admin/event/7/badge-templates/template-1"),
      { params: Promise.resolve({ id: "7", templateId: "template-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mockedDeleteMany).toHaveBeenCalledWith({
      where: { id: "template-1", eventId: 7 },
    });
  });

  it("returns 404 instead of deleting when the template belongs to another event", async () => {
    mockedDeleteMany.mockResolvedValue({ count: 0 });

    const response = await badgeTemplateRoute.DELETE(
      request("DELETE", "http://localhost/api/admin/event/7/badge-templates/template-from-event-8"),
      { params: Promise.resolve({ id: "7", templateId: "template-from-event-8" }) },
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Badge template not found" });
    expect(mockedDeleteMany).toHaveBeenCalledWith({
      where: { id: "template-from-event-8", eventId: 7 },
    });
  });
});
