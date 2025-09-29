import { type NextRequest, NextResponse } from "next/server";
import jwtService from "@/lib/helpers/jsonwebtoken";

// Note: Don't import auth config here as it causes Edge Runtime issues with bcrypt
// export { auth as AuthAPI } from "@/app/api/auth/auth";

export async function middleware(req: NextRequest) {
    const token = req.cookies.get("token")?.value;

    if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        jwtService.verify(token);
        const user = jwtService.validatePayload(jwtService.decode(token));

        const headers = new Headers(req.headers);
        headers.set("userId", user.userId);
        headers.set("email", user.email);
        const response = NextResponse.next();
        response.headers.set("userId", user.userId);
        response.headers.set("email", user.email);
        return response;
    } catch (_error) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}
