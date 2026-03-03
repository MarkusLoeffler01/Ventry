"use client";

import { useState } from 'react';
import { 
  Box, 
  Stepper, 
  Step, 
  StepLabel, 
  Button, 
  Typography, 
  RadioGroup, 
  FormControlLabel, 
  Radio, 
  Stack, 
  Paper, 
  Divider,
  Alert,
  Checkbox,
  CircularProgress,
  Grid,
  TextField,
  MenuItem
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { type SerializedStayPolicy } from '@/types/event';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripeClient';
import PaymentForm from '@/components/events/registration/PaymentForm';

interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  required: boolean;
  options?: string[];
}

interface RegistrationWizardProps {
  event: {
    id: number;
    name: string;
    products: Array<{ id: string; name: string; price: number; description: string | null }>;
    stayPolicy: SerializedStayPolicy | null;
    customFields: CustomField[];
  };
  userId: string;
  initialRegistration?: {
    id: string;
    preferences: {
      productId?: string;
      needsHotel?: boolean;
      earlyArrival?: boolean;
      lateDeparture?: boolean;
      customFieldsData?: Record<string, string | number | boolean>;
      showOnAttendees?: boolean;
    };
    status: string;
  };
}

export default function RegistrationWizard({ event, userId, initialRegistration }: RegistrationWizardProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedProductId, setSelectedProductId] = useState<string>(initialRegistration?.preferences?.productId || '');
  
  // Initialize from initialRegistration if editing
  const [needsHotel, setNeedsHotel] = useState(initialRegistration?.preferences?.needsHotel || false);
  const [earlyArrival, setEarlyArrival] = useState(initialRegistration?.preferences?.earlyArrival || false);
  const [lateDeparture, setLateDeparture] = useState(initialRegistration?.preferences?.lateDeparture || false);
  const [showOnAttendees, setShowOnAttendees] = useState(
    initialRegistration?.preferences?.showOnAttendees || false
  );
  const [customFieldsData, setCustomFieldsData] = useState<Record<string, string | number | boolean>>(
    initialRegistration?.preferences?.customFieldsData || {}
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const router = useRouter();

  const baseSteps = ['Choose Badge', 'Stay Preferences'];
  if (event.customFields?.length > 0) {
    baseSteps.push('Additional Info');
  }
  const steps = [...baseSteps, 'Confirm', 'Payment'];

  const handleNext = () => {
    if (activeStep === 0 && !selectedProductId) {
      setError('Please select a badge type');
      return;
    }
    
    // Validate custom fields if we are on that step
    if (steps[activeStep] === 'Additional Info') {
      const missingRequired = event.customFields.find(f => f.required && !customFieldsData[f.id] && customFieldsData[f.id] !== 0);
      if (missingRequired) {
        setError(`"${missingRequired.label}" is required`);
        return;
      }
    }

    setError(null);
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      if (initialRegistration) {
        // Update case
        const response = await fetch(`/api/event/${event.id}/update`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            productId: selectedProductId,
            preferences: {
              needsHotel,
              earlyArrival,
              lateDeparture,
              customFieldsData,
              showOnAttendees
            }
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Update failed');
        }

        const { paymentId } = await response.json();

        // 2. Create Payment Intent
        const intentResponse = await fetch('/api/payment/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId }),
        });

        if (!intentResponse.ok) {
          throw new Error('Failed to initialize payment');
        }

        const { clientSecret } = await intentResponse.json();
        setClientSecret(clientSecret);
        setActiveStep((prev) => prev + 1);
        return;
      }

      // 1. Create Registration & Payment Record
      const response = await fetch(`/api/event/${event.id}/attend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          productId: selectedProductId,
          preferences: {
            needsHotel,
            earlyArrival,
            lateDeparture,
            customFieldsData,
            showOnAttendees
          }
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Registration failed');
      }

      const { paymentId } = await response.json();

      // 2. Create Payment Intent
      const intentResponse = await fetch('/api/payment/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      });

      if (!intentResponse.ok) {
        throw new Error('Failed to initialize payment');
      }

      const { clientSecret } = await intentResponse.json();
      setClientSecret(clientSecret);
      setActiveStep((prev) => prev + 1);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    router.push('/profile?message=registration_success');
  };

  const selectedProduct = event.products.find(p => p.id === selectedProductId);

  const calculateTotal = () => {
    let total = selectedProduct?.price || 0;
    if (earlyArrival && event.stayPolicy?.earlyArrival?.feePerNight) {
      total += event.stayPolicy.earlyArrival.feePerNight;
    }
    if (lateDeparture && event.stayPolicy?.lateDeparture?.feePerNight) {
      total += event.stayPolicy.lateDeparture.feePerNight;
    }
    return total;
  };

  const totalAmount = calculateTotal();

  return (
    <Grid container spacing={4} alignItems="stretch">
      <Grid size={{ xs: 12, md: 8 }}>
        <Paper 
          elevation={3} 
          sx={{ 
            p: { xs: 3, md: 6 }, 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            minHeight: 600
          }}
        >
          <Box sx={{ width: '100%', flexGrow: 1 }}>
            <Stepper activeStep={activeStep} sx={{ mb: 6 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

            {/* Step 0: Product Selection */}
            {activeStep === 0 && (
              <Box>
                <Typography variant="h6" gutterBottom>Select your badge tier</Typography>
                <RadioGroup 
                  value={selectedProductId} 
                  onChange={(e) => setSelectedProductId(e.target.value)}
                >
                  <Stack spacing={2}>
                    {event.products.map((product) => (
                      <Paper 
                        key={product.id} 
                        variant="outlined" 
                        sx={{ 
                          p: 3, 
                          cursor: 'pointer',
                          borderColor: selectedProductId === product.id ? 'primary.main' : 'divider',
                          bgcolor: selectedProductId === product.id ? 'primary.50' : 'background.paper',
                          '&:hover': { borderColor: 'primary.light' }
                        }}
                        onClick={() => setSelectedProductId(product.id)}
                      >
                        <FormControlLabel 
                          value={product.id} 
                          control={<Radio />} 
                          label={
                            <Box>
                              <Typography variant="h6">{product.name} - {product.price}€</Typography>
                              {product.description && (
                                <Typography variant="body2" color="text.secondary">{product.description}</Typography>
                              )}
                            </Box>
                          }
                          sx={{ width: '100%', m: 0 }}
                        />
                      </Paper>
                    ))}
                  </Stack>
                </RadioGroup>
              </Box>
            )}

            {/* Step 1: Stay Preferences */}
            {activeStep === 1 && (
              <Box>
                <Typography variant="h6" gutterBottom>Accommodation</Typography>
                <Stack spacing={3}>
                  <Paper variant="outlined" sx={{ p: 3 }}>
                    <FormControlLabel
                      control={<Checkbox checked={needsHotel} onChange={(e) => setNeedsHotel(e.target.checked)} />}
                      label="I will be staying at the convention hotel"
                    />
                    {needsHotel && (
                      <Box sx={{ mt: 2, pl: 4 }}>
                        {event.stayPolicy?.earlyArrival?.enabled && (
                          <FormControlLabel
                            control={<Checkbox checked={earlyArrival} onChange={(e) => setEarlyArrival(e.target.checked)} />}
                            label={
                              <Typography>
                                Request Early Arrival (from {event.stayPolicy.earlyArrival.from?.toString()}) 
                                {event.stayPolicy.earlyArrival.feePerNight ? ` - +${event.stayPolicy.earlyArrival.feePerNight}€` : ''}
                              </Typography>
                            }
                          />
                        )}
                        {event.stayPolicy?.lateDeparture?.enabled && (
                          <FormControlLabel
                            control={<Checkbox checked={lateDeparture} onChange={(e) => setLateDeparture(e.target.checked)} />}
                            label={
                              <Typography>
                                Request Late Departure (until {event.stayPolicy.lateDeparture.until?.toString()})
                                {event.stayPolicy.lateDeparture.feePerNight ? ` - +${event.stayPolicy.lateDeparture.feePerNight}€` : ''}
                              </Typography>
                            }
                          />
                        )}
                      </Box>
                    )}
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 3 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={showOnAttendees}
                          onChange={(e) => setShowOnAttendees(e.target.checked)}
                        />
                      }
                      label="Show my name on the attendees page"
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ pl: 4 }}>
                      If unchecked, you will appear as &quot;Anonymous&quot;.
                    </Typography>
                  </Paper>
                </Stack>
                          </Box>
                        )}
              
                        {/* Step: Additional Info (Custom Fields) */}
                        {steps[activeStep] === 'Additional Info' && (
                          <Box>
                            <Typography variant="h6" gutterBottom>Additional Questions</Typography>
                            <Stack spacing={3}>
                              {event.customFields.map((field) => (
                                <Box key={field.id}>
                                                      {field.type === 'boolean' ? (
                                                        <FormControlLabel
                                                          control={
                                                            <Checkbox 
                                                              checked={!!customFieldsData[field.id]} 
                                                              onChange={(e) => setCustomFieldsData(prev => ({ ...prev, [field.id]: e.target.checked }))} 
                                                            />
                                                          }
                                                          label={`${field.label}${field.required ? ' *' : ''}`}
                                                        />
                                                      ) : field.type === 'select' ? (
                                                        <TextField
                                                          fullWidth
                                                          select
                                                          label={field.label}
                                                          required={field.required}
                                                          value={customFieldsData[field.id] || ''}
                                                          onChange={(e) => setCustomFieldsData(prev => ({ ...prev, [field.id]: e.target.value }))}
                                                        >
                                                          {field.options?.map((option) => (
                                                            <MenuItem key={option} value={option}>
                                                              {option}
                                                            </MenuItem>
                                                          ))}
                                                        </TextField>
                                                      ) : (
                                                        <TextField
                                                          fullWidth
                                                          label={field.label}
                                                          type={field.type === 'number' ? 'number' : 'text'}
                                                          required={field.required}
                                                          value={customFieldsData[field.id] || ''}
                                                          onChange={(e) => setCustomFieldsData(prev => ({ 
                                                            ...prev, 
                                                            [field.id]: field.type === 'number' ? Number(e.target.value) : e.target.value 
                                                          }))}
                                                        />
                                                      )}                                </Box>
                              ))}
                            </Stack>
                          </Box>
                        )}
              
                        {/* Step: Confirm */}
                        {steps[activeStep] === 'Confirm' && (
                          <Box>
                            <Typography variant="h6" gutterBottom>Review your registration</Typography>
                            <Box sx={{ mb: 4 }}>
                              <Stack spacing={2}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography color="text.secondary">Badge Type:</Typography>
                                  <Typography fontWeight="bold">{selectedProduct?.name}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography color="text.secondary">Hotel Stay:</Typography>
                                  <Typography>{needsHotel ? 'Yes' : 'No'}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography color="text.secondary">Attendee List:</Typography>
                                  <Typography>{showOnAttendees ? 'Show my name' : 'Anonymous'}</Typography>
                                </Box>
                                {event.customFields.map(field => (
                                  <Box key={field.id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography color="text.secondary">{field.label}:</Typography>
                                    <Typography>
                                      {field.type === 'boolean' 
                                        ? (customFieldsData[field.id] ? 'Yes' : 'No') 
                                        : String(customFieldsData[field.id] || '-')}
                                    </Typography>
                                  </Box>
                                ))}
                                <Divider />
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography variant="h5">Total Amount:</Typography>
                                  <Typography variant="h5" fontWeight="bold" color="primary">{totalAmount}€</Typography>
                                </Box>
                              </Stack>
                            </Box>
                            <Alert severity="info">Payment will be handled at the convention or via bank transfer instructions sent to your email.</Alert>
                          </Box>
                        )}
                        {/* Step: Payment */}
                        {steps[activeStep] === 'Payment' && clientSecret && (              <Box>
                <Typography variant="h6" gutterBottom>Complete Payment</Typography>
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <PaymentForm onSuccess={handlePaymentSuccess} />
                </Elements>
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 6, gap: 2 }}>
            {steps[activeStep] !== 'Payment' && (
              <Button disabled={activeStep === 0 || loading} onClick={handleBack}>
                Back
              </Button>
            )}
            {steps[activeStep] === 'Confirm' ? (
              <Button 
                variant="contained" 
                onClick={() => void handleSubmit()} 
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
              >
                {loading ? 'Processing...' : 'Proceed to Payment'}
              </Button>
            ) : activeStep < steps.length - 1 && steps[activeStep] !== 'Payment' ? (
              <Button variant="contained" onClick={handleNext}>
                Next
              </Button>
            ) : null}
          </Box>
        </Paper>
      </Grid>

      {/* Summary Sidebar */}
      <Grid size={{ xs: 12, md: 4 }}>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column'
          }}
        >
          <Typography variant="h6" gutterBottom fontWeight="bold">Summary</Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Stack spacing={2} sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body1" color="text.secondary">
                {selectedProduct ? selectedProduct.name : 'Badge Selection'}
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {selectedProduct ? `${selectedProduct.price}€` : '-'}
              </Typography>
            </Box>

            {needsHotel && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Hotel Stay</Typography>
                <Typography variant="body2" fontWeight="medium">Included</Typography>
              </Box>
            )}

            {earlyArrival && event.stayPolicy?.earlyArrival?.feePerNight && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Early Arrival Fee</Typography>
                <Typography variant="body2" fontWeight="medium">+{event.stayPolicy.earlyArrival.feePerNight}€</Typography>
              </Box>
            )}

            {lateDeparture && event.stayPolicy?.lateDeparture?.feePerNight && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Late Departure Fee</Typography>
                <Typography variant="body2" fontWeight="medium">+{event.stayPolicy.lateDeparture.feePerNight}€</Typography>
              </Box>
            )}
          </Stack>

          <Box sx={{ mt: 'auto' }}>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight="bold">Total</Typography>
              <Typography variant="h4" color="primary.main" fontWeight="bold">{totalAmount}€</Typography>
            </Box>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
}
