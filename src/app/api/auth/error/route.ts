import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '../../../../lib/prisma';
import { createRedirectUrl } from '../../../../lib/auth/url';

/**
 * Custom error handler for better-auth OAuth errors
 * 
 * Intercepts account_not_linked errors and redirects to password prompt
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    // Development logging only
    if (process.env.NODE_ENV === 'development') {
        console.log('=== AUTH ERROR HANDLER ===');
        console.log('Auth error:', { error, errorDescription });
        const cookieStore = await cookies();
        console.log('Cookies count:', cookieStore.getAll().length);
    }

    // Detect account linking errors
    if (error === 'account_not_linked') {
        const cookieStore = await cookies();
        
        // Extract provider from various sources
        let provider = cookieStore.get('oauth_attempt_provider')?.value || 'oauth';
        
        const referer = request.headers.get('referer') || '';
        const requestUrl = request.url;
        const requestMatch = requestUrl.match(/provider=(google|github)/);
        if (requestMatch) {
            provider = requestMatch[1];
        }
        
        // Check referer for OAuth provider
        if (provider === 'oauth') {
            if (referer.includes('accounts.google.com') || referer.includes('google.com')) {
                provider = 'google';
            } else if (referer.includes('github.com')) {
                provider = 'github';
            }
        }
        
        // Check callback cookie
        const callbackUrl = cookieStore.get('__Secure-VENTRY.callback-url')?.value;
        if (callbackUrl) {
            const callbackMatch = callbackUrl.match(/callback\/(google|github)/);
            if (callbackMatch) {
                provider = callbackMatch[1];
            }
        }
        
        // Try to get email from multiple sources
        let oauthEmail = cookieStore.get('oauth_attempt_email')?.value;
        
        // From error description
        if (!oauthEmail && errorDescription) {
            const emailMatch = errorDescription.match(/[\w.-]+@[\w.-]+\.\w+/);
            if (emailMatch) {
                oauthEmail = emailMatch[0];
            }
        }
        
        // From URL parameters
        if (!oauthEmail) {
            oauthEmail = searchParams.get('email') || undefined;
        }
        
        // Last resort: Query database
        if (!oauthEmail) {
            try {
                const allUsers = await prisma.user.findMany({
                    where: {
                        NOT: {
                            accounts: {
                                some: { providerId: provider }
                            }
                        }
                    },
                    orderBy: { updatedAt: 'desc' },
                    take: 1,
                    select: { email: true }
                });
                
                if (allUsers[0]?.email) {
                    oauthEmail = allUsers[0].email;
                }
            } catch (err) {
                if (process.env.NODE_ENV === 'development') {
                    console.error('Error querying database for email:', err);
                }
            }
        }
        
        if (process.env.NODE_ENV === 'development') {
            console.log('Provider:', provider, 'Email:', oauthEmail);
        }
        
        // Redirect to password prompt if we have email
        if (oauthEmail) {
            return NextResponse.redirect(
                createRedirectUrl(`/login?link_required=true&link_provider=${provider}&email=${encodeURIComponent(oauthEmail)}`, request)
            );
        }
        
        // Fallback redirect
        return NextResponse.redirect(
            createRedirectUrl(`/login?account_exists=true&provider=${provider}`, request)
        );
    }



    // For other errors, show a generic error page
    return new NextResponse(
        `<!DOCTYPE html>
<html>
<head>
    <title>Authentication Error</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: #f5f5f5;
        }
        .error-container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            max-width: 500px;
            text-align: center;
        }
        h1 { color: #d32f2f; margin-top: 0; }
        p { color: #666; line-height: 1.5; }
        a {
            display: inline-block;
            margin-top: 1rem;
            padding: 0.75rem 1.5rem;
            background: #1976d2;
            color: white;
            text-decoration: none;
            border-radius: 4px;
        }
        a:hover { background: #1565c0; }
    </style>
</head>
<body>
    <div class="error-container">
        <h1>Authentication Error</h1>
        <p><strong>Error:</strong> ${error || 'Unknown error'}</p>
        ${errorDescription ? `<p>${errorDescription}</p>` : ''}
        <a href="/login">Back to Login</a>
    </div>
</body>
</html>`,
        {
            status: 200,
            headers: {
                'Content-Type': 'text/html',
            },
        }
    );
}
