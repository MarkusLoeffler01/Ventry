import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/prisma";
import { Prisma } from "@/generated/prisma";
import { checkAdminAuth, forbiddenResponse } from "@/lib/auth/admin";
import { adminCreateEventSchema } from "@/types/schemas/event/admin";
import { z } from "zod";

function toPersistedProducts(products: z.infer<typeof adminCreateEventSchema>["products"]) {
    return products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        type: product.type as "TICKET" | "ACCOMMODATION" | "ADDON" | undefined,
        capacity: product.capacity,
    }));
}

// GET /api/admin/event - List all events for admins
export async function GET(_req: NextRequest) {
    try {
        const authResult = await checkAdminAuth();
        if (!authResult.authorized) {
            return forbiddenResponse(authResult.error);
        }

        const events = await prisma.event.findMany({
            include: {
                location: true,
                _count: {
                    select: { registrations: true }
                }
            },
            orderBy: { startDate: 'desc' }
        });

        return NextResponse.json({ events }, { status: 200 });
    } catch (error) {
        console.error("Error listing admin events:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST /api/admin/event - Create a new event
export async function POST(req: NextRequest) {
    try {
        const authResult = await checkAdminAuth();
        if (!authResult.authorized) {
            return forbiddenResponse(authResult.error);
        }

        if (!authResult.adminId) {
            return NextResponse.json({ error: "Admin profile incomplete" }, { status: 403 });
        }

        const body = await req.json();
        const validatedData = adminCreateEventSchema.parse(body);

        const event = await prisma.event.create({
            data: {
                name: validatedData.name,
                description: validatedData.description,
                startDate: validatedData.startDate,
                endDate: validatedData.endDate,
                imageUrl: validatedData.imageUrl,
                status: validatedData.status,
                stayPolicy: validatedData.stayPolicy as Prisma.InputJsonValue,
                customFields: validatedData.customFields as Prisma.InputJsonValue,
                schedule: validatedData.schedule as Prisma.InputJsonValue,
                ownerId: authResult.adminId,
                location: {
                    create: validatedData.location
                },
                products: {
                    create: toPersistedProducts(validatedData.products)
                },
                requireApproval: validatedData.requireApproval,
            },
            include: {
                location: true,
                products: {
                    orderBy: { createdAt: "asc" }
                }
            }
        });

        return NextResponse.json({ message: "Event created successfully", event }, { status: 201 });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 422 });
        }
        console.error("Error creating event:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
