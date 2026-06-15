import { type NextRequest, NextResponse } from "next/server";
import { checkEventAdminAuth } from "@/lib/auth/event-admin";
import { loadBadgeAttendees } from "@/lib/badges/server";
import { badgeAttendeeQuerySchema } from "@/types/schemas/badge";
import { z } from "zod";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const eventId = Number((await params).id);
    if (Number.isNaN(eventId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const authResult = await checkEventAdminAuth(eventId, req.headers);
    if (!authResult.authorized) return NextResponse.json({ error: authResult.error || "Forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const query = badgeAttendeeQuerySchema.parse({
      status: url.searchParams.get("status") || "CONFIRMED",
      ticketTier: url.searchParams.get("ticketTier") || undefined,
      search: url.searchParams.get("search") || undefined,
    });

    const attendees = await loadBadgeAttendees(eventId, query);
    return NextResponse.json({ attendees }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 422 });
    }

    console.error("Error listing badge attendees:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
