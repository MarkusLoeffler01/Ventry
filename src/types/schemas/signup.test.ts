import { describe, expect, it } from "vitest";
import { signUpAdditionalFieldsSchema } from "@/types/schemas/signup";

const VALID_INPUT = {
  name: "Valid Name",
  legalName: "Legal Name",
  addressLine1: "123 Main St",
  addressLine2: "Apt 4",
  addressCity: "Berlin",
  addressState: "Berlin",
  addressPostalCode: "10115",
  addressCountry: "DE",
};

describe("signUpAdditionalFieldsSchema", () => {
  it("accepts valid input and normalizes the country code", () => {
    const result = signUpAdditionalFieldsSchema.safeParse({
      ...VALID_INPUT,
      addressCountry: "de",
    });

    expect(result.success).toBe(true);
    expect(result.data?.addressCountry).toBe("DE");
  });

  it("trims whitespace from string fields", () => {
    const result = signUpAdditionalFieldsSchema.safeParse({
      ...VALID_INPUT,
      name: "  Valid Name  ",
      legalName: "  Legal Name  ",
    });

    expect(result.success).toBe(true);
    expect(result.data?.name).toBe("Valid Name");
    expect(result.data?.legalName).toBe("Legal Name");
  });

  it("accepts optional address fields being omitted or null", () => {
    const result = signUpAdditionalFieldsSchema.safeParse({
      name: "Valid Name",
      legalName: null,
      addressLine2: null,
      addressState: null,
    });

    expect(result.success).toBe(true);
  });

  it("rejects a name shorter than 2 characters", () => {
    const result = signUpAdditionalFieldsSchema.safeParse({ ...VALID_INPUT, name: "a" });

    expect(result.success).toBe(false);
  });

  it("rejects a name longer than the display name limit", () => {
    const result = signUpAdditionalFieldsSchema.safeParse({
      ...VALID_INPUT,
      name: "X".repeat(256),
    });

    expect(result.success).toBe(false);
  });

  it.each([
    ["legalName", "X".repeat(201)],
    ["addressLine1", "X".repeat(201)],
    ["addressLine2", "X".repeat(201)],
    ["addressCity", "X".repeat(121)],
    ["addressState", "X".repeat(121)],
    ["addressPostalCode", "X".repeat(41)],
  ])("rejects an overlong %s", (field, value) => {
    const result = signUpAdditionalFieldsSchema.safeParse({
      ...VALID_INPUT,
      [field]: value,
    });

    expect(result.success).toBe(false);
  });

  it("rejects an unrecognized country", () => {
    const result = signUpAdditionalFieldsSchema.safeParse({
      ...VALID_INPUT,
      addressCountry: "Narnia",
    });

    expect(result.success).toBe(false);
  });
});
