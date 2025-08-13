import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

// Mock deps BEFORE importing the route
vi.mock("@/types/schemas/auth", () => ({
  loginSchema: { safeParse: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/bcrypt", () => ({
  comparePassword: vi.fn(),
}));

vi.mock("@/lib/helpers/jsonwebtoken", () => ({
  default: {
    sign: vi.fn(),
  },
}));

// We'll dynamically import the route after setting env (ESM static imports run before code executes)
// Type as the actual module to satisfy typings
let loginRoute: typeof import("@/app/api/auth/login/route");
beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
  loginRoute = await import("@/app/api/auth/login/route");
});
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/types/schemas/auth";
import * as bcrypt from "@/lib/bcrypt";
import jwtService from "@/lib/helpers/jsonwebtoken";

const mockedSafeParse = loginSchema.safeParse as unknown as ReturnType<typeof vi.fn>;
const mockedFindUnique = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockedCompare = bcrypt.comparePassword as unknown as ReturnType<typeof vi.fn>;
const mockedSign = (jwtService.sign as unknown) as ReturnType<typeof vi.fn>;

describe("App Router: /api/auth/login (route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("400: rejects non-JSON content-type", async () => {
    await testApiHandler({
      appHandler: loginRoute,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "content-type": "text/plain" },
          body: "email=a&password=b",
        });
        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ error: "Invalid content type" });
      },
    });
  });

  it("400: invalid JSON body", async () => {
    await testApiHandler({
      appHandler: loginRoute,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "content-type": "application/json" },
          // This will fail JSON.parse in req.json()
          body: "not-json",
        });
        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ error: "Invalid json" });
      },
    });
  });

  it("400: validation error from zod", async () => {
    const details = { email: { _errors: ["Invalid email"] } };
    mockedSafeParse.mockReturnValue({ success: false as const, error: { format: () => details } });

    await testApiHandler({
      appHandler: loginRoute,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: "bad", password: "short" }),
        });
        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ error: "Validation error", details });
        expect(mockedFindUnique).not.toHaveBeenCalled();
      },
    });
  });

  it("401: invalid credentials when user not found", async () => {
    const data = { email: "user@example.com", password: "password123" };
  mockedSafeParse.mockReturnValue({ success: true as const, data });
    mockedFindUnique.mockResolvedValue(null);

    await testApiHandler({
      appHandler: loginRoute,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(data),
        });
        expect(res.status).toBe(401);
        expect(await res.json()).toEqual({ error: "Invalid credentials" });
      },
    });
  });

  it("401: invalid credentials when password mismatch", async () => {
    const data = { email: "user@example.com", password: "password123" };
    const user = { id: "u1", email: data.email, password: "hashed" };
  mockedSafeParse.mockReturnValue({ success: true as const, data });
    mockedFindUnique.mockResolvedValue(user);
    mockedCompare.mockResolvedValue(false);

    await testApiHandler({
      appHandler: loginRoute,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(data),
        });
        expect(res.status).toBe(401);
        expect(await res.json()).toEqual({ error: "Invalid credentials" });
      },
    });
  });

  it("200: logs in and sets token cookie", async () => {
    const data = { email: "user@example.com", password: "password123" };
    const user = { id: "u1", email: data.email, password: "hashed" };
  mockedSafeParse.mockReturnValue({ success: true as const, data });
    mockedFindUnique.mockResolvedValue(user);
    mockedCompare.mockResolvedValue(true);
    mockedSign.mockReturnValue("tok123");

    await testApiHandler({
      appHandler: loginRoute,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(data),
        });
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ message: "Login successful" });

        // Ensure JWT sign was called correctly
        expect(mockedSign).toHaveBeenCalledWith({ userId: user.id, email: user.email }, { expiresIn: "7d" });

        // Check cookie header contains token
        const setCookie = res.headers.get("set-cookie");
        expect(setCookie).toBeTruthy();
        expect(setCookie!).toContain("token=");
      },
    });
  });
});
