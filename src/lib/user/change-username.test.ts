import { describe, it, expect, vi, beforeEach } from "vitest";

type Tx = {
  user: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  usernameHistory: { create: ReturnType<typeof vi.fn> };
};

const prismaMock = vi.hoisted(() => {
  const tx: Tx = {
    user: { findUnique: vi.fn(), update: vi.fn() },
    usernameHistory: { create: vi.fn() },
  };
  return {
    tx,
    $transaction: vi.fn(async (fn: (tx: Tx) => unknown) => fn(tx)),
  };
});

vi.mock("@/lib/prisma/prisma", () => ({
  default: prismaMock,
  prisma: prismaMock,
}));

import { changeUsername } from "./change-username";

beforeEach(() => {
  prismaMock.tx.user.findUnique.mockReset();
  prismaMock.tx.user.update.mockReset();
  prismaMock.tx.usernameHistory.create.mockReset();
});

describe("changeUsername", () => {
  it("reserves the old username for 90 days and sets the new one", async () => {
    prismaMock.tx.user.findUnique.mockResolvedValue({ username: "old-name" });

    await changeUsername("user-1", "new-name");

    expect(prismaMock.tx.usernameHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ username: "old-name", userId: "user-1" }),
    });
    const expiresAt = prismaMock.tx.usernameHistory.create.mock.calls[0][0].data.expiresAt as Date;
    const daysUntilExpiry = (expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(daysUntilExpiry).toBeGreaterThan(89);
    expect(daysUntilExpiry).toBeLessThanOrEqual(90);

    expect(prismaMock.tx.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { username: "new-name" },
    });
  });

  it("does not create a history entry when the username is unchanged", async () => {
    prismaMock.tx.user.findUnique.mockResolvedValue({ username: "same-name" });

    await changeUsername("user-1", "same-name");

    expect(prismaMock.tx.usernameHistory.create).not.toHaveBeenCalled();
    expect(prismaMock.tx.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { username: "same-name" },
    });
  });

  it("does not create a history entry for a brand-new user with no prior username", async () => {
    prismaMock.tx.user.findUnique.mockResolvedValue({ username: null });

    await changeUsername("user-1", "first-username");

    expect(prismaMock.tx.usernameHistory.create).not.toHaveBeenCalled();
    expect(prismaMock.tx.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { username: "first-username" },
    });
  });
});
