import { z } from "zod";
import { PaymentStatus } from "@/generated/prisma";

// Payment validation schema
export const paymentSchema = z.object({
    userId: z.string().min(1, "User ID is required"),
    registrationId: z.string().min(1, "Registration ID is required"),
    amount: z.number().positive("Amount must be a positive number"),
    currency: z.string().min(1, "Currency is required"),
    paymentStatus: z.nativeEnum(PaymentStatus).optional(),
    paymentProvider: z.string().optional().nullable(),
  });



/**
 * When the user creates a new payment
 * POST /api/payment/create
 */
export const userSelfCreatePaymentSchema = z.object({
    amount: z.number().positive("Amount must be a positive number"),
    currency: z.string().length(3, "Currency must be a 3-letter code (e.g., USD, EUR)"),
    paymentProvider: z.enum(["STRIPE", "PAYPAL", "BANK_TRANSFER"], {
        error: (error) => ({ message: `Invalid payment provider: ${error.message}` })
    })
});

/**
 * When an admin updates a user's payment
 * While notes is optional, it is HIGHLY recommended to include it for better tracking
 * PATCH /api/payment/update
 */
export const userAdminPaymentUpdateSchema = z.object({
    paymentStatus: z.nativeEnum(PaymentStatus).optional(),
    amount: z.number().positive("Amount must be a positive number").optional(),
    currency: z.string().length(3, "Currency must be a 3-letter code (e.g., USD, EUR)").optional(),
    paymentProvider: z.string().optional().nullable(),
    notes: z.string().optional()
});

/**
 * Payment response schema
 * This schema is used to validate the response from the server when a user creates a payment
 * GET /api/payment/:id (but often included in the registration response)
 */
export const systemPaymentResponseSchema = z.object({
    id: z.string(),
    amount: z.number(),
    currency: z.string(),
    paymentStatus: z.nativeEnum(PaymentStatus),
    paymentProvider: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
});