import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { handlePrismaError } from "@/lib/helpers/prismaErrorHandler";
import jwtService from "@/lib/helpers/jsonwebtoken";


export async function GET() {
    try {
        const event = await prisma.event.findFirst();

        if (!event) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }
        return NextResponse.json(event, { status: 200 });
    } catch (error) {
        const response = handlePrismaError(error);
        const { statusCode: _, ...rest } = response;
        return NextResponse.json(rest, { status: response.statusCode });
    }
}

