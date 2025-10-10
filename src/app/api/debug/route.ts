import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  return NextResponse.json({
    // Headers
    headers: {
      host: req.headers.get("host"),
      xForwardedHost: req.headers.get("x-forwarded-host"),
      xForwardedProto: req.headers.get("x-forwarded-proto"),
      xForwardedFor: req.headers.get("x-forwarded-for"),
      origin: req.nextUrl.origin,
      cookie: req.headers.get("cookie"),
      userAgent: req.headers.get("user-agent"),
    },
    
    // Cookies
    cookies: allCookies.map(c => ({
      name: c.name,
      value: c.value.substring(0, 50) + (c.value.length > 50 ? '...' : ''),
    })),
    
    cookieCount: allCookies.length,
    
    // better-auth specific cookies (with VENTRY prefix)
    betterAuthCookies: {
      state: cookieStore.get('__Secure-VENTRY.state')?.value?.substring(0, 50),
      session: cookieStore.get('__Secure-VENTRY.session_token')?.value?.substring(0, 50),
      csrf: cookieStore.get('__Secure-VENTRY.csrf_token')?.value?.substring(0, 50),
    },
    
    // Auth status
    isAuthenticated: cookieStore.get('__Secure-VENTRY.session_token') !== undefined,
    
    // Environment
    env: {
      NODE_ENV: process.env.NODE_ENV,
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    },
  });
}