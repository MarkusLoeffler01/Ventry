import { NextRequest } from "next/server";


let GET: ((req: NextRequest) => Response) | undefined;

if (process.env.NODE_ENV !== "production") {
    GET = function (req: NextRequest) {
        const url = req.nextUrl.clone();
        const params = url.searchParams;
        const headers = req.headers;

        // Only return non-sensitive information, or remove this endpoint in production
        return new Response(JSON.stringify({
            message: "Debug endpoint. Remove or restrict in production."
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    };
}

export { GET };


let POST: ((req: NextRequest) => Response) | undefined;

if (process.env.NODE_ENV !== "production") {
    POST = function (req: NextRequest) {
        const url = req.nextUrl.clone();
        const params = url.searchParams;
        const headers = req.headers;

        // Filter out sensitive headers and parameters
        const safeParams = Object.fromEntries(
            Array.from(params.entries()).filter(([key]) => !["token", "password", "secret"].includes(key))
        );
        const safeHeaders = Object.fromEntries(
            Array.from(headers.entries()).filter(([key]) => !["authorization", "cookie", "set-cookie"].includes(key.toLowerCase()))
        );

        return new Response(JSON.stringify({
            params: safeParams,
            headers: safeHeaders
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    };
}

export { POST };