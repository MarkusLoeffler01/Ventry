import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const origin = `${proto}://${host}`;

  // Clone the response to set headers
  const res = NextResponse.next({
    request: {
      headers: new Headers(req.headers),
    },
  });

  // Eigener Header – kann später überall ausgelesen werden
  res.headers.set("x-real-origin", origin);

  return res;
}
