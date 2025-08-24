import { type NextRequest, NextResponse } from 'next/server';

export const loggingMiddleware = (req: NextRequest) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.nextUrl.pathname}`);
  return NextResponse.next();
};
