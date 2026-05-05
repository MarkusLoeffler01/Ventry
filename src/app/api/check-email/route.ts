import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/prisma";

export async function POST(req: NextRequest) {
    const { email } = await req.json() as { email?: string };

    if (!email || typeof email !== "string") {
        return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true },
    });

    return NextResponse.json({ exists: !!existing });
}
