"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import EventForm from '@/components/admin/events/EventForm';
import { type AdminCreateEventInput } from '@/types/schemas/event/admin';
import { Box } from '@mui/material';
import { type SerializedEvent } from '@/types/event';

import { type InitialData } from '@/components/admin/events/EventForm';

interface EditEventClientProps {
  event: SerializedEvent;
}

export default function EditEventClient({ event }: EditEventClientProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (data: AdminCreateEventInput) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/event/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update event');
      }

      router.push('/admin/events');
      router.refresh();
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ py: 4 }}>
      <EventForm initialData={event as unknown as InitialData} onSubmit={handleSubmit} loading={loading} />
    </Box>
  );
}
