import { z } from "zod";

const registerSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email("Ungültige E-Mail-Adresse"),
    username: z
      .string()
      .trim()
      .min(3, "Mindestens 3 Zeichen erforderlich"),
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