import { z } from "zod";

// Define user validation schema
const userSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.email().optional(),
  password: z.string().min(8).optional(),
  profilePicture: z.url().nullable().optional(),
  bio: z.string().max(500).optional(),
  dateOfBirth: z.string().optional(),
  pronouns: z.string().max(50).optional(),
  showAge: z.boolean().optional(),
});

const createUserSchema = userSchema.extend({
  name: z.string().min(2),
  email: z.email(),
  password: z.string().min(8),
}).strict();


export { userSchema, createUserSchema };