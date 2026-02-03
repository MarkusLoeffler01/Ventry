"use client";

import { useState } from 'react';
import { 
  ConnectComponentsProvider, 
  ConnectAccountOnboarding,
  ConnectPayouts,
  ConnectAccountManagement,
  ConnectNotificationBanner
} from "@stripe/react-connect-js";
import { loadConnectAndInitialize, type StripeConnectInstance } from "@stripe/connect-js";
import { Box, Button, CircularProgress, Alert, Typography } from '@mui/material';

interface StripeEmbeddedConnectProps {
  isConnected: boolean;
}

export default function StripeEmbeddedConnect({ isConnected }: StripeEmbeddedConnectProps) {
  const [stripeConnectInstance, setStripeConnectInstance] = useState<StripeConnectInstance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartOnboarding = async () => {
    setLoading(true);
    setError(null);

    try {
      const fetchClientSecret = async () => {
        const response = await fetch('/api/admin/stripe/connect', { method: 'POST' });
        if (!response.ok) {
          const { error } = await response.json();
          throw new Error(error || 'Failed to get client secret');
        }
        const { clientSecret } = await response.json();
        return clientSecret;
      };

      const instance = loadConnectAndInitialize({
        publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
        fetchClientSecret,
        appearance: {
          overlays: 'dialog',
          variables: {
            colorPrimary: '#635bff',
          },
        },
      });

      setStripeConnectInstance(instance);
    } catch (err) {
      console.error(err);
      setError('Failed to initialize Stripe Connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOnExit = () => {
    setStripeConnectInstance(null);
    // Reload to check status
    window.location.reload();
  };

  if (stripeConnectInstance) {
    return (
      <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
        {isConnected ? (
          <Box>
            <ConnectNotificationBanner />
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>Payouts & Balance</Typography>
              <ConnectPayouts />
            </Box>
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>Account Management</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Update your business details, personal information, and payout methods here.
              </Typography>
              <ConnectAccountManagement />
            </Box>
          </Box>
        ) : (
          <ConnectAccountOnboarding onExit={handleOnExit} />
        )}
      </ConnectComponentsProvider>
    );
  }

  return (
    <Box>
      {isConnected ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="body1" fontWeight="bold">
            Stripe Connected
          </Typography>
          Your account is active. Click below to manage payouts and settings.
        </Alert>
      ) : (
        <Typography variant="body1" gutterBottom>
          Accept payments for your events by connecting a Stripe account.
        </Typography>
      )}
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Button
        variant="contained"
        onClick={() => void handleStartOnboarding()}
        disabled={loading}
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
        sx={{ bgcolor: '#635bff', '&:hover': { bgcolor: '#4b45c6' } }}
      >
        {loading ? 'Loading...' : (isConnected ? 'Manage Payout Settings' : 'Setup Payouts')}
      </Button>
    </Box>
  );
}
