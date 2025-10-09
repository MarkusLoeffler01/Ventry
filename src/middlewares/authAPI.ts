import { type NextRequest, NextResponse } from "next/server";
import { auth } from "../app/api/auth/auth";

// Note: Using NextAuth session cookies instead of custom JWT tokens
export async function middleware(req: NextRequest) {
    // Look for NextAuth session token cookie
    const sessionToken = req.cookies.get("next-auth.session-token")?.value || 
                        req.cookies.get("__Secure-next-auth.session-token")?.value;

    if (!sessionToken) {
        return NextResponse.json({ error: "Unauthorized - No session token" }, { status: 401 });
    }

    const user = await auth();

    if(!user) {
        return NextResponse.json({ error: "Unauthorized - Invalid session" }, { status: 401 });
    }
    // For API routes, we'll rely on the auth() function in the route handlers
    // This middleware just checks for the presence of a session cookie
    // The actual user validation should be done in the API route using auth()
    
    return NextResponse.next();
}
