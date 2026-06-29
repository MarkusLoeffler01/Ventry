import { type NextRequest, NextResponse } from "next/server";
import { cacheLife } from "next/cache";
import { rethrowIfExpectedPrerenderInterruption } from "@/lib/next/prerender";
import { prisma } from "@/lib/prisma/prisma";
import type { Prisma } from "@/generated/prisma";

type PublicEvent = {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    imageUrl: string | null;
    location: {
        city: string;
        country: string;
    } | null;
};

const publicEventSelect = {
    id: true,
    name: true,
    startDate: true,
    endDate: true,
    imageUrl: true,
    location: {
        select: {
            city: true,
            country: true,
        },
    },
} satisfies Prisma.EventSelect;

type PublicEventRow = Prisma.EventGetPayload<{
    select: typeof publicEventSelect;
}>;

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

async function getPublishedEvents(): Promise<PublicEvent[]> {
    "use cache";

    cacheLife("minutes");

    const events = await prisma.event.findMany({
        where: { status: "PUBLISHED" },
        select: publicEventSelect,
        orderBy: { startDate: "asc" },
    }) as unknown as PublicEventRow[];

    console.log(events);

    return events.map((event) => ({
        id: event.id,
        name: event.name,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        imageUrl: event.imageUrl,
        location: event.location
            ? {
                city: event.location.city,
                country: event.location.country,
            }
            : null,
    }));
}
