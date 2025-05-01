import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import * as bcrypt from "@/lib/bcrypt";
import { registerSchema } from "@/types/schemas/auth";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { handlePrismaError } from "@/lib/helpers/prismaErrorHandler";

export async function POST(req: NextRequest) {

    try {
        if(!req.headers.get("content-type")?.includes("application/json")) {
            return NextResponse.json({ error: "Invalid content type" }, { status: 400 });
        }

        let body: { email: string; password: string; name: string };
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({error: "Invalid json"}, { status: 400 });
        }

        // Validate with zod
        const result = registerSchema.safeParse(body);
        if(!result.success) {
            return NextResponse.json({
                error: "Validation error",
                details: result.error.format()
            }, { status: 400});
        }
        const { email, password, name } = result.data;

        const hashedPassword = await bcrypt.hashPassword(password);
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name
            }
        });

        return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });

    } catch(error) {

        const response = handlePrismaError(error);
        const { statusCode: _, ...rest } = response;
        return NextResponse.json(rest, { status: response.statusCode });


        // ! We need to handle multiple errors here. 
        if(error instanceof PrismaClientKnownRequestError) {
            console.log(error.code, error.message);
            
            return NextResponse.json({ error: "Failed to create user", code: error.code }, { status: 400 });
                
            }
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
        }
}