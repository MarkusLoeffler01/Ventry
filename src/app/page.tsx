import EventCard from "@/components/events/EventCard";
import { Container, Grid, Typography, Box } from "@mui/material";
import { prisma } from "@/lib/prisma/prisma";
import type { Prisma } from "@/generated/prisma";
import { Suspense } from "react";
import { connection } from "next/server";

interface SerializedEventForCard {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  imageUrl: string | null;
  location: {
    city: string;
    country: string;
  } | null;
}

const homeEventInclude = {
  location: {
    select: {
      city: true,
      country: true,
    },
  },
} satisfies Prisma.EventInclude;

type HomeEventRow = Prisma.EventGetPayload<{
  include: typeof homeEventInclude;
}>;

async function getHomeEvents(): Promise<SerializedEventForCard[]> {
  await connection();

  const events = await prisma.event.findMany({
    where: { status: "PUBLISHED" },
    include: homeEventInclude,
    orderBy: { startDate: "asc" },
  }) as unknown as HomeEventRow[];

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

async function HomeEventGrid() {
  const serializedEvents = await getHomeEvents();

  return serializedEvents.length > 0 ? (
    <Grid container spacing={4}>
      {serializedEvents.map((event, index) => (
        <Grid key={event.id} size={{ xs: 12, sm: 6, md: 4 }}>
          <EventCard event={event} priority={index === 0} />
        </Grid>
      ))}
    </Grid>
  ) : (
    <Box sx={{ textAlign: 'center', py: 10 }}>
      <Typography variant="h6" color="text.secondary">
        No upcoming events found. Check back soon!
      </Typography>
    </Box>
  );
}

function HomeEventsFallback() {
  return (
    <Box sx={{ textAlign: 'center', py: 10 }}>
      <Typography variant="h6" color="text.secondary">
        Loading events...
      </Typography>
    </Box>
  );
}

export default function Home() {
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Typography variant="h2" component="h1" gutterBottom fontWeight="bold">
          Upcoming Events
        </Typography>
        <Typography variant="h5" color="text.secondary">
          Find and register for the next big adventure.
        </Typography>
      </Box>

      <Suspense fallback={<HomeEventsFallback />}>
        <HomeEventGrid />
      </Suspense>
    </Container>
  );
}
