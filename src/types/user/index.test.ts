import { describe, expect, it } from "vitest";
import { userSchema } from "@/types/user";

describe("userSchema", () => {
  it("allows clearing the normal country field", () => {
    expect(userSchema.safeParse({ country: null }).success).toBe(true);
  });
});
