import { adminCreateEventSchema, adminUpdateEventSchema } from "@/types/schemas/event/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handlePrismaError } from "@/lib/helpers/prismaErrorHandler";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const event = adminCreateEventSchema.parse(body);

        await prisma.event.create({
            data: event
        });

        return NextResponse.json({ message: "Event created successfully" }, { status: 201 });

    } catch(error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.cause }, { status: 422 });
        }

        const response = handlePrismaError(error);
        const { statusCode: _, ...rest } = response;
        return NextResponse.json(rest, { status: response.statusCode });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const id = req.nextUrl.searchParams.get("id");

        if(!id) return NextResponse.json({ error: "Missing event ID" }, { status: 400 });

        // Safely parse id to number
        const parsedId = Number.parseInt(id);
        if (isNaN(parsedId)) return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });

        const body = await req.json();
        const event = adminUpdateEventSchema.parse(body);
        const {...data} = event;

        await prisma.event.update({
            where: { id: parsedId },
            data: data
        });

        return NextResponse.json({ message: "Event updated successfully" }, { status: 200 });

    } catch(error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.cause }, { status: 422 });
        }

        const response = handlePrismaError(error);
        const { statusCode: _, ...rest } = response;
        return NextResponse.json(rest, { status: response.statusCode });
    }
}