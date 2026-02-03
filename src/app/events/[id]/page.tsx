import { prisma } from "@/lib/prisma/prisma";
import { notFound } from "next/navigation";
import { 
  Container, 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Stack, 
  Button, 
  Divider,
  Chip
} from "@mui/material";
import { 
  CalendarMonth, 
  LocationOn, 
  AccessTime, 
  ConfirmationNumber 
} from "@mui/icons-material";
import Image from "next/image";
import Link from "next/link";

interface StayPolicy {
  earlyArrival?: { enabled: boolean };
}

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  if (isNaN(id)) notFound();

  const event = await prisma.event.findUnique({
    where: { id, status: 'PUBLISHED' },
    include: {
      location: true,
      products: true,
    }
  });

  if (!event) notFound();

  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const stayPolicy = event.stayPolicy as unknown as StayPolicy;

  return (
    <Box>
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
                          ? `${Math.min(...event.products.map(p => p.price))}€ - ${Math.max(...event.products.map(p => p.price))}€`
                          : 'Free / TBD'
                        }
                      </Typography>
                    </Box>
                  </Box>
                </Stack>

                <Button 
                  fullWidth 
                  variant="contained" 
                  size="large" 
                  sx={{ py: 2, fontSize: '1.1rem' }}
                  component={Link}
                  href={`/events/${event.id}/register`}
                >
                  Register Now
                </Button>
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
