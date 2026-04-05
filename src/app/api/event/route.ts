import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/prisma";
import { cacheLife } from "next/cache";
import { rethrowIfExpectedPrerenderInterruption } from "@/lib/next/prerender";

// GET /api/event - List all published events
export async function GET(_req: NextRequest) {
    try {
        const events = await getPublishedEvents();

        return NextResponse.json({ events }, { status: 200 });
    } catch (error) {
        rethrowIfExpectedPrerenderInterruption(error);
        console.error("Error listing public events:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

async function getPublishedEvents() {
    "use cache";

    cacheLife("minutes");

    return prisma.event.findMany({
        where: { status: 'PUBLISHED' },
        select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            imageUrl: true,
            location: {
                select: {
                    city: true,
                    country: true
                }
            }
        },
        orderBy: { startDate: 'asc' }
    });
}
