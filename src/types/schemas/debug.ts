import { z } from "zod";

const mailSchema  = z.object({
  type: z.literal("MAIL"),
  to: z.email(),
  subject: z.string().min(1),
  message: z.string().min(1),
});

export const debugPostBodySchema = z.discriminatedUnion("type", [
  mailSchema
]);

export type PostBody = z.infer<typeof debugPostBodySchema>;