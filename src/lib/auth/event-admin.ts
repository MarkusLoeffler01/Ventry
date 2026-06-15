import { checkAdminAuth } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma/prisma";

type EventAdminAuthResult = {
  authorized: boolean;
  error?: string;
  adminId?: string;
  event?: {
    id: number;
    name: string;
  };
  user?: {
    id: string;
    email: string;
  };
};

/**
 * Authorizes admin users for a specific event.
 * If an event has an owner, only that owner can manage event-specific admin data.
 */
export async function checkEventAdminAuth(
  eventId: number,
  requestHeaders?: Headers,
): Promise<EventAdminAuthResult> {
  const adminAuth = await checkAdminAuth(requestHeaders);
  if (!adminAuth.authorized) {
    return { authorized: false, error: adminAuth.error || "Admin access required" };
  }

  if (!adminAuth.adminId) {
    return { authorized: false, error: "Admin profile is missing" };
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      ownerId: true,
    },
  });

  if (!event) {
    return { authorized: false, error: "Event not found" };
  }

  if (event.ownerId && event.ownerId !== adminAuth.adminId) {
    return { authorized: false, error: "Only this event's admin can manage this event" };
  }

  return {
    authorized: true,
    adminId: adminAuth.adminId,
    user: adminAuth.user,
    event: {
      id: event.id,
      name: event.name,
    },
  };
}
