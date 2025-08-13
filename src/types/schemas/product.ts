import { z } from "zod";

// Client product view schema
export const productResponseSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    price: z.number(),
    imageUrl: z.string().nullable().optional()
});

// Admin product creation schema
export const adminProductCreateSchema = z.object({
    name: z.string().min(3, "Product name must be at least 3 characters"),
    description: z.string().min(3, "Product description must be at least 3 characters"),
    price: z.number().positive("Price must be a positive number"),
    imageUrl: z.string().url("Invalid URL").optional().nullable(),
});

// Admin product update schema
export const adminProductUpdateSchema = adminProductCreateSchema.partial();

