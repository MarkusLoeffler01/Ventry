import { prisma } from "@/lib/prisma/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { Container, Box, Typography } from "@mui/material";
import RegistrationWizard from "./RegistrationWizard";
import { type SerializedStayPolicy } from "@/types/event";

interface SerializedEventForWizard {
  id: number;
  name: string;
  products: Array<{ id: string; name: string; price: number; description: string | null }>;
  stayPolicy: SerializedStayPolicy | null;
}

export const dynamic = "force-dynamic";

export default async function RegisterEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session?.user) {
    const id = (await params).id;
    redirect(`/login?callbackUrl=/events/${id}/register`);
  }

  const id = Number((await params).id);
  if (isNaN(id)) notFound();

  const event = await prisma.event.findUnique({
    where: { id, status: 'PUBLISHED' },
    include: {
      products: true,
    }
  });

  if (!event) notFound();

  // Check if already registered
  const existingRegistration = await prisma.registration.findUnique({
    where: {
      userId_eventId: {
        userId: session.user.id,
        eventId: id
      }
    }
  });

  if (existingRegistration) {
    redirect(`/profile?message=already_registered&eventId=${id}`);
  }

  const serializedEvent: SerializedEventForWizard = {
    id: event.id,
    name: event.name,
    products: event.products.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      description: p.description
    })),
    stayPolicy: event.stayPolicy as unknown as SerializedStayPolicy
  };

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Box mb={4}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
          Registration
        </Typography>
        <Typography variant="h5" color="text.secondary">
          {event.name}
        </Typography>
      </Box>

      <RegistrationWizard event={serializedEvent} userId={session.user.id} />
    </Container>
  );
}
