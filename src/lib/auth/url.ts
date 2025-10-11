import type { NextRequest } from 'next/server';

/**
 * Get the correct base URL for redirects
 * 
 * Priority:
 * 1. BETTER_AUTH_URL environment variable
 * 2. X-Forwarded-Host header (from reverse proxy)
 * 3. Hardcoded fallback
 * 
 * This ensures redirects use the correct external URL (e.g., https://local.dev:3443)
 * instead of the internal server URL (e.g., http://localhost:3000)
 */
export function getBaseUrl(request?: NextRequest): string {
    // Priority 1: Environment variable
    const envUrl = process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL;
    if (envUrl) {
        return envUrl;
    }

    // Priority 2: X-Forwarded headers (from reverse proxy like Caddy)
    if (request) {
        const forwardedHost = request.headers.get('x-forwarded-host');
        const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
        
        if (forwardedHost) {
            return `${forwardedProto}://${forwardedHost}`;
        }
    }

    // Priority 3: Hardcoded fallback
    return 'https://local.dev:3443';
}

/**
 * Create a redirect URL using the correct base URL
 * 
 * @param path - The path to redirect to (e.g., '/login?error=...')
 * @param request - Optional NextRequest to extract forwarded headers
 * @returns A complete URL for redirect
 */
export function createRedirectUrl(path: string, request?: NextRequest): URL {
    const baseUrl = getBaseUrl(request);
    return new URL(path, baseUrl);
}
