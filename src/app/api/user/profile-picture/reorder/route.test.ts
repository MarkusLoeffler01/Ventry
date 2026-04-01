import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma/prisma", () => ({
  prisma: {
    profilePicture: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import * as reorderRoute from "@/app/api/user/profile-picture/reorder/route";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/prisma";

const mockedGetSession = getSession as unknown as ReturnType<typeof vi.fn>;
const mockedFindMany = prisma.profilePicture.findMany as unknown as ReturnType<typeof vi.fn>;
const mockedUpdate = prisma.profilePicture.update as unknown as ReturnType<typeof vi.fn>;
const mockedTransaction = prisma.$transaction as unknown as ReturnType<typeof vi.fn>;

describe("App Router: /api/user/profile-picture/reorder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the user is not signed in", async () => {
    mockedGetSession.mockResolvedValue(null);

    const response = await reorderRoute.PATCH(
      new NextRequest("http://localhost/api/user/profile-picture/reorder", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pictureIds: ["pic-1"] }),
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 403 when one of the pictures does not belong to the user", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockedFindMany.mockResolvedValue([{ id: "pic-1", userID: "user-1" }]);

    const response = await reorderRoute.PATCH(
      new NextRequest("http://localhost/api/user/profile-picture/reorder", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pictureIds: ["pic-1", "pic-2"] }),
      }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Some pictures do not belong to you or do not exist",
    });
  });

  it("updates picture order in a transaction", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockedFindMany.mockResolvedValue([
      { id: "pic-1", userID: "user-1" },
      { id: "pic-2", userID: "user-1" },
    ]);
    mockedUpdate.mockImplementation(({ where, data }) => ({
      where,
      data,
    }));
    mockedTransaction.mockResolvedValue(undefined);

    const response = await reorderRoute.PATCH(
      new NextRequest("http://localhost/api/user/profile-picture/reorder", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pictureIds: ["pic-2", "pic-1"] }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockedUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: "pic-2" },
      data: { order: 0 },
    });
    expect(mockedUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: "pic-1" },
      data: { order: 1 },
    });
    expect(mockedTransaction).toHaveBeenCalledWith([
      {
        where: { id: "pic-2" },
        data: { order: 0 },
      },
      {
        where: { id: "pic-1" },
        data: { order: 1 },
      },
    ]);
  });
});
