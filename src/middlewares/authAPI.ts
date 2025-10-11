import { type NextRequest, NextResponse } from "next/server";

// Note: Using better-auth session cookies
export async function middleware(req: NextRequest) {
    // Look for better-auth session token cookie
    const sessionToken = req.cookies.get("better-auth.session_token")?.value || 
                        req.cookies.get("__Secure-better-auth.session_token")?.value;

    if (!sessionToken) {
        return NextResponse.json({ error: "Unauthorized - No session token" }, { status: 401 });
    }

    // For API routes, we'll rely on the getSession() function in the route handlers
    // This middleware just checks for the presence of a session cookie
    // The actual user validation should be done in the API route using getSession()
    
    return NextResponse.next();
}
