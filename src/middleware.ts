import * as mws from "./middlewares/";
import { type NextRequest, NextResponse } from "next/server";

type SubMW = (req: NextRequest, res: NextResponse) => Promise<void | NextResponse> | void | NextResponse;

const routes: Array<{ pattern: URLPattern, mw: SubMW }> = [
    { pattern: new URLPattern({ pathname: "/api/user/:path*" }), mw: mws.auth.middleware },
    { pattern: new URLPattern({ pathname: "/api/admin/:path*" }), mw: mws.admin.middleware },
    // Only apply logging to non-auth API routes
    { pattern: new URLPattern({ pathname: "/api/(?!auth).*" }), mw: mws.logging.loggingMiddleware },
];

export async function middleware(req: NextRequest) {
    const res = NextResponse.next();

    for(const { pattern, mw } of routes) {
        if(pattern.test(req.nextUrl)) {
            const out = await mw(req, res);

            if(out && out !== res && out.status !== 200) return out;

            if(out && out !== res && out.status === 200) {
                out.headers.forEach((v, k) => res.headers.set(k, v));
            }
        }
    }

    // Success
    return res;

}

export const config = {
    matcher: [
        "/api/user/:path*",
        "/api/admin/:path*",
        // Match API routes but exclude auth routes
        "/api/((?!auth).)*"
    ]
}


