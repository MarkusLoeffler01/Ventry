"use server";

import { auth } from "@/app/api/auth/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

/**
 * Check if user has pending account link requests after login
 * and redirect to link-account page if they do
 */
export async function checkPendingLinksAndRedirect() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return null;
  }

  // Check if user has any pending link requests
  const pendingLinks = await prisma.pendingAccountLink.findMany({
    where: {
      userId: session.user.id,
      expiresAt: {
        gt: new Date()
      }
    }
  });

  if (pendingLinks.length > 0) {
    redirect("/link-account");
  }

  return null;
}
