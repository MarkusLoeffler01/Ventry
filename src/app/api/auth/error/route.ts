import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '../../../../lib/prisma';
import { createRedirectUrl, getBaseUrl } from '@/lib/auth/url';

/**
 * Custom error handler for better-auth OAuth errors
 * 
 * Intercepts account_not_linked errors and redirects to password prompt
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    // Log all headers and params for debugging
    console.log('=== AUTH ERROR HANDLER ===');
    console.log('Auth error:', { error, errorDescription });
    console.log('All search params:', Object.fromEntries(searchParams.entries()));
    console.log('Referer:', request.headers.get('referer'));
    console.log('Host header:', request.headers.get('host'));
    console.log('X-Forwarded-Host:', request.headers.get('x-forwarded-host'));
    console.log('X-Forwarded-Proto:', request.headers.get('x-forwarded-proto'));
    console.log('request.nextUrl.href:', request.nextUrl.href);
    console.log('request.nextUrl.origin:', request.nextUrl.origin);
    console.log('request.nextUrl.host:', request.nextUrl.host);
    console.log('request.url:', request.url);
    
    // Get all cookies
    const cookieStore = await cookies();
    console.log('All cookies:', cookieStore.getAll().map(c => ({ name: c.name, value: c.value?.substring(0, 50) })));

    // Detect account linking errors
    if (error === 'account_not_linked') {
        // Extract provider - check cookies first, then referer
        const cookieStore = await cookies();
        let provider = cookieStore.get('oauth_attempt_provider')?.value || 'oauth';
        
        // Get referer and extract provider from callback URL
        const referer = request.headers.get('referer') || '';
        
        // Check if the request URL itself has the provider (from better-auth internal redirect)
        const requestUrl = request.url;
        const requestMatch = requestUrl.match(/provider=(google|github)/);
        if (requestMatch) {
            provider = requestMatch[1];
        }
        
        // Also check if referer is from Google/GitHub OAuth
        if (provider === 'oauth') {
            if (referer.includes('accounts.google.com') || referer.includes('google.com')) {
                provider = 'google';
            } else if (referer.includes('github.com')) {
                provider = 'github';
            }
        }
        
        // Check previous request from cookie
        const callbackUrl = cookieStore.get('__Secure-better-auth.callback-url')?.value;
        if (callbackUrl) {
            const callbackMatch = callbackUrl.match(/callback\/(google|github)/);
            if (callbackMatch) {
                provider = callbackMatch[1];
            }
        }
        
        console.log('Account not linked, provider:', provider);
        console.log('Referer:', referer);
        console.log('Request URL:', requestUrl);
        
        // Get the correct base URL (respects env vars and forwarded headers)
        const baseUrl = getBaseUrl(request);
        console.log('Using baseUrl:', baseUrl);
        
        // Try multiple sources for the email:
        
        // 1. From cookies (set by our OAuth wrapper)
        let oauthEmail = cookieStore.get('oauth_attempt_email')?.value;
        
        // 2. From error description (if better-auth includes it)
        if (!oauthEmail && errorDescription) {
            const emailMatch = errorDescription.match(/[\w.-]+@[\w.-]+\.\w+/);
            if (emailMatch) {
                oauthEmail = emailMatch[0];
                console.log('Extracted email from error description:', oauthEmail);
            }
        }
        
        // 3. From URL parameters
        if (!oauthEmail) {
            oauthEmail = searchParams.get('email') || undefined;
        }
        
        console.log('OAuth email:', oauthEmail);
        console.log('Provider:', provider);
        
        // 4. LAST RESORT: Query database for the email
        // When better-auth returns account_not_linked, it means it found a user
        // Look for users that exist but don't have this OAuth provider linked
        if (!oauthEmail) {
            try {
                console.log('Attempting database lookup for provider:', provider);
                
                // Find users who don't have this provider linked
                // Query all users and filter for those without this provider
                const allUsers = await prisma.user.findMany({
                    where: {
                        // No account with this providerId exists for this user
                        NOT: {
                            accounts: {
                                some: {
                                    providerId: provider
                                }
                            }
                        }
                    },
                    orderBy: {
                        updatedAt: 'desc'
                    },
                    take: 10, // Get top 10 most recent
                    select: {
                        email: true,
                        updatedAt: true
                    }
                });
                
                // Find the first one with an email
                const recentUser = allUsers.find(u => u.email);
                
                if (recentUser?.email) {
                    oauthEmail = recentUser.email;
                    console.log('Found email from database:', oauthEmail, 'updated:', recentUser.updatedAt);
                }
            } catch (err) {
                console.error('Error querying database for email:', err);
            }
        }
        
        console.log('FINAL OAuth email:', oauthEmail);
        console.log('FINAL Provider:', provider);
        
        // If we have the email, show password prompt on login page
        if (oauthEmail) {
            return NextResponse.redirect(
                createRedirectUrl(`/login?link_required=true&link_provider=${provider}&email=${encodeURIComponent(oauthEmail)}`, request)
            );
        }
        
        // Fallback: redirect to login with simple message
        // User will log in manually and then link from profile
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
