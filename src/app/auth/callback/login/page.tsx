import { redirect } from 'next/navigation';
import { connection } from "next/server";
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma/prisma';

interface LoginCallbackPageProps {
    searchParams: Promise<{
        error?: string;
        error_description?: string;
    }>;
}

export default async function LoginCallbackPage({ searchParams }: LoginCallbackPageProps) {
    await connection();
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
