import { redirect } from "next/navigation";
import { Box, Container, Typography } from "@mui/material";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/prisma";
import UserTicketOverview from "@/components/tickets/UserTicketOverview";
import { Suspense } from "react";
import PageLoadingState from "@/components/common/PageLoadingState";

interface SerializedTicketItem {
  id: string;
  subject: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  adminResponse: string | null;
  updatedAt: string;
  createdAt: string;
}

interface SerializedEventGroup {
  eventId: number;
  eventName: string;
  eventStartDate: string;
  eventEndDate: string;
  tickets: SerializedTicketItem[];
}

export default function TicketsPage() {
  return (
    <Suspense fallback={<PageLoadingState />}>
      <TicketsPageContent />
    </Suspense>
  );
}

async function TicketsPageContent() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/tickets");
  }

  const tickets = await prisma.supportTicket.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
        },
      },
    },
    orderBy: [
      { eventId: "asc" },
      { updatedAt: "desc" },
    ],
  });

  const groupsMap = new Map<number, SerializedEventGroup>();

  for (const ticket of tickets) {
    const existing = groupsMap.get(ticket.eventId);
    const serializedTicket: SerializedTicketItem = {
      id: ticket.id,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      adminResponse: ticket.adminResponse,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    };

    if (!existing) {
      groupsMap.set(ticket.eventId, {
        eventId: ticket.event.id,
        eventName: ticket.event.name,
        eventStartDate: ticket.event.startDate.toISOString(),
        eventEndDate: ticket.event.endDate.toISOString(),
        tickets: [serializedTicket],
      });
      continue;
    }

    existing.tickets.push(serializedTicket);
  }

  const groups = Array.from(groupsMap.values()).sort(
    (a, b) => new Date(b.eventStartDate).getTime() - new Date(a.eventStartDate).getTime(),
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          My Support Tickets
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Ticket overview grouped by event. Open additional tickets from each event page when needed.
        </Typography>
      </Box>

      <UserTicketOverview groups={groups} />
    </Container>
  );
}
