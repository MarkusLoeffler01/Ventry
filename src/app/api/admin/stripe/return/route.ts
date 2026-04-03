import { type NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const origin = url.origin;
    return NextResponse.redirect(`${origin}/admin/settings?stripe=connected`);
}
