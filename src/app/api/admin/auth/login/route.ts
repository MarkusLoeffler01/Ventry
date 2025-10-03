import { NextResponse } from "next/server";

// This endpoint is deprecated - use NextAuth login instead
export async function POST() {
    return NextResponse.json({
        error: "Admin login moved to NextAuth",
        message: "Please use /login to authenticate and ensure your account has admin privileges",
        redirect: "/login"
    }, { status: 410 }); // 410 Gone - endpoint no longer available
}