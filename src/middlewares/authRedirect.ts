import { NextRequest, NextResponse } from "next/server";
import jwtService from "@/lib/helpers/jsonwebtoken";

export async function authRedirectMiddleware(req: NextRequest) {
  // Get the token from the cookies
  const token = req.cookies.get("token")?.value;

  // If no token exists, redirect to login
  if (!token) {
    const url = new URL('/login', req.url);
    // Add the original URL as a return parameter
    url.searchParams.set('returnTo', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  try {
    // Verify the token is valid
    const payload = jwtService.verify(token);
    if (!payload) {
      throw new Error("Invalid token");
    }
    
    // Token is valid, continue to the protected route
    return NextResponse.next();
  } catch (error) {
    // Token verification failed, redirect to login
    const url = new URL('/login', req.url);
    url.searchParams.set('returnTo', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
}