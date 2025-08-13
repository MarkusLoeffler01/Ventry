import { z } from 'zod';


// Client 
export const eventResponseSchema = z.object({
    id: z.string(),
    name: z.string(),
    startDate: z.date(),
    endDate: z.date(),
    imageUrl: z.string().nullable()
});

// POST
export const adminEventSchema = z.object({
    name: z.string().min(3, "Event name must be at least 3 characters long"),
    description: z.string().min(3, "Event description must be at least 3 characters long"),
});