import { z } from "zod";

// Enhanced user schema with new profile fields
export const enhancedUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.email().optional(),
  bio: z.string().max(500).optional(),
  dateOfBirth: z.string().date().optional(), // ISO date string (YYYY-MM-DD)
  pronouns: z.string().max(50).optional(),
  profilePicture: z.string().url().nullable().optional(),
  // Privacy settings
  showAge: z.boolean().optional(),
});

export const profileUpdateSchema = enhancedUserSchema.partial();

export type EnhancedUser = z.infer<typeof enhancedUserSchema> & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

// GDPR data export type
export type UserDataExport = {
  profile: EnhancedUser;
  registrations?: Record<string, unknown>[];
  payments?: Record<string, unknown>[];
  events?: Record<string, unknown>[];
  exportedAt: string;
};