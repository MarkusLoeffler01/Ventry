import { type NextRequest, NextResponse } from "next/server";
import * as bcrypt from "@/lib/bcrypt";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/types/schemas/auth";
import jwtService from "@/lib/helpers/jsonwebtoken";
import { generateAuthCookie } from "@/types/schemas/helper/cookie";


export async function POST(req: NextRequest) {
  try {

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

    const user = await prisma.user.findFirst({
      where: { 
        email: {
          equals: email,
          mode: "insensitive"
        } 
      }
    });
    if(!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const isValid = await bcrypt.comparePassword(password, user.password);
    if(!isValid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401});

    console.log("User logged in:", user.email);

    const token = jwtService.sign({
      userId: user.id,
      email: user.email
    }, user.id, { expiresIn: "7d"});


    const res = NextResponse.json({ message: "Login successful" }, { status: 200 });
    res.cookies.set(generateAuthCookie(token));

    return res;

  } catch(error) {
    console.error("Error during login:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}