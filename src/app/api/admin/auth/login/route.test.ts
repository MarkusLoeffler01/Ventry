import { describe, expect, it } from "vitest";
import * as adminLoginRoute from "@/app/api/admin/auth/login/route";

describe("App Router: /api/admin/auth/login", () => {
  it("returns a permanent deprecation response", async () => {
    const response = await adminLoginRoute.POST();

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      error: "Admin login moved to NextAuth",
      message: "Please use /login to authenticate and ensure your account has admin privileges",
      redirect: "/login",
    });
  });
});
