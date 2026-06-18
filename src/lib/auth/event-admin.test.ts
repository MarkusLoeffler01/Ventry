import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/admin", () => ({
  checkAdminAuth: vi.fn(),
}));

vi.mock("@/lib/prisma/prisma", () => ({
  prisma: {
    event: {
      findUnique: vi.fn(),
    },
  },
}));

import { checkEventAdminAuth } from "@/lib/auth/event-admin";
import { checkAdminAuth } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma/prisma";

const mockedCheckAdminAuth = checkAdminAuth as unknown as ReturnType<typeof vi.fn>;
const mockedFindEvent = prisma.event.findUnique as unknown as ReturnType<typeof vi.fn>;

describe("checkEventAdminAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("propagates base admin auth failures", async () => {
    mockedCheckAdminAuth.mockResolvedValue({
      authorized: false,
      error: "Admin access required",
    });

    await expect(checkEventAdminAuth(7)).resolves.toEqual({
      authorized: false,
      error: "Admin access required",
    });
    expect(mockedFindEvent).not.toHaveBeenCalled();
  });

  it("returns not found when the event does not exist", async () => {
    mockedCheckAdminAuth.mockResolvedValue({
      authorized: true,
      adminId: "admin-1",
      user: { id: "user-1", email: "admin@example.com" },
    });
    mockedFindEvent.mockResolvedValue(null);

    await expect(checkEventAdminAuth(7)).resolves.toEqual({
      authorized: false,
      error: "Event not found",
    });
  });

  it("denies access when a different admin owns the event", async () => {
    mockedCheckAdminAuth.mockResolvedValue({
      authorized: true,
      adminId: "admin-1",
      user: { id: "user-1", email: "admin@example.com" },
    });
    mockedFindEvent.mockResolvedValue({
      id: 7,
      name: "Furavia",
      ownerId: "admin-2",
    });

    await expect(checkEventAdminAuth(7)).resolves.toEqual({
      authorized: false,
      error: "Only this event's admin can manage this event",
    });
  });

  it("allows the owning admin and returns event context", async () => {
    mockedCheckAdminAuth.mockResolvedValue({
      authorized: true,
      adminId: "admin-1",
      user: { id: "user-1", email: "admin@example.com" },
    });
    mockedFindEvent.mockResolvedValue({
      id: 7,
      name: "Furavia",
      ownerId: "admin-1",
    });

    await expect(checkEventAdminAuth(7)).resolves.toEqual({
      authorized: true,
      adminId: "admin-1",
      user: { id: "user-1", email: "admin@example.com" },
      event: {
        id: 7,
        name: "Furavia",
      },
    });
  });

  it("allows global admins when the event has no owner", async () => {
    mockedCheckAdminAuth.mockResolvedValue({
      authorized: true,
      adminId: "admin-1",
      user: { id: "user-1", email: "admin@example.com" },
    });
    mockedFindEvent.mockResolvedValue({
      id: 7,
      name: "Furavia",
      ownerId: null,
    });

    await expect(checkEventAdminAuth(7)).resolves.toEqual({
      authorized: true,
      adminId: "admin-1",
      user: { id: "user-1", email: "admin@example.com" },
      event: {
        id: 7,
        name: "Furavia",
      },
    });
  });
});
