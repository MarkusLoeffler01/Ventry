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
  CircularProgress
} from '@mui/material';
import { 
  Event, 
  ConfirmationNumber, 
  LocationOn 
} from '@mui/icons-material';
import Link from 'next/link';

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

  return (
    <Stack spacing={3}>
      {registrations.map((reg) => (
        <Card key={reg.id} variant="outlined">
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
              <Box>
                <Typography variant="h6" gutterBottom>{reg.event.name}</Typography>
                <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Event fontSize="small" color="action" />
                    <Typography variant="body2">{new Date(reg.event.startDate).toLocaleDateString()}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <LocationOn fontSize="small" color="action" />
                    <Typography variant="body2">{reg.event.location?.city || 'TBD'}</Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
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
              
              <Box sx={{ minWidth: 150, textAlign: { sm: 'right' } }}>
                <Typography variant="subtitle2" gutterBottom>Payment</Typography>
                {reg.payments.map((p, idx) => (
                  <Box key={idx} sx={{ mb: 1 }}>
                    <Typography variant="h6">{p.amount}{p.currency}</Typography>
                    <Chip 
                      label={p.paymentStatus} 
                      size="small" 
                      color={p.paymentStatus === 'COMPLETED' ? 'success' : 'default'}
                    />
                  </Box>
                ))}
                <Button 
                  variant="outlined" 
                  size="small" 
                  sx={{ mt: 2 }}
                  component={Link}
                  href={`/events/${reg.event.id}`}
                >
                  Event Details
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
