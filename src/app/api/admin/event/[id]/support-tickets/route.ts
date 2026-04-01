import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SupportTicketStatus } from "@/generated/prisma";
import { forbiddenResponse } from "@/lib/auth/admin";
import { checkEventAdminAuth } from "@/lib/auth/event-admin";
import { prisma } from "@/lib/prisma/prisma";

export const dynamic = "force-dynamic";

const statusQuerySchema = z.nativeEnum(SupportTicketStatus);

function serializeAdminTicket(ticket: {
  id: string;
  subject: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  adminResponse: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; name: string | null; email: string };
  registration: { id: string; ticketId: number };
}) {
  return {
    ...ticket,
    resolvedAt: ticket.resolvedAt?.toISOString() || null,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const eventId = Number((await params).id);
    if (Number.isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
    }

    const authResult = await checkEventAdminAuth(eventId, req.headers);
    if (!authResult.authorized) {
      if (authResult.error === "Event not found") {
        return NextResponse.json({ error: authResult.error }, { status: 404 });
      }
      return forbiddenResponse(authResult.error);
    }

    const statusParam = new URL(req.url).searchParams.get("status");
    const parsedStatus = statusParam ? statusQuerySchema.safeParse(statusParam) : null;
    if (parsedStatus && !parsedStatus.success) {
      return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
    }

    const tickets = await prisma.supportTicket.findMany({
      where: {
        eventId,
        ...(parsedStatus?.success ? { status: parsedStatus.data } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        registration: {
          select: {
            id: true,
            ticketId: true,
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }],
    });

    return NextResponse.json({ tickets: tickets.map(serializeAdminTicket) }, { status: 200 });
  } catch (error) {
    console.error("Error listing event support tickets for admin:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
