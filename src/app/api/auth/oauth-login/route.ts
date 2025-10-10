import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createRedirectUrl } from '@/lib/auth/url';

/**
 * Custom OAuth handler for login page
 * 
 * This intercepts OAuth sign-in attempts and creates PendingAccountLink
 * when an account with the email already exists.
 * 
 * Flow:
 * 1. User clicks "Sign in with Google/GitHub" on login page
 * 2. OAuth callback comes here with user profile data
 * 3. Check if account with email exists
 * 4. If yes → Create PendingAccountLink → Redirect to login with password prompt
 * 5. If no → Continue normal OAuth sign-in
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get('provider') as 'google' | 'github' | null;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
        return NextResponse.redirect(
            createRedirectUrl(`/login?error=${encodeURIComponent(error)}`, request)
        );
    }

    if (!provider || !code) {
        return NextResponse.redirect(
            createRedirectUrl('/login?error=invalid_oauth', request)
        );
    }

    try {
        // Exchange code for tokens using better-auth client
        // This will fail if account exists due to accountLinking.enabled: false
        const response = await fetch(`${process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL}/api/auth/callback/${provider}?code=${code}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();

        // Check if we got an account exists error
        if (data.error?.message?.includes('already exists') || 
            data.error?.message?.includes('Account with this email')) {
            
            // Extract email from error or fetch from provider
            const email = data.user?.email || data.email;
            
            if (email) {
                // Find user with this email
                const user = await prisma.user.findUnique({
                    where: { email }
                });

                if (user) {
                    // Create pending link with minimal data
                    // (We'll need to re-OAuth to get full tokens later)
                    await prisma.pendingAccountLink.create({
                        data: {
                            userId: user.id,
                            accountId: `pending_${provider}_${Date.now()}`, // Temporary ID until account is created
                            provider,
                            providerAccountId: '', // Will be filled on confirmation
                            providerEmail: email,
                            emailVerified: true,
                            accessToken: null,
                            refreshToken: null,
                            idToken: null,
                            tokenExpiresAt: null,
                            scope: null,
                            expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
                        }
                    });

                    // Redirect to login with password prompt
                    return NextResponse.redirect(
                        createRedirectUrl(`/login?link_required=true&provider=${provider}&email=${encodeURIComponent(email)}`, request)
                    );
                }
            }
        }

        // Success or other error - redirect appropriately
        if (response.ok) {
            return NextResponse.redirect(createRedirectUrl('/dashboard', request));
        } else {
            return NextResponse.redirect(
                createRedirectUrl(`/login?error=${encodeURIComponent(data.error?.message || 'oauth_failed')}`, request)
            );
        }

    } catch (error) {
        console.error('OAuth login error:', error);
        return NextResponse.redirect(
            createRedirectUrl('/login?error=oauth_failed', request)
        );
    }
}
