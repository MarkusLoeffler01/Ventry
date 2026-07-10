import { z } from "zod";
import { COUNTRIES, isCountryCode, normalizeCountryCode } from "@/lib/countries";

const MAX_COUNTRY_INPUT_LENGTH = Math.max(
  2,
  ...COUNTRIES.map((country) => country.name.length),
);

export const requiredCountryCodeSchema = z
  .string()
  .trim()
  .min(1, "Country is required")
  .max(MAX_COUNTRY_INPUT_LENGTH, "Country is too long")
  .transform((value) => normalizeCountryCode(value) ?? value.toUpperCase())
  .refine((value) => isCountryCode(value), "Select a valid country");

export const optionalCountryCodeSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  requiredCountryCodeSchema.nullable().optional(),
);
