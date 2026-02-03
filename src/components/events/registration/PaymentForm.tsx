"use client";

import { useState } from 'react';
import { 
  useStripe, 
  useElements, 
  PaymentElement 
} from '@stripe/react-stripe-js';
import { 
  Box, 
  Button, 
  Alert, 
  CircularProgress 
} from '@mui/material';

interface PaymentFormProps {
  onSuccess: () => void;
}

export default function PaymentForm({ onSuccess }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
        setError(submitError.message || "An error occurred");
        setProcessing(false);
        return;
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment/status`,
      },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message || "Payment failed");
      setProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess();
    } else {
        // Unexpected state
        setError("Unexpected payment state. Please check your dashboard.");
        setProcessing(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)}>
      <Box sx={{ mb: 3 }}>
        <PaymentElement />
      </Box>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Button
        type="submit"
        variant="contained"
        fullWidth
        size="large"
        disabled={!stripe || processing}
        startIcon={processing ? <CircularProgress size={20} color="inherit" /> : null}
      >
        {processing ? 'Processing Payment...' : 'Pay Now'}
      </Button>
    </form>
  );
}
