import { z } from 'zod';

export const paginationSchema = z.object({
    page: z.coerce.number().positive().default(1).optional(),
    limit: z.coerce.number().positive().default(10).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).optional().default("asc")
});