"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

type CreatedTicket = {
  id: string;
};

function getErrorMessage(raw: unknown, fallback: string) {
  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const payload = raw as {
    error?: string | Array<{ message?: string }>;
  };

  if (typeof payload.error === "string") {
    return payload.error;
  }

  if (Array.isArray(payload.error)) {
    return payload.error[0]?.message || fallback;
  }

  return fallback;
}

interface SupportTicketPanelProps {
  eventId: number;
  registrationId: string;
}

export default function SupportTicketPanel({ eventId, registrationId }: SupportTicketPanelProps) {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const handleCreateTicket = async () => {
    if (!registrationId) {
      setCreateError("Only active ticket holders can open support tickets.");
      return;
    }

    setCreateError(null);
    setCreateSuccess(null);
    setCreateLoading(true);

    try {
      const response = await fetch(`/api/event/${eventId}/support-tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject,
          description,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { ticket?: CreatedTicket; error?: unknown } | null;

      if (!response.ok || !payload?.ticket) {
        throw new Error(getErrorMessage(payload, "Failed to create support ticket"));
      }

      setSubject("");
      setDescription("");
      setCreateSuccess(`Support ticket #${payload.ticket.id.slice(-8).toUpperCase()} created. You will receive updates by email.`);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Failed to create support ticket");
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        Event Support
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Open a support ticket for this event. You can manage all your tickets in your ticket overview.
      </Typography>

      {createError ? <Alert severity="error" sx={{ mb: 2 }}>{createError}</Alert> : null}
      {createSuccess ? <Alert severity="success" sx={{ mb: 2 }}>{createSuccess}</Alert> : null}

      <Stack spacing={2}>
        <TextField
          label="Subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          fullWidth
          required
        />
        <TextField
          label="Describe your issue"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          fullWidth
          multiline
          minRows={4}
          required
        />

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            variant="contained"
            onClick={() => void handleCreateTicket()}
            disabled={createLoading || subject.trim().length < 5 || description.trim().length < 10}
          >
            {createLoading ? <CircularProgress size={20} color="inherit" /> : "Open Support Ticket"}
          </Button>

          <Button component={Link} href="/tickets" variant="outlined">
            View My Ticket Overview
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}
