"use client";

import { 
  Box, 
  Typography, 
  Stack, 
  Button, 
  Chip, 
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress
} from "@mui/material";
import { 
  CheckCircle, 
  Pending, 
  Payment as PaymentIcon,
  Edit,
  Cancel,
  CreditCard
} from "@mui/icons-material";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Elements } from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripeClient";
import PaymentForm from "./registration/PaymentForm";

interface EventRegistrationStatusProps {
  registration: {
    id: string;
    status: string;
    ticketId: number;
    expiresAt?: string | Date | null;
    payments: Array<{
      id: string;
      amount: number;
      paymentStatus: string;
      paymentProvider: string;
    }>;
  };
  event: {
    id: number;
    name: string;
  };
}

export default function EventRegistrationStatus({ registration, event }: EventRegistrationStatusProps) {
  const [loading, setLoading] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const router = useRouter();
  const latestPayment = registration.payments[0];
  const hasCompletedPayment = registration.payments.some((payment) => payment.paymentStatus === 'COMPLETED');

  const isExpired = registration.expiresAt && new Date(registration.expiresAt) < new Date() && registration.status === 'PENDING';

  const handleStartPayment = async () => {
    if (!latestPayment || isExpired) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/payment/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: latestPayment.id }),
      });

      if (!response.ok) throw new Error("Failed to initialize payment");

      const data = await response.json();
      setClientSecret(data.clientSecret);
      setPaymentDialogOpen(true);
    } catch (error) {
      console.error(error);
      alert("Payment initialization failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setPaymentDialogOpen(false);
    router.refresh();
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your registration?")) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/event/${event.id}/cancel`, {
        method: 'POST',
      });
      
      if (response.ok) {
        router.refresh();
      } else {
        alert("Failed to cancel registration");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = () => {
    if (registration.status === 'CANCELLED') {
      return {
        label: 'Cancelled',
        color: 'error' as const,
        icon: <Cancel />,
        message: 'This registration has been cancelled.'
      };
    }

    if (isExpired) {
      return {
        label: 'Expired',
        color: 'error' as const,
        icon: <Cancel />,
        message: 'Payment deadline exceeded. Registration is no longer valid.'
      };
    }

    if (latestPayment?.paymentStatus === 'PENDING') {
      return {
        label: 'Awaiting Payment',
        color: 'warning' as const,
        icon: <PaymentIcon />,
        message: registration.expiresAt 
          ? `Please complete your payment by ${new Date(registration.expiresAt).toLocaleString()}.`
          : 'Please complete your payment.'
      };
    }

    if (registration.status === 'CONFIRMED') {
      return {
        label: 'Registered',
        color: 'success' as const,
        icon: <CheckCircle />,
        message: 'Your spot is secured!'
      };
    }

    return {
      label: 'Pending',
      color: 'info' as const,
      icon: <Pending />,
      message: 'Your registration is being processed.'
    };
  };

  const status = getStatusDisplay();

  return (
    <Box>
      <Alert 
        severity={status.color} 
        icon={status.icon}
        sx={{ mb: 3, borderRadius: 2 }}
      >
        <Typography variant="subtitle2" fontWeight="bold">
          {status.label}
        </Typography>
        <Typography variant="body2">
          {status.message}
        </Typography>
      </Alert>

      <Stack spacing={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">Ticket ID:</Typography>
          <Chip label={`#${registration.ticketId}`} size="small" variant="outlined" />
        </Box>
        
        {registration.expiresAt && registration.status === 'PENDING' && !isExpired && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">Pay by:</Typography>
            <Typography variant="body2" fontWeight="bold">
              {new Date(registration.expiresAt).toLocaleString()}
            </Typography>
          </Box>
        )}
        
        <Divider />

        {latestPayment?.paymentStatus === 'PENDING' && !isExpired && (
          <Button 
            fullWidth 
            variant="contained" 
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CreditCard />}
            onClick={() => void handleStartPayment()}
            disabled={loading}
          >
            Pay Now ({latestPayment.amount}€)
          </Button>
        )}

        {!isExpired && registration.status !== 'CANCELLED' && (
          hasCompletedPayment ? (
            <>
              <Button 
                fullWidth 
                variant="outlined" 
                startIcon={<Edit />}
                component={Link}
                href={`/events/${event.id}/register?mode=extras`}
              >
                Add Extras / Update Details
              </Button>
              <Typography variant="caption" color="text.secondary">
                Ticket and hotel changes after payment require organizer support.
              </Typography>
            </>
          ) : (
            <Button 
              fullWidth 
              variant="outlined" 
              startIcon={<Edit />}
              component={Link}
              href={`/events/${event.id}/register`}
            >
              Edit Attendance
            </Button>
          )
        )}

        {registration.status !== 'CANCELLED' && (
          <Button 
            fullWidth 
            color="error" 
            variant="text" 
            startIcon={<Cancel />}
            onClick={() => void handleCancel()}
            disabled={loading}
          >
            Cancel Registration
          </Button>
        )}
      </Stack>

      {/* Payment Dialog */}
      <Dialog 
        open={paymentDialogOpen} 
        onClose={() => setPaymentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Complete Your Payment</DialogTitle>
        <DialogContent dividers>
          {clientSecret && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentForm onSuccess={handlePaymentSuccess} />
            </Elements>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
