// Force Node.js runtime for better-auth to use bcrypt
export const runtime = 'nodejs';

import { GET as BetterAuthGET, POST as BetterAuthPOST } from "../auth";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

/**
 * Wrapper for GET requests to OAuth callbacks
 * 
 * Checks for allow_oauth_linking cookie when account linking is attempted.
 * This enforces password verification before allowing account linking.
 */
export async function GET(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    
    // Check if this is an OAuth callback
    const isOAuthCallback = pathname.includes('/callback/google') || pathname.includes('/callback/github');
    
    if (isOAuthCallback) {
        const cookieStore = await cookies();
        const linkingCookie = cookieStore.get('allow_oauth_linking');
        
        // Development logging only
        if (process.env.NODE_ENV === 'development') {
            const stateCookie = cookieStore.get('__Secure-VENTRY.state');
            console.log('=== OAUTH CALLBACK INTERCEPTOR ===');
            console.log('Path:', pathname);
            console.log('Linking cookie:', linkingCookie?.value);
            console.log('State cookie:', stateCookie?.value);
            console.log('All cookies:', cookieStore.getAll().map(c => c.name));
        }
        
        // If no linking cookie, this might be a first-time OAuth attempt
        // Let better-auth handle it - it will return account_not_linked if needed
        // The error handler will then show the password prompt
        
        if (linkingCookie) {
            try {
                const linkingData = JSON.parse(linkingCookie.value);
                const provider = pathname.includes('/google') ? 'google' : 'github';
                
                if (process.env.NODE_ENV === 'development') {
                    console.log('Linking authorized for user:', linkingData.userId, 'provider:', linkingData.provider);
                    console.log('Current OAuth provider:', provider);
                }
                
                // Verify the cookie is for the correct provider
                if (linkingData.provider !== provider) {
                    if (process.env.NODE_ENV === 'development') {
                        console.warn('⚠️  Provider mismatch - cookie is for', linkingData.provider, 'but OAuth is', provider);
                    }
                    cookieStore.delete('allow_oauth_linking');
                    // Let better-auth handle it normally (will likely return account_not_linked)
                    return BetterAuthGET(request);
                }
                
                // Cookie exists and matches - allow linking by letting better-auth proceed
                // After successful linking, delete the cookie
                const response = await BetterAuthGET(request);
                
                // Check if linking was successful (no error in response)
                // If successful, clean up the authorization cookie
                if (response.status === 200 || response.status === 302) {
                    const cookieStore = await cookies();
                    cookieStore.delete('allow_oauth_linking');
                    if (process.env.NODE_ENV === 'development') {
                        console.log('✅ OAuth linking completed, cookie cleaned up');
                    }
                }
                
                return response;
            } catch (err) {
                console.error('Error parsing linking cookie:', err);
                // Invalid cookie - delete it and let better-auth handle normally
                cookieStore.delete('allow_oauth_linking');
            }
        }
    }
    
    // For all other requests, pass through directly
    return BetterAuthGET(request);
}

/**
 * Pass through POST requests directly to better-auth
 */
export async function POST(request: NextRequest) {
    return BetterAuthPOST(request);
}