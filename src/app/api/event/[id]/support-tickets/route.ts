import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma/prisma";
import { getSession } from "@/lib/auth/session";
import { renderComponentToHTML } from "@/lib/helpers/html";
import { sendMail } from "@/lib/mail";
import SupportTicketCreatedMail from "@/components/emails/SupportTicketCreatedMail";
import SupportTicketStatusMail from "@/components/emails/SupportTicketStatusMail";
import type { Prisma } from "@/generated/prisma";

const createSupportTicketSchema = z.object({
  subject: z.string().trim().min(5).max(120),
  description: z.string().trim().min(10).max(5000),
});

function getAppBaseUrl() {
  return process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || "https://local.dev:3443";
}

const ticketRegistrationInclude = {
  user: {
    select: {
      name: true,
      email: true,
    },
  },
  event: {
    select: {
      id: true,
      name: true,
      owner: {
        select: {
          user: {
            select: {
              email: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.RegistrationInclude;

type TicketRegistration = Prisma.RegistrationGetPayload<{
  include: typeof ticketRegistrationInclude;
}>;

function serializeTicket(ticket: {
  id: string;
  subject: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  adminResponse: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...ticket,
    resolvedAt: ticket.resolvedAt?.toISOString() || null,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const eventId = Number((await params).id);
    if (Number.isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
    }

    const registration = await prisma.registration.findFirst({
      where: {
        userId: session.user.id,
        eventId,
        status: { not: "CANCELLED" },
      },
      select: { id: true },
    });

    if (!registration) {
      return NextResponse.json(
        { error: "Only ticket holders can access support tickets for this event" },
        { status: 403 },
      );
    }

    const tickets = await prisma.supportTicket.findMany({
      where: {
        eventId,
        userId: session.user.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json({ tickets: tickets.map(serializeTicket) }, { status: 200 });
  } catch (error) {
    console.error("Error listing support tickets:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const eventId = Number((await params).id);
    if (Number.isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = createSupportTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 422 });
    }

    const registration = await prisma.registration.findFirst({
      where: {
        userId: session.user.id,
        eventId,
        status: { not: "CANCELLED" },
      },
      include: ticketRegistrationInclude,
    }) as TicketRegistration | null;

    if (!registration) {
      return NextResponse.json(
        { error: "Only ticket holders can open support tickets for this event" },
        { status: 403 },
      );
    }

    const createdTicket = await prisma.supportTicket.create({
      data: {
        eventId,
        registrationId: registration.id,
        userId: session.user.id,
        subject: parsed.data.subject,
        description: parsed.data.description,
      },
    });

    const appBaseUrl = getAppBaseUrl();
    const eventUrl = `${appBaseUrl}/events/${registration.event.id}`;

    // Notify event admin(s) about new ticket.
    try {
      const recipientSet = new Set<string>();

      if (registration.event.owner?.user.email) {
        recipientSet.add(registration.event.owner.user.email);
      } else {
        const admins = await prisma.user.findMany({
          where: { isAdmin: true },
          select: { email: true },
        });
        for (const admin of admins) {
          recipientSet.add(admin.email);
        }
      }

      if (recipientSet.size > 0) {
        const adminEmailHtml = await renderComponentToHTML(SupportTicketCreatedMail, {
          eventName: registration.event.name,
          eventUrl,
          ticketId: createdTicket.id,
          requesterName: registration.user.name || "Attendee",
          requesterEmail: registration.user.email,
          subject: createdTicket.subject,
          description: createdTicket.description,
        });

        await Promise.all(
          Array.from(recipientSet).map((email) =>
            sendMail(email, `New Support Ticket: ${registration.event.name}`, adminEmailHtml),
          ),
        );
      }
    } catch (mailError) {
      console.error("Failed to send support ticket notification to admins:", mailError);
    }

    // Send receipt to attendee.
    try {
      const userEmailHtml = await renderComponentToHTML(SupportTicketStatusMail, {
        userName: registration.user.name || "Attendee",
        eventName: registration.event.name,
        eventUrl,
        ticketId: createdTicket.id,
        status: createdTicket.status,
        adminResponse: null,
      });

      await sendMail(
        registration.user.email,
        `Support Ticket Received: ${registration.event.name}`,
        userEmailHtml,
      );
    } catch (mailError) {
      console.error("Failed to send support ticket receipt to attendee:", mailError);
    }

    return NextResponse.json({ ticket: serializeTicket(createdTicket) }, { status: 201 });
  } catch (error) {
    console.error("Error creating support ticket:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
