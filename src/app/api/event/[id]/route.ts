import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/prisma";

// GET /api/event/[id] - Get public event details
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = Number((await params).id);
        if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

        const event = await prisma.event.findUnique({
            where: { 
                id,
                status: 'PUBLISHED' // Only show published to public
            },
            include: {
                location: true,
                products: {
                    orderBy: { createdAt: "asc" }
                },
            }
        });

        console.log("Event details fetched:", event);
        console.log(event);

        if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

        return NextResponse.json({ event }, { status: 200 });
    } catch (error) {
        console.error("Error getting public event:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
