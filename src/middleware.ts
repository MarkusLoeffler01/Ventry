import * as mws from "./middlewares/";
import { type NextRequest, NextResponse } from "next/server";

type SubMW = (req: NextRequest, res: NextResponse) => Promise<undefined | NextResponse> | undefined | NextResponse;

const routes: Array<{ pattern: URLPattern, mw: SubMW }> = [
    // Removed auth middleware for /api/user routes since they use NextAuth internally
    { pattern: new URLPattern({ pathname: "/api/admin/:path*" }), mw: mws.admin.middleware },
];

export async function middleware(req: NextRequest) {
    const res = NextResponse.next();
    const pathname = req.nextUrl.pathname;

    // Apply specific route middlewares
    for(const { pattern, mw } of routes) {
        if(pattern.test(req.nextUrl)) {
            const out = await mw(req, res);

            if(out && out !== res && out.status !== 200) return out;

            if(out && out !== res && out.status === 200) {
                out.headers.forEach((v, k) => void res.headers.set(k, v));
            }
        }
    }

    // Apply logging to API routes except auth routes
    if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth')) {
        const out = mws.logging.loggingMiddleware(req);
        if(out && out !== res && out.status !== 200) return out;
        if(out && out !== res && out.status === 200) {
            out.headers.forEach((v, k) => void res.headers.set(k, v));
        }
    }

    // Success
    return res;

}

export const config = {
    matcher: [
        "/api/admin/:path*",
        // Match all API routes (we filter out auth and user routes in the middleware function)
        "/api/:path*"
    ]
}


