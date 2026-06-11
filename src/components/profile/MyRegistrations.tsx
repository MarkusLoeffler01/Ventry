"use client";

import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Stack, 
  Chip, 
  Button, 
  Alert,
  CircularProgress,
  Collapse,
  Divider
} from '@mui/material';
import { 
  Event, 
  ConfirmationNumber, 
  LocationOn,
  ExpandLess,
  ExpandMore
} from '@mui/icons-material';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import { formatTicketQrPayload } from '@/lib/tickets/qr';

interface Registration {
  id: string;
  ticketId: number;
  status: string;
  createdAt: string;
  event: {
    id: number;
    name: string;
    startDate: string;
    location: {
      city: string;
    } | null;
  };
  payments: Array<{
    amount: number;
    currency: string;
    paymentStatus: string;
  }>;
}

interface MyRegistrationsProps {
  userId: string;
}

export default function MyRegistrations({ userId }: MyRegistrationsProps) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRegistrationIds, setExpandedRegistrationIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const fetchRegistrations = async () => {
      try {
        const response = await fetch(`/api/user/registrations?userId=${userId}`);
        if (!response.ok) throw new Error('Failed to fetch registrations');
        const data = await response.json();
        setRegistrations(data.registrations);
      } catch (_err) {
        setError('Could not load your registrations.');
      } finally {
        setLoading(false);
      }
    };

    void fetchRegistrations();
  }, [userId]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (registrations.length === 0) return (
    <Box sx={{ py: 4, textAlign: 'center' }}>
      <Typography variant="body1" color="text.secondary">You haven&apos;t registered for any events yet.</Typography>
      <Button component={Link} href="/" sx={{ mt: 2 }}>Browse Events</Button>
    </Box>
  );

  const canShowQr = (reg: Registration) => {
    if (reg.status === 'CANCELLED' || reg.status === 'WAITLISTED') {
      return false;
    }

    return !reg.payments.some(payment => payment.paymentStatus === 'PENDING' || payment.paymentStatus === 'FAILED');
  };

  const toggleRegistration = (registrationId: string) => {
    setExpandedRegistrationIds((current) => {
      const next = new Set(current);
      if (next.has(registrationId)) {
        next.delete(registrationId);
      } else {
        next.add(registrationId);
      }
      return next;
    });
  };

  return (
    <Stack spacing={3}>
      {registrations.map((reg) => {
        const isExpanded = expandedRegistrationIds.has(reg.id);
        const ticketDetailsId = `registration-ticket-${reg.id}`;

        return (
          <Card key={reg.id} variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography variant="h6" gutterBottom>{reg.event.name}</Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.5, sm: 2 }} sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Event fontSize="small" color="action" />
                        <Typography variant="body2">{new Date(reg.event.startDate).toLocaleDateString()}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LocationOn fontSize="small" color="action" />
                        <Typography variant="body2">{reg.event.location?.city || 'TBD'}</Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
                      <Chip
                        label={`Status: ${reg.status}`}
                        color={reg.status === 'CONFIRMED' ? 'success' : 'warning'}
                        size="small"
                      />
                      <Chip
                        icon={<ConfirmationNumber />}
                        label={`Ticket ID: #${reg.ticketId}`}
                        variant="outlined"
                        size="small"
                      />
                    </Stack>
                  </Box>

                  <Stack
                    alignItems={{ xs: 'stretch', sm: 'flex-end' }}
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                  >
                    <Button
                      variant="outlined"
                      size="small"
                      component={Link}
                      href={`/events/${reg.event.id}`}
                    >
                      Event Details
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => toggleRegistration(reg.id)}
                      aria-controls={ticketDetailsId}
                      aria-expanded={isExpanded}
                      endIcon={isExpanded ? <ExpandLess /> : <ExpandMore />}
                    >
                      {isExpanded ? 'Hide ticket' : 'Show ticket'}
                    </Button>
                  </Stack>
                </Stack>

                <Collapse in={isExpanded}>
                  <Divider sx={{ mb: 2 }} />
                  <Stack
                    id={ticketDetailsId}
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    spacing={2}
                  >
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>Payment</Typography>
                      {reg.payments.length > 0 ? (
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {reg.payments.map((p) => (
                            <Box key={`${p.amount}-${p.currency}-${p.paymentStatus}`}>
                              <Typography variant="h6">{p.amount}{p.currency}</Typography>
                              <Chip
                                label={p.paymentStatus}
                                size="small"
                                color={p.paymentStatus === 'COMPLETED' ? 'success' : 'default'}
                              />
                            </Box>
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">No payment required.</Typography>
                      )}
                    </Box>

                    {canShowQr(reg) ? (
                      <Box
                        sx={{
                          alignSelf: { xs: 'center', sm: 'flex-start' },
                          bgcolor: 'background.paper',
                          p: 1,
                        }}
                      >
                        <QRCode
                          value={formatTicketQrPayload({ eventId: reg.event.id, ticketId: reg.ticketId })}
                          size={128}
                        />
                      </Box>
                    ) : (
                      <Typography color="text.secondary" variant="body2">
                        QR ticket is available after the registration is confirmed and paid.
                      </Typography>
                    )}
                  </Stack>
                </Collapse>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}
