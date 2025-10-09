import { type NextRequest, NextResponse } from "next/server";
import * as bcrypt from "@/lib/bcrypt";
import { prisma } from "@/lib/prisma/prisma";
import { loginSchema } from "@/types/schemas/auth";
import jwtService from "@/lib/helpers/jsonwebtoken";
import { generateAuthCookie } from "@/types/schemas/helper/cookie";
import { signIn } from "@/app/api/auth/auth";



export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const result = await signIn("credentials", { email, password, redirect: false });
  if (result?.error) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  return NextResponse.json({ message: "Login successful" });
}

/**
 * @deprecated use auth from auth.ts
 * @param req 
 * @returns 
 */
export async function POSTold(req: NextRequest) {
  try {
    console.log("HIT");
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
    if(!user.password) return NextResponse.json({ error: "Invalid credentials" }, { status: 401});

    const isValid = await bcrypt.comparePassword(password, user.password);
    if(!isValid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401});

    console.log("User logged in:", user.email);

    if(!user.sessionKey) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          sessionKey: crypto.randomUUID()
        }
      })
    }

    const token = jwtService.sign({
      userId: user.id,
      email: user.email,
      sessionKey: user.sessionKey
    }, user.id, { expiresIn: "7d"});


    const res = NextResponse.json({ message: "Login successful" }, { status: 200 });
    res.cookies.set(generateAuthCookie(token));

    return res;

  } catch(error) {
    console.error("Error during login:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}