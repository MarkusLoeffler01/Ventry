"use client";

import { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Stack, 
  Tabs, 
  Tab, 
  Paper, 
  MenuItem, 
  FormControlLabel, 
  Switch, 
  Grid, 
  Divider,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import { Delete, Add, Save, CloudUpload, Error as ErrorIcon } from '@mui/icons-material';
import { adminCreateEventSchema, type AdminCreateEventInput } from '@/types/schemas/event/admin';
import ImageCropper from '@/components/profile/ImageCropper';
import Image from 'next/image';

export interface InitialData {
  id?: number;
  name?: string;
  description?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  publishAt?: string | Date | null;
  registrationOpensAt?: string | Date | null;
  maxRegistrations?: number | null;
  paymentDeadline?: string | Date | null;
  status?: 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
  imageUrl?: string | null;
  location?: unknown;
  stayPolicy?: unknown;
  products?: unknown[];
  customFields?: unknown[];
}

interface EventFormProps {
  initialData?: InitialData;
  onSubmit: (data: AdminCreateEventInput) => Promise<void>;
  loading?: boolean;
}

export default function EventForm({ initialData, onSubmit, loading: externalLoading }: EventFormProps) {
  const [tabValue, setTabValue] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid, isSubmitting }
  } = useForm<AdminCreateEventInput>({
    resolver: zodResolver(adminCreateEventSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      startDate: initialData?.startDate ? new Date(initialData.startDate) : new Date(),
      endDate: initialData?.endDate ? new Date(initialData.endDate) : new Date(),
      publishAt: initialData?.publishAt ? new Date(initialData.publishAt) : null,
      registrationOpensAt: initialData?.registrationOpensAt ? new Date(initialData.registrationOpensAt) : null,
      maxRegistrations: initialData?.maxRegistrations || null,
      paymentDeadline: initialData?.paymentDeadline ? new Date(initialData.paymentDeadline) : null,
      status: initialData?.status || 'DRAFT',
      imageUrl: initialData?.imageUrl || null,
      location: {
        name: (initialData?.location as Record<string, string>)?.name || '',
        address: (initialData?.location as Record<string, string>)?.address || '',
        city: (initialData?.location as Record<string, string>)?.city || '',
        state: (initialData?.location as Record<string, string>)?.state || '',
        country: (initialData?.location as Record<string, string>)?.country || '',
        postalCode: (initialData?.location as Record<string, string>)?.postalCode || '',
      },
      stayPolicy: (initialData?.stayPolicy as AdminCreateEventInput['stayPolicy']) || {
        main: { checkIn: new Date(), checkOut: new Date() },
        earlyArrival: { enabled: false },
        lateDeparture: { enabled: false },
      },
      products: (initialData?.products as AdminCreateEventInput['products']) || [],
      customFields: (initialData?.customFields as AdminCreateEventInput['customFields']) || [],
    }
  });

  const { fields: productFields, append: addProduct, remove: removeProduct } = useFieldArray({
    control,
    name: "products"
  });

  const { fields: customFields, append: addCustomField, remove: removeCustomField } = useFieldArray({
    control,
    name: "customFields"
  });

  const watchStayPolicy = watch("stayPolicy");
  const watchImageUrl = watch("imageUrl");

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const hasTabError = (index: number) => {
    switch (index) {
      case 0: // General
        return !!(errors.name || errors.description || errors.startDate || errors.endDate || errors.status || errors.imageUrl || errors.publishAt || errors.registrationOpensAt || errors.maxRegistrations || errors.paymentDeadline);
      case 1: // Location
        return !!errors.location;
      case 2: // Stay Policy
        return !!errors.stayPolicy;
      case 3: // Products
        return !!errors.products;
      case 4: // Custom Fields
        return !!errors.customFields;
      default:
        return false;
    }
  };

  const formatDateForInput = (date: Date | string | undefined | null, type: 'datetime-local' | 'date') => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    // Adjust for timezone offset to show local time in input
    const offset = d.getTimezoneOffset() * 60000;
    const localDate = new Date(d.getTime() - offset);
    const iso = localDate.toISOString();
    
    return type === 'datetime-local' ? iso.slice(0, 16) : iso.slice(0, 10);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setCropImageSrc(reader.result?.toString() || null);
      setCropOpen(true);
    });
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', croppedBlob);

      const response = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setValue('imageUrl', data.url);
      setCropOpen(false);
    } catch (_err) {
      setError('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const onFormSubmit = async (data: AdminCreateEventInput) => {
    try {
      setError(null);
      await onSubmit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    }
  };

  return (
    <Box component="form" onSubmit={(e) => { void handleSubmit(onFormSubmit)(e); }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">{initialData?.id ? 'Edit Event' : 'Create New Event'}</Typography>
        <Button 
          type="submit" 
          variant="contained" 
          startIcon={externalLoading || isSubmitting ? <CircularProgress size={20} color="inherit" /> : <Save />}
          disabled={externalLoading || uploading || isSubmitting}
        >
          {initialData?.id ? 'Update Event' : 'Create Event'}
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      
      {!isValid && isSubmitting && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Please correct the errors in the form before submitting.
          Check the tabs marked with an error icon.
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
          <Tab label={
            <Stack direction="row" alignItems="center" gap={1}>
              General Info
              {hasTabError(0) && <ErrorIcon color="error" fontSize="small" />}
            </Stack>
          } />
          <Tab label={
            <Stack direction="row" alignItems="center" gap={1}>
              Location
              {hasTabError(1) && <ErrorIcon color="error" fontSize="small" />}
            </Stack>
          } />
          <Tab label={
            <Stack direction="row" alignItems="center" gap={1}>
              Stay Policy
              {hasTabError(2) && <ErrorIcon color="error" fontSize="small" />}
            </Stack>
          } />
          <Tab label={
            <Stack direction="row" alignItems="center" gap={1}>
              Products
              {hasTabError(3) && <ErrorIcon color="error" fontSize="small" />}
            </Stack>
          } />
          <Tab label={
            <Stack direction="row" alignItems="center" gap={1}>
              Custom Fields
              {hasTabError(4) && <ErrorIcon color="error" fontSize="small" />}
            </Stack>
          } />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Tab 0: General Info */}
          {tabValue === 0 && (
            <Stack spacing={3}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 8 }}>
                  <TextField
                    fullWidth
                    label="Event Name"
                    {...register('name')}
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    select
                    label="Status"
                    {...register('status')}
                    defaultValue="DRAFT"
                  >
                    <MenuItem value="DRAFT">Draft</MenuItem>
                    <MenuItem value="PUBLISHED">Published</MenuItem>
                    <MenuItem value="CANCELLED">Cancelled</MenuItem>
                  </TextField>
                </Grid>
              </Grid>

              <TextField
                fullWidth
                multiline
                rows={4}
                label="Description"
                {...register('description')}
                error={!!errors.description}
                helperText={errors.description?.message}
              />

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    control={control}
                    name="startDate"
                    render={({ field }) => (
                      <TextField
                        fullWidth
                        type="datetime-local"
                        label="Start Date"
                        InputLabelProps={{ shrink: true }}
                        value={formatDateForInput(field.value as Date | string | undefined, 'datetime-local')}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                        error={!!errors.startDate}
                        helperText={errors.startDate?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    control={control}
                    name="endDate"
                    render={({ field }) => (
                      <TextField
                        fullWidth
                        type="datetime-local"
                        label="End Date"
                        InputLabelProps={{ shrink: true }}
                        value={formatDateForInput(field.value as Date | string | undefined, 'datetime-local')}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                        error={!!errors.endDate}
                        helperText={errors.endDate?.message}
                      />
                    )}
                  />
                </Grid>
              </Grid>

              <Divider />
              <Typography variant="h6">Publishing & Registration</Typography>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    control={control}
                    name="publishAt"
                    render={({ field }) => (
                      <TextField
                        fullWidth
                        type="datetime-local"
                        label="Auto-Publish At"
                        helperText="Schedule when this event becomes visible to everyone."
                        InputLabelProps={{ shrink: true }}
                        value={formatDateForInput(field.value as Date | string | undefined, 'datetime-local')}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                        error={!!errors.publishAt}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    control={control}
                    name="registrationOpensAt"
                    render={({ field }) => (
                      <TextField
                        fullWidth
                        type="datetime-local"
                        label="Registration Opens At"
                        helperText="When users can start creating registrations."
                        InputLabelProps={{ shrink: true }}
                        value={formatDateForInput(field.value as Date | string | undefined, 'datetime-local')}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                        error={!!errors.registrationOpensAt}
                      />
                    )}
                  />
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Registration Limit"
                    placeholder="Unlimited"
                    {...register('maxRegistrations', { valueAsNumber: true })}
                    error={!!errors.maxRegistrations}
                    helperText={errors.maxRegistrations?.message || "Max number of participants."}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    control={control}
                    name="paymentDeadline"
                    render={({ field }) => (
                      <TextField
                        fullWidth
                        type="datetime-local"
                        label="Payment Deadline"
                        helperText="Final deadline for all payments."
                        InputLabelProps={{ shrink: true }}
                        value={formatDateForInput(field.value as Date | string | undefined, 'datetime-local')}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                        error={!!errors.paymentDeadline}
                      />
                    )}
                  />
                </Grid>
              </Grid>

              <Box>
                <Typography variant="subtitle2" gutterBottom>Event Banner</Typography>
                {watchImageUrl && (
                  <Box sx={{ mb: 2, position: 'relative', width: '100%', height: 200 }}>
                    <Image 
                      src={watchImageUrl} 
                      alt="Preview" 
                      fill 
                      style={{ objectFit: 'cover', borderRadius: 8 }} 
                    />
                  </Box>
                )}
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUpload />}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload Image'}
                  <input type="file" hidden accept="image/*" onChange={handleFileSelect} />
                </Button>
              </Box>
            </Stack>
          )}

          {/* Tab 1: Location */}
          {tabValue === 1 && (
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Venue Name"
                {...register('location.name')}
                error={!!errors.location?.name}
                helperText={errors.location?.name?.message}
              />
              <TextField
                fullWidth
                label="Address"
                {...register('location.address')}
                error={!!errors.location?.address}
                helperText={errors.location?.address?.message}
              />
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="City"
                    {...register('location.city')}
                    error={!!errors.location?.city}
                    helperText={errors.location?.city?.message}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Postal Code"
                    {...register('location.postalCode')}
                    error={!!errors.location?.postalCode}
                    helperText={errors.location?.postalCode?.message}
                  />
                </Grid>
              </Grid>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="State/Region"
                    {...register('location.state')}
                    error={!!errors.location?.state}
                    helperText={errors.location?.state?.message}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Country"
                    {...register('location.country')}
                    error={!!errors.location?.country}
                    helperText={errors.location?.country?.message}
                  />
                </Grid>
              </Grid>
            </Stack>
          )}

          {/* Tab 2: Stay Policy */}
          {tabValue === 2 && (
            <Stack spacing={4}>
              <Box>
                <Typography variant="h6" gutterBottom>Main Dates</Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      control={control}
                      name="stayPolicy.main.checkIn"
                      render={({ field }) => (
                        <TextField
                          fullWidth
                          type="date"
                          label="Main Check-in"
                          InputLabelProps={{ shrink: true }}
                          value={formatDateForInput(field.value as Date | string | undefined, 'date')}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      control={control}
                      name="stayPolicy.main.checkOut"
                      render={({ field }) => (
                        <TextField
                          fullWidth
                          type="date"
                          label="Main Check-out"
                          InputLabelProps={{ shrink: true }}
                          value={formatDateForInput(field.value as Date | string | undefined, 'date')}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              <Box>
                <FormControlLabel
                  control={
                    <Controller
                      name="stayPolicy.earlyArrival.enabled"
                      control={control}
                      render={({ field }) => (
                        <Switch
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      )}
                    />
                  }
                  label="Enable Early Arrival"
                />
                {watchStayPolicy.earlyArrival.enabled && (
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Controller
                        control={control}
                        name="stayPolicy.earlyArrival.from"
                        render={({ field }) => (
                          <TextField
                            fullWidth
                            type="date"
                            label="Available From"
                            InputLabelProps={{ shrink: true }}
                            value={formatDateForInput(field.value as Date | string | undefined, 'date')}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                          />
                        )}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Fee Per Night"
                        {...register('stayPolicy.earlyArrival.feePerNight', { valueAsNumber: true })}
                      />
                    </Grid>
                  </Grid>
                )}
              </Box>

              <Divider />

              <Box>
                <FormControlLabel
                  control={
                    <Controller
                      name="stayPolicy.lateDeparture.enabled"
                      control={control}
                      render={({ field }) => (
                        <Switch
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      )}
                    />
                  }
                  label="Enable Late Departure"
                />
                {watchStayPolicy.lateDeparture.enabled && (
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Controller
                        control={control}
                        name="stayPolicy.lateDeparture.until"
                        render={({ field }) => (
                          <TextField
                            fullWidth
                            type="date"
                            label="Available Until"
                            InputLabelProps={{ shrink: true }}
                            value={formatDateForInput(field.value as Date | string | undefined, 'date')}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                          />
                        )}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Fee Per Night"
                        {...register('stayPolicy.lateDeparture.feePerNight', { valueAsNumber: true })}
                      />
                    </Grid>
                  </Grid>
                )}
              </Box>
            </Stack>
          )}

          {/* Tab 3: Products */}
          {tabValue === 3 && (
            <Stack spacing={3}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Tickets & Add-ons</Typography>
                <Button startIcon={<Add />} onClick={() => addProduct({ name: '', price: 0 })}>
                  Add Product
                </Button>
              </Stack>
              
              {productFields.map((field, index) => (
                <Paper key={field.id} variant="outlined" sx={{ p: 2, position: 'relative' }}>
                  <IconButton 
                    size="small" 
                    color="error" 
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                    onClick={() => removeProduct(index)}
                  >
                    <Delete />
                  </IconButton>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Product Name"
                        {...register(`products.${index}.name` as const)}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Price"
                        {...register(`products.${index}.price` as const, { valueAsNumber: true })}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 12 }}>
                      <TextField
                        fullWidth
                        size="small"
                        multiline
                        rows={2}
                        label="Description"
                        {...register(`products.${index}.description` as const)}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              ))}
              
              {productFields.length === 0 && (
                <Alert severity="info">No products added yet. Add at least one ticket tier.</Alert>
              )}
            </Stack>
          )}

          {/* Tab 4: Custom Fields */}
          {tabValue === 4 && (
            <Stack spacing={3}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Additional Registration Questions</Typography>
                <Button 
                  startIcon={<Add />} 
                  onClick={() => addCustomField({ id: Math.random().toString(36).substring(7), label: '', type: 'text', required: false })}
                >
                  Add Field
                </Button>
              </Stack>

              {customFields.map((field, index) => (
                <Paper key={field.id} variant="outlined" sx={{ p: 2, position: 'relative' }}>
                  <IconButton 
                    size="small" 
                    color="error" 
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                    onClick={() => removeCustomField(index)}
                  >
                    <Delete />
                  </IconButton>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 5 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Question Label"
                        {...register(`customFields.${index}.label` as const)}
                        error={!!(errors.customFields as unknown as Record<string, { label?: object }> | undefined)?.[index]?.label}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField
                        fullWidth
                        size="small"
                        select
                        label="Input Type"
                        {...register(`customFields.${index}.type` as const)}
                      >
                        <MenuItem value="text">Text</MenuItem>
                        <MenuItem value="number">Number</MenuItem>
                        <MenuItem value="boolean">Checkbox (Yes/No)</MenuItem>
                        <MenuItem value="select">Dropdown (Select)</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <FormControlLabel
                        control={<Switch {...register(`customFields.${index}.required` as const)} />}
                        label="Required"
                      />
                    </Grid>

                    {/* Options for Select type */}
                    {watch(`customFields.${index}.type`) === 'select' && (
                      <Grid size={{ xs: 12 }}>
                        <Box sx={{ mt: 2, pl: 2, borderLeft: '2px solid', borderColor: 'primary.light' }}>
                          <Typography variant="subtitle2" gutterBottom>Dropdown Options</Typography>
                          <Stack spacing={1}>
                            {(watch(`customFields.${index}.options`) || []).map((opt: string, optIndex: number) => (
                              <Stack key={optIndex} direction="row" spacing={1} alignItems="center">
                                <TextField
                                  size="small"
                                  placeholder={`Option ${optIndex + 1}`}
                                  value={opt}
                                  onChange={(e) => {
                                    const currentOptions = [...(watch(`customFields.${index}.options`) || [])];
                                    currentOptions[optIndex] = e.target.value;
                                    setValue(`customFields.${index}.options`, currentOptions);
                                  }}
                                />
                                <IconButton size="small" color="error" onClick={() => {
                                  const currentOptions = [...(watch(`customFields.${index}.options`) || [])];
                                  currentOptions.splice(optIndex, 1);
                                  setValue(`customFields.${index}.options`, currentOptions);
                                }}>
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Stack>
                            ))}
                            <Button 
                              size="small" 
                              startIcon={<Add />} 
                              onClick={() => {
                                const currentOptions = [...(watch(`customFields.${index}.options`) || [])];
                                setValue(`customFields.${index}.options`, [...currentOptions, '']);
                              }}
                              sx={{ alignSelf: 'flex-start' }}
                            >
                              Add Option
                            </Button>
                          </Stack>
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              ))}

              {customFields.length === 0 && (
                <Alert severity="info">No custom questions added yet.</Alert>
              )}
            </Stack>
          )}
        </Box>
      </Paper>

      <ImageCropper
        open={cropOpen}
        imageSrc={cropImageSrc}
        onCancel={() => {
          setCropOpen(false);
          setCropImageSrc(null);
        }}
        onCropComplete={handleCropComplete}
        aspect={1200 / 630} // Banner aspect ratio
      />
    </Box>
  );
}
