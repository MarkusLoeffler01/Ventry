import prisma from "@/lib/prisma";
import { NextResponse, type NextRequest } from "next/server";
import * as bcrypt from "@/lib/bcrypt";
import jwtService from "@/lib/helpers/jsonwebtoken";
import { loginSchema } from "@/types/schemas/auth";
import { generateAuthCookie } from "@/types/schemas/helper/cookie";

export async function POST(req: NextRequest) {
    const body = await req.json();

    const result = loginSchema.safeParse(body);
    if(!result.success) {
        return NextResponse.json({
            error: "Validation error",
            details: result.error.format()
        }, { status: 400 });
    }

    const { email, password } = result.data;

    const user = await prisma.user.findFirst({
        where: {
            email: {
                equals: email,
                mode: "insensitive"
            },
            isAdmin: true,
            isVerified: true
        },
    });

    if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const isValid = await bcrypt.comparePassword(password, user.password);
    if(!isValid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const token = jwtService.sign({
        userId: user.id,
        email: user.email
    }, user.id, { expiresIn: "7d" });

    const res = NextResponse.json({ message: "Login successful" }, { status: 200 });
    res.cookies.set(generateAuthCookie(token));

    return res;
}