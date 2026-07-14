import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: { findFirst: vi.fn() },
  usernameHistory: { findFirst: vi.fn() },
}));

vi.mock("@/lib/prisma/prisma", () => ({
  default: prismaMock,
  prisma: prismaMock,
}));

import { isUsernameAvailable, resolveUniqueUsername, sanitizeUsername } from "./unique-name";

beforeEach(() => {
  prismaMock.user.findFirst.mockReset();
  prismaMock.usernameHistory.findFirst.mockReset();
});

describe("sanitizeUsername", () => {
  it("collapses spaces into a single hyphen", () => {
    expect(sanitizeUsername("Jane Doe")).toBe("Jane-Doe");
  });

  it("collapses multiple/leading/trailing whitespace", () => {
    expect(sanitizeUsername("  Jane   Doe  ")).toBe("Jane-Doe");
  });

  it("leaves a space-free name unchanged", () => {
    expect(sanitizeUsername("JaneDoe")).toBe("JaneDoe");
  });
});

describe("isUsernameAvailable", () => {
  it("is available when no user or reservation holds it", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.usernameHistory.findFirst.mockResolvedValue(null);
    await expect(isUsernameAvailable("jane-doe")).resolves.toBe(true);
  });

  it("is unavailable when a live user already has it", async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: "u1" });
    prismaMock.usernameHistory.findFirst.mockResolvedValue(null);
    await expect(isUsernameAvailable("jane-doe")).resolves.toBe(false);
  });

  it("is unavailable when a non-expired reservation holds it", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.usernameHistory.findFirst.mockResolvedValue({ id: "h1" });
    await expect(isUsernameAvailable("jane-doe")).resolves.toBe(false);
  });

  it("excludes the acting user from both conflict checks", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.usernameHistory.findFirst.mockResolvedValue(null);
    await isUsernameAvailable("jane-doe", "user-1");
    expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
      where: { username: "jane-doe", id: { not: "user-1" } },
      select: { id: true },
    });
    expect(prismaMock.usernameHistory.findFirst).toHaveBeenCalledWith({
      where: { username: "jane-doe", expiresAt: { gt: expect.any(Date) }, userId: { not: "user-1" } },
      select: { id: true },
    });
  });
});

describe("resolveUniqueUsername", () => {
  it("sanitizes spaces out of the candidate before checking availability", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.usernameHistory.findFirst.mockResolvedValue(null);
    await expect(resolveUniqueUsername("Jane Doe")).resolves.toBe("Jane-Doe");
    expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
      where: { username: "Jane-Doe" },
      select: { id: true },
    });
  });

  it("returns the candidate unchanged when it's free", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.usernameHistory.findFirst.mockResolvedValue(null);
    await expect(resolveUniqueUsername("JaneDoe")).resolves.toBe("JaneDoe");
    expect(prismaMock.user.findFirst).toHaveBeenCalledTimes(1);
  });

  it("appends a hyphenated numeric suffix when the candidate is taken", async () => {
    prismaMock.usernameHistory.findFirst.mockResolvedValue(null);
    prismaMock.user.findFirst
      .mockResolvedValueOnce({ id: "existing-user" }) // "Jane-Doe" taken
      .mockResolvedValueOnce(null); // "Jane-Doe-2" free
    await expect(resolveUniqueUsername("Jane Doe")).resolves.toBe("Jane-Doe-2");
  });

  it("keeps incrementing the suffix past collisions", async () => {
    prismaMock.usernameHistory.findFirst.mockResolvedValue(null);
    prismaMock.user.findFirst
      .mockResolvedValueOnce({ id: "u1" }) // "Jane-Doe"
      .mockResolvedValueOnce({ id: "u2" }) // "Jane-Doe-2"
      .mockResolvedValueOnce(null); // "Jane-Doe-3" free
    await expect(resolveUniqueUsername("Jane Doe")).resolves.toBe("Jane-Doe-3");
  });

  it("also treats a reserved (recently-changed-away-from) username as taken", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.usernameHistory.findFirst
      .mockResolvedValueOnce({ id: "h1" }) // "Jane-Doe" reserved
      .mockResolvedValueOnce(null); // "Jane-Doe-2" free
    await expect(resolveUniqueUsername("Jane Doe")).resolves.toBe("Jane-Doe-2");
  });

  it("falls back to a random hyphenated suffix if every numeric attempt is taken", async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: "always-taken" });
    prismaMock.usernameHistory.findFirst.mockResolvedValue(null);
    const result = await resolveUniqueUsername("Jane Doe");
    expect(result).toMatch(/^Jane-Doe-[0-9a-f]{8}$/);
  });
});
