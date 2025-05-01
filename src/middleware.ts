import * as mws from "./middlewares/";
import { NextRequest, NextResponse } from "next/server";

const middlewareMap = [
    { path: "/api/user/:path*", middleware: mws.auth.middleware },
    { path: "/api*", middleware: mws.logging.loggingMiddleware },
];

export async function middleware(req: NextRequest) {
    const url = req.nextUrl.pathname;

    for(const { path, middleware: mw } of middlewareMap) {
        if (url.startsWith(path)) {
            const res = await mw(req);
            if(res.status !== 200) return res; // If the middleware returns a non-200 response, return it
        }
    }

    return NextResponse.next(); // If all middlewares pass, continue to the next handler

}

export const config = {
    matcher: [
        "/api/user/:path*"

        
    ]
}


