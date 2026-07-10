import { z } from "zod";
import { isRealisticBirthDate } from "@/lib/user/birthdate";

export const optionalBirthDateSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "Invalid birth date")
    .refine(isRealisticBirthDate, "Birth date must be realistic")
    .nullable()
    .optional(),
);
