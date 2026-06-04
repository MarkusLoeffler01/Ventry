"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Container, 
  Paper, 
  Typography, 
  Box, 
  CircularProgress, 
  Button, 
  Alert,
  Stack,
  Divider
} from '@mui/material';
import { CheckCircle, Error as ErrorIcon, Info, Receipt, AccountBalance } from '@mui/icons-material';

interface StripeStatus {
  status: string;
  amount: number;
  currency: string;
  next_action?: {
    display_bank_transfer_instructions?: {
      financial_addresses?: Array<{
        iban?: {
          iban: string;
          bic: string;
          account_holder_name: string;
        };
      }>;
    };
  };
}

function PaymentStatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const paymentIntentId = searchParams.get('payment_intent');

  useEffect(() => {
    if (!paymentIntentId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- early-exit error state in effect
      setError("No payment information found.");
      setLoading(false);
      return;
    }

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/payment/status?payment_intent=${paymentIntentId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch payment status");
        }
        const data = await response.json();
        setStatus(data.paymentIntent);
      } catch (_err) {
        setError("Could not verify your payment status. Please check your profile.");
      } finally {
        setLoading(false);
      }
    };

    void fetchStatus();
  }, [paymentIntentId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 10 }}>
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="h6" color="text.secondary">Verifying payment status...</Typography>
      </Box>
    );
  }

  if (error || !status) {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="error" variant="filled" sx={{ mb: 3 }}>{error}</Alert>
        <Button variant="contained" onClick={() => router.push('/profile')}>Go to Profile</Button>
      </Box>
    );
  }

  const isSuccess = status.status === 'succeeded';
  const isProcessing = status.status === 'processing';
  const requiresAction = status.status === 'requires_action';
  const bankInstructions = status.next_action?.display_bank_transfer_instructions;

  return (
    <Box sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 3, md: 6 }, borderRadius: 3, textAlign: 'center' }}>
        {isSuccess ? (
          <>
            <CheckCircle color="success" sx={{ fontSize: 80, mb: 2 }} />
            <Typography variant="h3" gutterBottom fontWeight="bold">Payment Successful!</Typography>
            <Typography variant="h6" color="text.secondary" mb={4}>
              Your registration for the event is now confirmed.
            </Typography>
          </>
        ) : isProcessing ? (
          <>
            <Info color="info" sx={{ fontSize: 80, mb: 2 }} />
            <Typography variant="h3" gutterBottom fontWeight="bold">Payment Processing</Typography>
            <Typography variant="h6" color="text.secondary" mb={4}>
              Your payment is being processed by your bank. This may take a few minutes or days depending on the method.
            </Typography>
          </>
        ) : requiresAction && bankInstructions ? (
          <Box sx={{ textAlign: 'left' }}>
            <Stack direction="row" alignItems="center" spacing={2} mb={3} justifyContent="center">
              <AccountBalance color="primary" sx={{ fontSize: 40 }} />
              <Typography variant="h4" fontWeight="bold">Bank Transfer Instructions</Typography>
            </Stack>
            
            <Alert severity="info" sx={{ mb: 4 }}>
              Your registration is <strong>pending</strong>. Please complete the transfer using the details below to secure your spot.
            </Alert>

            <Paper variant="outlined" sx={{ p: 3, bgcolor: 'grey.50', mb: 4 }}>
              <Typography variant="h6" gutterBottom>Payment Details</Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">Amount to Transfer:</Typography>
                  <Typography fontWeight="bold" variant="h6">{(status.amount / 100).toFixed(2)} {status.currency.toUpperCase()}</Typography>
                </Box>
                {bankInstructions.financial_addresses?.map((addr, idx: number) => (
                  <Box key={idx} sx={{ mt: 1 }}>
                    {addr.iban && (
                      <>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography color="text.secondary">IBAN:</Typography>
                          <Typography sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{addr.iban.iban}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography color="text.secondary">BIC:</Typography>
                          <Typography sx={{ fontFamily: 'monospace' }}>{addr.iban.bic}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography color="text.secondary">Account Holder:</Typography>
                          <Typography>{addr.iban.account_holder_name}</Typography>
                        </Box>
                      </>
                    )}
                  </Box>
                ))}
              </Stack>
            </Paper>

            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 4 }}>
              Please note: It can take up to 3-5 business days for bank transfers to be confirmed. You will receive an email once we receive the funds.
            </Typography>
          </Box>
        ) : (
          <>
            <ErrorIcon color="error" sx={{ fontSize: 80, mb: 2 }} />
            <Typography variant="h3" gutterBottom fontWeight="bold">Payment {status.status.replace('_', ' ')}</Typography>
            <Typography variant="h6" color="text.secondary" mb={4}>
              There was an issue or update with your payment. Current status: {status.status}.
            </Typography>
          </>
        )}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
          <Button 
            variant="contained" 
            size="large" 
            onClick={() => router.push('/profile')}
            startIcon={<Receipt />}
          >
            View My Registrations
          </Button>
          <Button 
            variant="outlined" 
            size="large" 
            onClick={() => router.push('/')}
          >
            Back to Homepage
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}

export default function PaymentStatusPage() {
  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Suspense fallback={<CircularProgress />}>
        <PaymentStatusContent />
      </Suspense>
    </Container>
  );
}
