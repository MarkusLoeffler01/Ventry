// Force Node.js runtime for better-auth to use bcrypt
export const runtime = 'nodejs';

import { GET as BetterAuthGET, POST as BetterAuthPOST } from "../auth";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

/**
 * Wrapper for GET requests to OAuth callbacks
 * 
 * Intercepts OAuth callbacks to implement secure account linking:
 * - If linking cookie present: Allow better-auth to link, then redirect to confirmation
 * - If no cookie: Block linking, redirect to password verification
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
            console.log('=== OAUTH CALLBACK INTERCEPTOR ===');
            console.log('Path:', pathname);
            console.log('Linking cookie:', linkingCookie?.value);
        }
        
        // If linking cookie exists, this is an authorized account linking attempt
        if (linkingCookie) {
            try {
                const linkingData = JSON.parse(linkingCookie.value);
                const provider = pathname.includes('/google') ? 'google' : 'github';
                
                if (process.env.NODE_ENV === 'development') {
                    console.log('🔗 Authorized account linking for user:', linkingData.userId, 'provider:', provider);
                }
                
                // Verify the cookie is for the correct provider
                if (linkingData.provider !== provider) {
                    if (process.env.NODE_ENV === 'development') {
                        console.warn('⚠️  Provider mismatch');
                    }
                    cookieStore.delete('allow_oauth_linking');
                    return BetterAuthGET(request);
                }
                
                // Let better-auth handle the OAuth callback and link the account
                const response = await BetterAuthGET(request);
                
                // Clean up cookie after handling
                cookieStore.delete('allow_oauth_linking');
                
                if (process.env.NODE_ENV === 'development') {
                    console.log('✅ Account linked by better-auth, response status:', response.status);
                }
                
                // If successful (redirect), change destination to our confirmation page
                if (response.status === 302 || response.status === 301) {
                    const location = response.headers.get('location');
                    if (process.env.NODE_ENV === 'development') {
                        console.log('Original redirect:', location);
                    }
                    // Redirect to profile with success message instead
                    return Response.redirect(new URL('/profile?linked=success', request.url));
                }
                
                return response;
            } catch (err) {
                console.error('Error handling linking callback:', err);
                cookieStore.delete('allow_oauth_linking');
            }
        } else {
            // No linking cookie - this might be an unauthorized linking attempt
            // Check if this would be a linking scenario (user already logged in)
            const response = await BetterAuthGET(request);
            
            // If better-auth returns account_not_linked error, intercept it
            if (response.status === 302 || response.status === 301) {
                const location = response.headers.get('location');
                if (location?.includes('error=account_not_linked')) {
                    // Extract email and provider from the error redirect
                    const url = new URL(location, request.url);
                    const email = url.searchParams.get('email');
                    const provider = pathname.includes('/google') ? 'google' : 'github';
                    
                    if (process.env.NODE_ENV === 'development') {
                        console.log('⛔ Unauthorized linking attempt blocked, redirecting to verification');
                    }
                    
                    // Redirect to our password verification page instead
                    return Response.redirect(
                        new URL(`/link-account/verify?provider=${provider}&email=${email || ''}`, request.url)
                    );
                }
            }
            
            return response;
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