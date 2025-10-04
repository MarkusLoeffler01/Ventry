import { auth } from "@/app/api/auth/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import LinkAccountClient from "@/components/auth/LinkAccountClient";

export default async function LinkAccountPage() {
  // Require authentication
  const session = await auth();
  
  if (!session?.user) {
    redirect("/login?callbackUrl=/link-account");
  }

  // Get pending link requests
  const pendingLinks = await prisma.pendingAccountLink.findMany({
    where: {
      userId: session.user.id,
      expiresAt: {
        gt: new Date() // Only non-expired
      }
    },
    select: {
      id: true,
      provider: true,
      providerEmail: true,
      emailVerified: true,
      createdAt: true,
      expiresAt: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Get user's current accounts
  const userAccounts = await prisma.account.findMany({
    where: {
      userId: session.user.id
    },
    select: {
      provider: true
    }
  });

  // Check if user has a password (for password verification)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      password: true
    }
  });

  const hasPassword = !!user?.password;
  const hasOAuthProviders = userAccounts.some(a => a.provider === 'github' || a.provider === 'google');

  return (
    <LinkAccountClient
      pendingLinks={pendingLinks}
      currentProviders={userAccounts.map(a => a.provider)}
      hasPassword={hasPassword}
      hasOAuthProviders={hasOAuthProviders}
    />
  );
}
