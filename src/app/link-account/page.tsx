import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import LinkAccountClient from "@/components/auth/LinkAccountClient";

export default async function LinkAccountPage() {
  // Require authentication
  const session = await getSession();
  
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
      providerId: true,  // Changed from 'provider' for better-auth
      password: true     // Check if credential account has password
    }
  });

  // Check if user has a password (in their credential account)
  const credentialAccount = userAccounts.find(a => a.providerId === 'credential');
  const hasPassword = !!credentialAccount?.password;
  const hasOAuthProviders = userAccounts.some(a => a.providerId === 'github' || a.providerId === 'google');

  return (
    <LinkAccountClient
      pendingLinks={pendingLinks}
      currentProviders={userAccounts.map(a => a.providerId)}
      hasPassword={hasPassword}
      hasOAuthProviders={hasOAuthProviders}
    />
  );
}
