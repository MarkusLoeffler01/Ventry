import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma/prisma';

interface LinkCallbackPageProps {
    searchParams: Promise<{
        error?: string;
    }>;
}

/**
 * OAuth Linking Callback Handler (SECURE VERSION)
 * 
 * This page implements secure OAuth account linking by creating a PendingAccountLink
 * that requires password verification before the account is actually linked.
 * 
 * This prevents account takeover attacks where:
 * 1. Attacker knows victim's email
 * 2. Attacker tries to link their OAuth account to victim's account
 * 3. Without password verification, attacker would gain access
 * 
 * Flow:
 * 1. User clicks "Link Google/GitHub" in profile → OAuth flow starts
 * 2. OAuth completes → better-auth tries to create account
 * 3. This callback intercepts → Creates PendingAccountLink instead
 * 4. User must verify with password on /link-account page
 * 5. Only then is the OAuth account actually linked
 */
export default async function LinkCallbackPage({ searchParams }: LinkCallbackPageProps) {
    const params = await searchParams;
    
    // Handle OAuth errors
    if (params.error) {
        console.error('OAuth linking error:', params.error);
        redirect(`/profile?error=${encodeURIComponent(params.error)}`);
    }

    // Get current session
    const session = await getSession();

    if (!session?.user?.id) {
        redirect('/login?error=session_expired');
    }

    // NEW APPROACH: Check if account was just created, move it to pending
    const recentOAuthAccount = await prisma.account.findFirst({
        where: {
            userId: session.user.id,
            providerId: { in: ['github', 'google'] },
            createdAt: {
                gte: new Date(Date.now() - 10000) // Created in last 10 seconds
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    if (recentOAuthAccount) {
        // This looks like a fresh OAuth link attempt

        // Check if user already has this provider
        const existingProviderAccount = await prisma.account.findFirst({
            where: {
                userId: session.user.id,
                providerId: recentOAuthAccount.providerId,
                id: { not: recentOAuthAccount.id } // Not the one just created
            }
        });

        if (existingProviderAccount) {
            // Already have this provider! Delete the duplicate
            await prisma.account.delete({ where: { id: recentOAuthAccount.id } });
            redirect('/profile?error=already_linked');
        }

        // Get user's email for the pending link
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { email: true }
        });

        if (!user) {
            redirect('/profile?error=user_not_found');
        }

        // Create pending link (will be converted to actual account after password verification)
        await prisma.pendingAccountLink.create({
            data: {
                userId: session.user.id,
                accountId: recentOAuthAccount.id, // Store the account ID for reference
                provider: recentOAuthAccount.providerId,
                providerAccountId: recentOAuthAccount.accountId,
                providerEmail: user.email,
                emailVerified: true,
                accessToken: recentOAuthAccount.accessToken,
                refreshToken: recentOAuthAccount.refreshToken,
                idToken: recentOAuthAccount.idToken,
                tokenExpiresAt: recentOAuthAccount.accessTokenExpiresAt 
                    ? Math.floor(recentOAuthAccount.accessTokenExpiresAt.getTime() / 1000) 
                    : null,
                scope: recentOAuthAccount.scope,
                expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
            }
        });

        // Delete the OAuth account (we'll recreate it after password verification)
        await prisma.account.delete({
            where: { id: recentOAuthAccount.id }
        });

        // Redirect to link-account page for password verification
        redirect('/link-account');
    }

    // No recent OAuth account - might be an error or normal sign-in
    redirect('/profile');
}
