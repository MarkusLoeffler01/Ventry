import { prisma } from "@/lib/prisma/prisma";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { 
  Container, 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Stack, 
  Button, 
  Divider,
  Chip,
  Alert
} from "@mui/material";
import { 
  CalendarMonth, 
  LocationOn, 
  AccessTime, 
  ConfirmationNumber,
  Edit
} from "@mui/icons-material";
import Image from "next/image";
import Link from "next/link";
import EventRegistrationStatus from "@/components/events/EventRegistrationStatus";
import RegistrationCountdown from "@/components/events/RegistrationCountdown";
import EventSchedule from "@/components/events/EventSchedule";
import { type SerializedEvent } from "@/types/event";

interface StayPolicy {
  earlyArrival?: { enabled: boolean; feePerNight?: number };
  lateDeparture?: { enabled: boolean; feePerNight?: number };
}

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string }>;
}) {
  const id = Number((await params).id);
  if (isNaN(id)) notFound();

  const { message } = await searchParams;
  const session = await getSession();

  const event = await prisma.event.findFirst({
    where: { 
      id,
      OR: [
        { status: 'PUBLISHED' },
        { 
          status: 'DRAFT',
          publishAt: { lte: new Date() } // Auto-publish check
        },
        // Allow admins to view drafts
        ...(session?.user?.id ? [{ 
          ownerId: session.user.id
        }] : [])
      ]
    },
    include: {
      location: true,
      products: true,
      _count: {
        select: { registrations: true }
      }
    }
  });

  if (!event) notFound();

  // Check if user is admin or owner
  let canEdit = false;
  if (session?.user?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true }
    });
    canEdit = !!dbUser?.isAdmin || event.ownerId === session.user.id;
  }

  // If it was a scheduled draft, update its status to PUBLISHED proactively
  if (event.status === 'DRAFT' && event.publishAt && new Date(event.publishAt) <= new Date()) {
    await prisma.event.update({
      where: { id: event.id },
      data: { status: 'PUBLISHED' }
    });
  }

  // Check if user is registered
  const registration = session?.user?.id ? await prisma.registration.findUnique({
    where: {
      userId_eventId: {
        userId: session.user.id,
        eventId: id
      }
    },
    include: {
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  }) : null;

  // Add expiresAt to the cast/serialization if needed, 
  // but Prisma already includes it in the object since we updated the schema.
  // I'll make sure the props passed to EventRegistrationStatus are correct.

  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const stayPolicy = event.stayPolicy as unknown as StayPolicy;

  return (
    <Box>
      {/* Success Alert */}
      {message === 'update_success' && (
        <Container maxWidth="lg" sx={{ mt: 2 }}>
          <Alert severity="success" sx={{ borderRadius: 2 }}>
            Your registration preferences have been updated successfully.
          </Alert>
        </Container>
      )}

      {/* Hero Banner */}
      <Box sx={{ position: 'relative', height: { xs: 300, md: 500 }, width: '100%', bgcolor: 'grey.900' }}>
        {event.imageUrl ? (
          <Image
            src={event.imageUrl}
            alt={event.name}
            fill
            style={{ objectFit: 'cover', opacity: 0.7 }}
            priority
          />
        ) : (
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="h2" color="grey.700">Ventry</Typography>
          </Box>
        )}
        <Box 
          sx={{ 
            position: 'absolute', 
            bottom: 0, 
            left: 0, 
            width: '100%', 
            p: { xs: 4, md: 8 },
            background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
            color: 'white'
          }}
        >
          <Container maxWidth="lg">
            <Typography variant="h2" component="h1" fontWeight="bold" gutterBottom>
              {event.name}
            </Typography>
            <Stack direction="row" spacing={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarMonth />
                <Typography variant="h6">
                  {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                </Typography>
              </Box>
              {event.location && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationOn />
                  <Typography variant="h6">
                    {event.location.city}, {event.location.country}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Container>
        </Box>
      </Box>

      {/* Content */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Grid container spacing={6}>
          {/* Main Info */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Box mb={6}>
              <Typography variant="h4" gutterBottom fontWeight="bold">About this Event</Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary', fontSize: '1.1rem' }}>
                {event.description}
              </Typography>
            </Box>

            {/* Schedule */}
            {event.schedule && Array.isArray(event.schedule) && event.schedule.length > 0 && (
              <Box mb={6}>
                <EventSchedule schedule={event.schedule} />
              </Box>
            )}

            {event.location && (
              <Box mb={6}>
                <Typography variant="h4" gutterBottom fontWeight="bold">Location</Typography>
                <Paper variant="outlined" sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>{event.location.name}</Typography>
                  <Typography color="text.secondary">{event.location.address}</Typography>
                  <Typography color="text.secondary">
                    {event.location.postalCode} {event.location.city}
                  </Typography>
                  <Typography color="text.secondary">{event.location.state}, {event.location.country}</Typography>
                </Paper>
              </Box>
            )}
          </Grid>

          {/* Registration Sidebar */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={3} sx={{ position: 'sticky', top: 100 }}>
              <Paper elevation={4} sx={{ p: 4, borderRadius: 2 }}>
                <Typography variant="h5" gutterBottom fontWeight="bold">Registration</Typography>
                <Divider sx={{ mb: 3 }} />
                
                <Stack spacing={2} mb={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <AccessTime color="primary" />
                    <Box>
                      <Typography variant="subtitle2">Duration</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} Days
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <ConfirmationNumber color="primary" />
                    <Box>
                      <Typography variant="subtitle2">Price Range</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {event.products.length > 0 
                          ? (
                            <>
                              {`${Math.min(...event.products.map(p => p.price))}€ - ${Math.max(...event.products.map(p => p.price))}€`}
                              {(stayPolicy?.earlyArrival?.feePerNight || stayPolicy?.lateDeparture?.feePerNight) && (
                                <Typography component="span" variant="caption" display="block" color="primary.main" sx={{ mt: 0.5 }}>
                                  + Optional Extras (up to {((stayPolicy?.earlyArrival?.feePerNight || 0) + (stayPolicy?.lateDeparture?.feePerNight || 0))}€)
                                </Typography>
                              )}
                            </>
                          )
                          : 'Free / TBD'
                        }
                      </Typography>
                    </Box>
                  </Box>
                </Stack>

                {registration ? (
                  <EventRegistrationStatus 
                    registration={{
                      ...registration,
                      expiresAt: registration.expiresAt?.toISOString()
                    } as unknown as { id: string; status: string; ticketId: number; expiresAt?: string; payments: { id: string; amount: number; paymentStatus: string; paymentProvider: string }[] }} 
                    event={event as unknown as SerializedEvent}
                  />
                ) : (
                  <>
                    <Button 
                      fullWidth 
                      variant="contained" 
                      size="large" 
                      sx={{ py: 2, fontSize: '1.1rem' }}
                      component={Link}
                      href={`/events/${event.id}/register`}
                      disabled={!!(event.registrationOpensAt && new Date(event.registrationOpensAt) > new Date()) || !!(event.maxRegistrations && event._count.registrations >= event.maxRegistrations)}
                    >
                      {event.maxRegistrations && event._count.registrations >= event.maxRegistrations 
                        ? 'Registration Full' 
                        : 'Register Now'}
                    </Button>

                    {event.registrationOpensAt && new Date(event.registrationOpensAt) > new Date() && (
                      <Box sx={{ mt: 3 }}>
                        {new Date(event.registrationOpensAt).getTime() - new Date().getTime() < 3 * 24 * 60 * 60 * 1000 ? (
                          <RegistrationCountdown opensAt={event.registrationOpensAt.toISOString()} />
                        ) : (
                          <Alert severity="info" icon={false} sx={{ textAlign: 'center' }}>
                            <Typography variant="body2" fontWeight="bold">
                              Registration opens on:
                            </Typography>
                            <Typography variant="h6">
                              {new Date(event.registrationOpensAt).toLocaleDateString()}
                            </Typography>
                          </Alert>
                        )}
                      </Box>
                    )}
                  </>
                )}

                {canEdit && (
                  <Button
                    fullWidth
                    variant="outlined"
                    color="secondary"
                    startIcon={<Edit />}
                    component={Link}
                    href={`/admin/events/${event.id}`}
                    sx={{ mt: 2 }}
                  >
                    Edit Event (Admin)
                  </Button>
                )}

                {event.maxRegistrations && (
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      {event._count.registrations} / {event.maxRegistrations} spots taken
                    </Typography>
                  </Box>
                )}
              </Paper>

              <Box sx={{ px: 2 }}>
                <Typography variant="h6" gutterBottom>Includes</Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  <Chip label="Badge" variant="outlined" />
                  <Chip label="Convention Access" variant="outlined" />
                  <Chip label="Workshops" variant="outlined" />
                  {stayPolicy?.earlyArrival?.enabled && (
                    <Chip label="Hotel Support" variant="outlined" />
                  )}
                </Stack>
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
