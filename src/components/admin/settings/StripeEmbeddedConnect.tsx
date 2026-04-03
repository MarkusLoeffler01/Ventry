"use client";

import { useState } from 'react';
import { 
  ConnectComponentsProvider, 
  ConnectAccountOnboarding,
  ConnectPayouts,
  ConnectAccountManagement,
  ConnectNotificationBanner,
  ConnectPayments,
  ConnectBalances
} from "@stripe/react-connect-js";
import { loadConnectAndInitialize, type StripeConnectInstance } from "@stripe/connect-js";
import { Box, Button, CircularProgress, Alert, Typography, Tabs, Tab } from '@mui/material';

interface StripeEmbeddedConnectProps {
  isConnected: boolean;
}

export default function StripeEmbeddedConnect({ isConnected }: StripeEmbeddedConnectProps) {
  const [stripeConnectInstance, setStripeConnectInstance] = useState<StripeConnectInstance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardTab, setDashboardTab] = useState(0);

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
            
            <Tabs 
              value={dashboardTab} 
              onChange={(_, v) => setDashboardTab(v)} 
              sx={{ borderBottom: 1, borderColor: 'divider', mb: 3, mt: 2 }}
            >
              <Tab label="Overview" />
              <Tab label="Transactions" />
              <Tab label="Payouts" />
              <Tab label="Account Settings" />
            </Tabs>

            {dashboardTab === 0 && (
              <Box>
                <Typography variant="h6" gutterBottom>Balance Summary</Typography>
                <ConnectBalances />
              </Box>
            )}

            {dashboardTab === 1 && (
              <Box>
                <Typography variant="h6" gutterBottom>Payments & Transactions</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  View all incoming payments, fees, and manage refunds.
                </Typography>
                <ConnectPayments />
              </Box>
            )}

            {dashboardTab === 2 && (
              <Box>
                <Typography variant="h6" gutterBottom>Payout History</Typography>
                <ConnectPayouts />
              </Box>
            )}

            {dashboardTab === 3 && (
              <Box>
                <Typography variant="h6" gutterBottom>Account Management</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Update your business details and payout methods.
                </Typography>
                <ConnectAccountManagement />
              </Box>
            )}
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
