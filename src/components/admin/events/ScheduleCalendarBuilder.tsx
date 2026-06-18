"use client";

import { useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateSelectArg, EventApi, EventClickArg, EventDropArg } from '@fullcalendar/core';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';
import { Box, Paper, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Grid } from '@mui/material';

export interface ScheduleItem {
  id?: string;
  title: string;
  startTime: string;
  endTime?: string;
  location?: string;
  description?: string;
}

interface ScheduleCalendarBuilderProps {
  items: ScheduleItem[];
  onChange: (items: ScheduleItem[]) => void;
  eventStartDate?: Date;
}

export default function ScheduleCalendarBuilder({ items, onChange, eventStartDate }: ScheduleCalendarBuilderProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);

  const mappedEvents = items.map((item, index) => ({
    id: item.id || `item-${index}`,
    title: item.title,
    start: item.startTime,
    end: item.endTime,
    extendedProps: {
      location: item.location,
      description: item.description,
      originalIndex: index
    }
  }));

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setEditingItem({
      title: '',
      startTime: selectInfo.startStr,
      endTime: selectInfo.endStr,
      location: '',
      description: ''
    });
    setDialogOpen(true);
    selectInfo.view.calendar.unselect(); // clear date selection
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const props = clickInfo.event.extendedProps;
    setEditingItem({
      id: clickInfo.event.id,
      title: clickInfo.event.title,
      startTime: clickInfo.event.startStr,
      endTime: clickInfo.event.endStr,
      location: props.location,
      description: props.description
    });
    setDialogOpen(true);
  };

  const handleEventDrop = (dropInfo: EventDropArg) => {
    updateEventFromCalendar(dropInfo.event);
  };

  const handleEventResize = (resizeInfo: EventResizeDoneArg) => {
    updateEventFromCalendar(resizeInfo.event);
  };

  const updateEventFromCalendar = (eventInput: EventApi) => {
    const updatedItems = items.map((item, index) => {
      const matchId = item.id || `item-${index}`;
      if (matchId === eventInput.id) {
        return {
          ...item,
          startTime: eventInput.startStr,
          endTime: eventInput.endStr
        };
      }
      return item;
    });
    onChange(updatedItems);
  };

  const handleSave = () => {
    if (!editingItem) return;

    if (editingItem.id) {
      // Update existing
      const updatedItems = items.map((item, index) => {
        const matchId = item.id || `item-${index}`;
        if (matchId === editingItem.id) {
          return editingItem;
        }
        return item;
      });
      onChange(updatedItems);
    } else {
      // Add new
      onChange([...items, { ...editingItem, id: `item-${Date.now()}` }]);
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (!editingItem?.id) return;
    const updatedItems = items.filter((item, index) => {
      const matchId = item.id || `item-${index}`;
      return matchId !== editingItem.id;
    });
    onChange(updatedItems);
    setDialogOpen(false);
  };

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 2, minHeight: 600 }}>
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridDay"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          initialDate={eventStartDate || new Date()}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          events={mappedEvents}
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          height="auto"
        />
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingItem?.id ? 'Edit Session' : 'Add Session'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Session Title"
                value={editingItem?.title || ''}
                onChange={(e) => setEditingItem(prev => prev ? { ...prev, title: e.target.value } : null)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                type="datetime-local"
                label="Start Time"
                InputLabelProps={{ shrink: true }}
                value={editingItem?.startTime ? editingItem.startTime.slice(0, 16) : ''}
                onChange={(e) => setEditingItem(prev => prev ? { ...prev, startTime: e.target.value } : null)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                type="datetime-local"
                label="End Time"
                InputLabelProps={{ shrink: true }}
                value={editingItem?.endTime ? editingItem.endTime.slice(0, 16) : ''}
                onChange={(e) => setEditingItem(prev => prev ? { ...prev, endTime: e.target.value } : null)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Location"
                value={editingItem?.location || ''}
                onChange={(e) => setEditingItem(prev => prev ? { ...prev, location: e.target.value } : null)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={editingItem?.description || ''}
                onChange={(e) => setEditingItem(prev => prev ? { ...prev, description: e.target.value } : null)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          {editingItem?.id && (
            <Button color="error" onClick={handleDelete} sx={{ mr: 'auto' }}>
              Delete
            </Button>
          )}
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!editingItem?.title}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
