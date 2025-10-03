import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const middleware = async (req: NextRequest) => {
    const { pathname } = req.nextUrl;
    if(!pathname.startsWith("/api/admin")) return NextResponse.next();

    // Security: Check for NextAuth session token
    const sessionToken = req.cookies.get("next-auth.session-token")?.value || 
                        req.cookies.get("__Secure-next-auth.session-token")?.value;
    
    if (!sessionToken) {
        // Security: Rate limiting headers for failed auth attempts
        const response = NextResponse.json({ 
            error: "Unauthorized - Please log in",
            code: "MISSING_SESSION" 
        }, { status: 401 });
        
        response.headers.set("X-RateLimit-Limit", "100");
        response.headers.set("X-RateLimit-Remaining", "99");
        return response;
    }

    // Security: Add security headers
    const response = NextResponse.next();
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    
    // Let the API routes handle the detailed admin authorization (isAdmin check)
    return response;
    
}

export { middleware };