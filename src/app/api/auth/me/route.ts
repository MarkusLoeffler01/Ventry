import jwtService from "@/lib/helpers/jsonwebtoken";
import type JwtPayload from "@/types/jwt";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";


export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token");
        if (!token) throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const decoded = jwtService.verify(token.value) as JwtPayload;

        const partialDecoded = (({ userId, email }) => ({ userId, email }))(decoded);

        return NextResponse.json({ user: partialDecoded });
    } catch(_e) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}