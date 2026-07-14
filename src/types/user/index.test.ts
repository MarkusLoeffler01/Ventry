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

  it("rejects future birth dates", () => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    expect(userSchema.safeParse({ dateOfBirth: nextYear.toISOString() }).success).toBe(false);
  });

  it("rejects birth dates older than the realistic age limit", () => {
    expect(userSchema.safeParse({ dateOfBirth: "1000-01-01T00:00:00.000Z" }).success).toBe(false);
  });
});
