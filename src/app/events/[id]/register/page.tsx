import { prisma } from "@/lib/prisma/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { Container, Box, Typography } from "@mui/material";
import RegistrationWizard from "./RegistrationWizard";
import { type SerializedStayPolicy } from "@/types/event";

interface SerializedEventForWizard {
  id: number;
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  products: Array<{ id: string; name: string; price: number; description: string | null; type: any; capacity: number | null }>;
  stayPolicy: SerializedStayPolicy | null;
  requiresHotel?: boolean;
  customFields: { id: string; label: string; type: "text" | "number" | "boolean" | "select"; required: boolean; options?: string[] }[];
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

  const serializedEvent: SerializedEventForWizard = {
    id: event.id,
    name: event.name,
    products: event.products.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      description: p.description,
      type: p.type,
      capacity: p.capacity
    })),
    stayPolicy: event.stayPolicy as unknown as SerializedStayPolicy,
    requiresHotel: event.requiresHotel,
    customFields: event.customFields as unknown as SerializedEventForWizard['customFields']
  };

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Box mb={4}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
          {existingRegistration ? 'Edit Registration' : 'Registration'}
        </Typography>
        <Typography variant="h5" color="text.secondary">
          {event.name}
        </Typography>
      </Box>

      <RegistrationWizard 
        event={serializedEvent} 
        userId={session.user.id} 
        initialRegistration={existingRegistration as unknown as { id: string; preferences: { productId?: string; needsHotel?: boolean; earlyArrival?: boolean; lateDeparture?: boolean; customFieldsData?: Record<string, string | number | boolean> }; status: string }}
      />
    </Container>
  );
}
