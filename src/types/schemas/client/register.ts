import { z } from "zod";
import { DISPLAY_NAME_MAX_LENGTH } from "@/lib/user/display-name";

const registerSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email("Ungültige E-Mail-Adresse"),
    username: z
      .string()
      .trim()
      .min(3, "Mindestens 3 Zeichen erforderlich")
      .max(DISPLAY_NAME_MAX_LENGTH, `Maximal ${DISPLAY_NAME_MAX_LENGTH} Zeichen erlaubt`),
    legalName: z
      .string()
      .trim()
      .min(2, "Legal name is required"),
    addressLine1: z
      .string()
      .trim()
      .min(2, "Address is required"),
    addressLine2: z
      .string()
      .trim()
      .optional(),
    addressCity: z
      .string()
      .trim()
      .min(2, "City is required"),
    addressState: z
      .string()
      .trim()
      .optional(),
    addressPostalCode: z
      .string()
      .trim()
      .min(2, "Postal code is required"),
    addressCountry: z
      .string()
      .trim()
      .min(2, "Country is required"),
    password: z
      .string()
      .min(8, "Mindestens 8 Zeichen erforderlich")
      .regex(/[A-Z]/, "Muss mindestens einen Großbuchstaben enthalten")
      .regex(/[0-9]/, "Muss mindestens eine Zahl enthalten"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwörter stimmen nicht überein",
  });

type RegisterSchema = z.infer<typeof registerSchema>;

export { registerSchema };

export type { RegisterSchema };
