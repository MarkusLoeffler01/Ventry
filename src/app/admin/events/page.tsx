import { prisma } from "@/lib/prisma/prisma";
import EventList from "@/components/admin/events/EventList";
import { checkAdminAuth } from "@/lib/auth/admin";
import { normalizeStayPolicy } from "@/lib/events/accommodation";
import { redirect } from "next/navigation";
import type { SerializedEvent } from "@/types/event";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
    const authResult = await checkAdminAuth();
    
    if (!authResult.authorized) {
        if (authResult.error === "Not authenticated") {
            redirect("/login?callbackUrl=/admin/events");
        }
        // Use a simple error display or redirect
        return (
            <div style={{ padding: '20px', color: 'red' }}>
                {authResult.error || "Access Denied"}
            </div>
        );
    }

    const events = await prisma.event.findMany({
        include: {
            _count: {
                select: { registrations: true }
            }
        },
        orderBy: { startDate: 'desc' }
    });

    // Transform data for the client component (serialize Dates)
    const serializedEvents: SerializedEvent[] = events.map(event => ({
        ...event,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        stayPolicy: normalizeStayPolicy(event.stayPolicy, [], event.name, event.startDate, event.endDate),
        schedule: (event.schedule as unknown as SerializedEvent["schedule"]) || [],
        products: [] // Not needed for the list view but required by type
    }));

    return <EventList initialEvents={serializedEvents} />;
}
