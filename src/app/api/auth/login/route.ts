import { NextRequest, NextResponse } from "next/server";
import * as bcrypt from "@/lib/bcrypt";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/types/schemas/auth";
import jwtService from "@/lib/helpers/jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;
if(!JWT_SECRET) throw new Error("JWT_SECRET is not defined");


export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: { id: user.id, email: user.email } }, { status: 200 });
  } catch (error) {
    console.error("Error in GET handler:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if(!req.headers.get("content-type")?.includes("application/json")) {
        return NextResponse.json({ error: "Invalid content type" }, { status: 400 });
    }


    let body: { email: string; password: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({error: "Invalid json"}, { status: 400 });
    }

    // Validate with zod
    const result = loginSchema.safeParse(body);
    if(!result.success) {
        return NextResponse.json({
            error: "Validation error",
            details: result.error.format()
        }, { status: 400});
    }

    const { email, password } = result.data;

    const user = await prisma.user.findUnique({
      where: { email }
    });
    if(!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const isValid = await bcrypt.comparePassword(password, user.password);
    if(!isValid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401});

    console.log("User logged in:", user.email);

    const token = jwtService.sign({
      userId: user.id,
      email: user.email
    }, { expiresIn: "7d"});


    const res = NextResponse.json({ message: "Login successful" }, { status: 200 });
    res.cookies.set({
        name: "token",
        value: token,
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
    });

    return res;

  } catch(error) {
    console.error("Error during login:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}