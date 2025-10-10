import { z } from 'zod';

/**
 * User self-registration schema
 * POST /api/auth/register
 */
export const userSelfCreateSchema = z.object({
    name: z.string().min(3, "Username must be at least 3 characters long"),
    email: z.string().email("Invalid email address"),
    password: z.string()
      .min(8, "Password must be at least 8 characters")
      .refine(
        (password) => /[A-Z]/.test(password),
        "Password must contain at least one uppercase letter"
      )
      .refine(
        (password) => /[a-z]/.test(password),
        "Password must contain at least one lowercase letter"
      )
      .refine(
        (password) => /[0-9]/.test(password),
        "Password must contain at least one number"
      )
      .refine(
        (password) => /[^A-Za-z0-9]/.test(password),
        "Password must contain at least one special character"
    ),
});

/**
 * User login schema
 * POST /api/auth/login
 */
export const userSelfLoginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
  });
  

/**
 * User profile update schema (what a user can change about themselves)
 * PATCH /api/user/update
 */
export const userSelfUpdateSchema = z.object({
    name: z.string().min(3, "Username must be at least 3 characters long").optional(),
    profilePicture: z.string().url("Invalid URL").optional().nullable(),
    currentPassword: z.string().min(8, "Current password must be at least 8 characters long"),
    newPassword: z.string().min(8, "New password must be at least 8 characters long").optional(),
    newEmail: z.string().email("Invalid email address").optional(),
});

/**
 * User self-deletion schema
 * DELETE /api/user/delete
 */
export const userSelfDeleteSelfSchema = z.object({
    password: z.string().min(1, "Password confirmation is required"),
});

/**
 * User profile schema (for display)
 * GET /api/user/profile
 */
export const userSelfSchema = z.object({
    name: z.string().min(1, "Username is required").optional().nullable(),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    profilePicture: z.string().url("Invalid URL").optional().nullable(),
    isAdmin: z.boolean().optional(),
    emailVerified: z.boolean().optional(),
});

/**
 * Admin user update schema (what an admin can change about a user)
 * PATCH /api/admin/user/:id
 */
export const userAdminUserUpdateSchema = z.object({
    ...userSelfUpdateSchema.omit({ currentPassword: true }).shape,
    isAdmin: z.boolean().optional(),
    emailVerified: z.boolean().optional(),
});

