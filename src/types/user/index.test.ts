import { describe, expect, it } from "vitest";
import { userSchema } from "@/types/user";

describe("userSchema", () => {
  it("allows clearing the normal country field", () => {
    expect(userSchema.safeParse({ country: null }).success).toBe(true);
  });

  it("normalizes exact country names to ISO country codes", () => {
    const result = userSchema.safeParse({ country: "Germany", addressCountry: "United States" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        country: "DE",
        addressCountry: "US",
      });
    }
  });

  it("rejects countries outside the supported country list", () => {
    expect(userSchema.safeParse({ country: "Narnia" }).success).toBe(false);
  });
});
