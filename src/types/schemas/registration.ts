import { z } from "zod";
import { RegistrationStatus } from "@/generated/prisma";

// Client registration creation schema
export const createRegistrationSchema = z.object({
  // No inputs needed - registration is created based on authenticated user
});

/**
 *  Client registration cancellation schema
 * A simple request to cancel the registration
 */ 
export const cancelRegistrationSchema = z.object({});

/**  
 * Admin registration update schema
 * This schema is used when an admin updates the registration status for an user
*/
export const adminRegistrationUpdateSchema = z.object({
  status: z.nativeEnum(RegistrationStatus),
  /**
   * Optional notes for the registration
   * Notes will be displayed in the email sent to the user
   * @example "Your registration has been updated"
   * 
   */
  notes: z.string().optional(),
});

/**
 * Registration response schema
 * This schema is used to validate the response from the server when a user registers for an event
 */
export const registrationResponseSchema = z.object({
  id: z.string(),
  ticketId: z.number(),
  status: z.nativeEnum(RegistrationStatus),
  createdAt: z.date(),
  userName: z.string().optional(),
  userEmail: z.string().email(),
});