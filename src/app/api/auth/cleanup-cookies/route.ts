import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Cleanup old NextAuth.js cookies after migration to better-auth
 * 
 * Usage:
 * - Visit: https://local.dev:3443/api/auth/cleanup-cookies
 * - Or: curl https://local.dev:3443/api/auth/cleanup-cookies
 */
export async function GET(req: NextRequest) {
    const query = req.nextUrl.searchParams;
    const cookieStore = await cookies();
    
    // List of old NextAuth.js cookies to remove
    const oldCookieNames = [
        '__Host-authjs.csrf-token',
        '__Secure-authjs.session-token',
        '__Secure-authjs.callback-url',
        'next-auth.session-token',
        'next-auth.csrf-token',
        'next-auth.callback-url',
    ];
    
    // Check which cookies exist before deletion
    const existingCookies = oldCookieNames.filter(name => 
        cookieStore.get(name) !== undefined
    );

    const allCookies = query.get("all");

    if(allCookies === "true") {
        // Delete all cookies if "all=true" is specified
        const allCookieNames = cookieStore.getAll().map(c => c.name);
        allCookieNames.forEach(name => {
            cookieStore.delete(name);
        });
        return NextResponse.json({ 
            success: true,
            message: 'All cookies cleared',
            deleted: allCookieNames,
            deletedCount: allCookieNames.length,
            instructions: 'Reload the page to verify cleanup. Try OAuth flow again.'
        });
    }
    
    // Delete all old NextAuth.js cookies
    oldCookieNames.forEach(name => {
        cookieStore.delete(name);
    });
    
    // Get remaining cookies
    const remainingCookies = cookieStore.getAll().map(c => ({
        name: c.name,
        value: c.value.substring(0, 30) + '...'
    }));
    
    return NextResponse.json({ 
        success: true,
        message: 'Old NextAuth.js cookies cleared',
        deleted: existingCookies,
        deletedCount: existingCookies.length,
        remainingCookies: remainingCookies,
        instructions: 'Reload the page to verify cleanup. Try OAuth flow again.'
    });
}
