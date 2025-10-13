import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma/prisma';

interface LoginCallbackPageProps {
    searchParams: Promise<{
        error?: string;
        error_description?: string;
    }>;
}

/**
 * OAuth Login Callback Handler (WITH PASSWORD PROMPT)
 * 
 * This handles OAuth sign-in attempts from the login page.
 * 
 * Flow for EXISTING accounts:
 * 1. User clicks "Sign in with Google/GitHub" on login page
 * 2. OAuth completes
 * 3. better-auth checks if account exists with this email
 * 4. If yes → error "account exists"
 * 5. This callback intercepts → redirects to /login with link_required=true
 * 6. User sees password prompt on login page
 * 7. After login → check for pending links → redirect to /link-account
 * 
 * Flow for NEW accounts:
 * 1. User clicks "Sign in with Google/GitHub"
 * 2. OAuth completes
 * 3. better-auth creates new user + OAuth account
 * 4. User logged in → redirect to dashboard
 */
export default async function LoginCallbackPage({ searchParams }: LoginCallbackPageProps) {
    const params = await searchParams;
    
    // Handle better-auth's "account exists" error
    // This happens when accountLinking.enabled: false and user tries OAuth with existing email
    if (params.error) {
        const errorMsg = params.error_description || params.error;
        
        // Detect account exists scenarios
        if (errorMsg.includes('already exists') || 
            errorMsg.includes('Account with this email') ||
            params.error === 'account_exists') {
            
            // We need to create a pending link, but we don't have the OAuth tokens yet
            // So we'll just redirect to login with a special flag
            // The pending link will be created when user logs in and we detect the OAuth callback
            
            redirect('/login?link_required=true');
        }
        
        // Other OAuth errors
        console.error('OAuth login error:', params.error, params.error_description);
        redirect(`/login?error=${encodeURIComponent(params.error)}`);
    }

    // Check current session
    const session = await getSession();

    if (session?.user?.id) {
        // Successfully logged in - check for pending OAuth links
        const pendingLinks = await prisma.pendingAccountLink.findMany({
            where: {
                userId: session.user.id,
                expiresAt: { gt: new Date() }
            }
        });

        if (pendingLinks.length > 0) {
            // User has pending links - redirect to link-account page
            redirect('/link-account');
        }

        // No pending links - normal login, go to dashboard
        redirect('/dashboard');
    }

    // No session and no error - something unexpected
    redirect('/login');
}
