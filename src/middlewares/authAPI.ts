import { NextRequest, NextResponse } from "next/server";
import jwtService from "@/lib/helpers/jsonwebtoken";

export async function middleware(req: NextRequest) {
    const token = req.headers.get("authorization")?.split(" ")[1];

    if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        jwtService.verify(token);
        return NextResponse.next();
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}