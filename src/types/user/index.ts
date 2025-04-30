import { z } from "zod";

// Define user validation schema
const userSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  profilePicture: z.string().url().nullable().optional(),
});

const createUserSchema = userSchema.extend({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
}).strict();


export { userSchema, createUserSchema };