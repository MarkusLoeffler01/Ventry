import { adminCreateEventSchema, adminUpdateEventSchema } from "@/types/schemas/event/admin";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handlePrismaError } from "@/lib/helpers/prismaErrorHandler";
import { checkAdminAuth, forbiddenResponse } from "@/lib/auth/admin";

export async function POST(req: NextRequest) {
    try {
        // Check admin authorization
        const authResult = await checkAdminAuth();
        if (!authResult.authorized) {
            return forbiddenResponse(authResult.error);
        }

        const body = await req.json();
        const event = adminCreateEventSchema.parse(body);
        // Allow only a single event: use upsert on id=1 (implicit for first row with autoincrement)
        // Strategy: If an event already exists, reject creation to preserve semantic "create" behavior
        const existing = await prisma.event.findFirst({ select: { id: true } });
        if (existing) {
            return NextResponse.json({ error: "Event already exists. Use PUT to update it." }, { status: 409 });
        }

        await prisma.event.create({
            data: {
                name: event.name,
                description: event.description,
                startDate: event.startDate,
                endDate: event.endDate,
                imageUrl: event.imageUrl,
                status: event.status,
                stayPolicy: event.stayPolicy,
                location: { create: event.location },
                products: { create: event.products }
            }
        });

        // await prisma.event.create({
        //     data: {
        //         description: event.description,
        //         endDate: event.endDate,
        //         name: event.name,
        //         startDate: event.startDate,
        //         createdAt: new Date(),
        //         imageUrl: event.imageUrl,
        //         location: {
        //             create: event.location
        //         },
        //         products: {
        //             create: event.products
        //         },
        //         status: event.status,
        //         stayPolicy: event.stayPolicy,
        //         updatedAt: new Date(),
        //     }
        // })

        return NextResponse.json({ message: "Event created successfully" }, { status: 201 });

    } catch(error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: JSON.parse(error.message) }, { status: 422 });
        }

        const hasMessage = (err: unknown): err is { message: string } =>
            typeof err === "object" && err !== null && "message" in err && typeof (err as { message?: unknown }).message === "string";
        if (hasMessage(error)) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        const response = handlePrismaError(error);
        const { statusCode, ...rest } = response;
        return NextResponse.json(rest, { status: statusCode });
    }
}

export async function PUT(req: NextRequest) {
    try {
        // Check admin authorization
        const authResult = await checkAdminAuth();
        if (!authResult.authorized) {
            return forbiddenResponse(authResult.error);
        }

        const id = req.nextUrl.searchParams.get("id");

        // For singleton event pattern, if no id is supplied, assume first (only) event
        let parsedId: number | undefined;
        if (id) {
            parsedId = Number.parseInt(id);
            if (Number.isNaN(parsedId)) return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
        } else {
            const existing = await prisma.event.findFirst({ select: { id: true } });
            if (!existing) return NextResponse.json({ error: "No existing event to update" }, { status: 404 });
            parsedId = existing.id;
        }

        const body = await req.json();
        const event = adminUpdateEventSchema.parse(body);
        const {...data} = event;

        // Build nested updates. We want to upsert location (1:1) and replace products set.
        const locationOp = data.location ? {
            upsert: {
                create: data.location,
                update: data.location
            }
        } : undefined;

        const productOps = data.products ? {
            deleteMany: { eventId: parsedId }, // clear previous products
            create: data.products
        } : undefined;

        await prisma.event.update({
            where: { id: parsedId },
            data: {
                name: data.name,
                description: data.description,
                startDate: data.startDate,
                endDate: data.endDate,
                imageUrl: data.imageUrl,
                status: data.status,
                stayPolicy: data.stayPolicy,
                ...(locationOp && { location: locationOp }),
                ...(productOps && { products: productOps })
            }
        });

        return NextResponse.json({ message: "Event updated successfully" }, { status: 200 });

    } catch(error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.cause }, { status: 422 });
        }

        const response = handlePrismaError(error);
        const { statusCode, ...rest } = response;
        return NextResponse.json(rest, { status: statusCode });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        // Check admin authorization
        const authResult = await checkAdminAuth();
        if (!authResult.authorized) {
            return forbiddenResponse(authResult.error);
        }

        const id = req.nextUrl.searchParams.get("id");

        if (!id) return NextResponse.json({ error: "Event ID is required" }, { status: 400 });

        const existing = await prisma.event.findUnique({ where: { id: Number(id) } });
        if (!existing) return NextResponse.json({ error: "Event not found" }, { status: 404 });

        await prisma.event.delete({ where: { id: Number(id) } });
        return NextResponse.json({ message: "Event deleted successfully" }, { status: 200 });

    } catch(error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.cause }, { status: 422 });
        }

        const response = handlePrismaError(error);
        const { statusCode, ...rest } = response;
        return NextResponse.json(rest, { status: statusCode });
    }
}