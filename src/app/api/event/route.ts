import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError } from "@/lib/helpers/prismaErrorHandler";


export async function GET() {
    try {
        const events = await prisma.event.findMany();

        if (!events) {
            return NextResponse.json({ error: "Events not found" }, { status: 404 });
        }
        return NextResponse.json(events, { status: 200 });
    } catch (error) {
        const response = handlePrismaError(error);
        const { statusCode: _, ...rest } = response;
        return NextResponse.json(rest, { status: response.statusCode });
    }
}

