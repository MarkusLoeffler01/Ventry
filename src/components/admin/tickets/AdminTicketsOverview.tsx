"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

const STATUS_OPTIONS: TicketStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

function getStatusColor(status: TicketStatus): "default" | "warning" | "success" | "error" {
  switch (status) {
    case "OPEN":
      return "warning";
    case "IN_PROGRESS":
      return "default";
    case "RESOLVED":
      return "success";
    case "CLOSED":
      return "error";
    default:
      return "default";
  }
}

interface AdminTicket {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  adminResponse: string | null;
  updatedAt: string;
  event: {
    id: number;
    name: string;
  };
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  registration: {
    id: string;
    ticketId: number;
  };
}

interface AdminTicketsOverviewProps {
  initialTickets: AdminTicket[];
}

type EditState = {
  status: TicketStatus;
  adminResponse: string;
};

function buildEditState(tickets: AdminTicket[]) {
  return tickets.reduce<Record<string, EditState>>((acc, ticket) => {
    acc[ticket.id] = {
      status: ticket.status,
      adminResponse: ticket.adminResponse || "",
    };
    return acc;
  }, {});
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function getErrorMessage(raw: unknown, fallback: string) {
  if (!raw || typeof raw !== "object") return fallback;
  const payload = raw as { error?: string | Array<{ message?: string }> };

  if (typeof payload.error === "string") return payload.error;
  if (Array.isArray(payload.error)) return payload.error[0]?.message || fallback;

  return fallback;
}

export default function AdminTicketsOverview({ initialTickets }: AdminTicketsOverviewProps) {
  const [tickets, setTickets] = useState(initialTickets);
  const [edits, setEdits] = useState<Record<string, EditState>>(buildEditState(initialTickets));
  const [savingTicketId, setSavingTicketId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sortedTickets = useMemo(
    () => [...tickets].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [tickets],
  );

  const updateField = (ticketId: string, field: keyof EditState, value: string) => {
    setEdits((current) => ({
      ...current,
      [ticketId]: {
        ...(current[ticketId] || { status: "OPEN", adminResponse: "" }),
        [field]: value,
      },
    }));
  };

  const handleSave = async (ticket: AdminTicket) => {
    const edit = edits[ticket.id] || { status: ticket.status, adminResponse: ticket.adminResponse || "" };

    setError(null);
    setSavingTicketId(ticket.id);

    try {
      const response = await fetch(`/api/admin/event/${ticket.event.id}/support-tickets/${ticket.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: edit.status,
          adminResponse: edit.adminResponse,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            ticket?: Omit<AdminTicket, "event">;
            error?: unknown;
          }
        | null;

      if (!response.ok || !payload?.ticket) {
        throw new Error(getErrorMessage(payload, "Failed to update support ticket"));
      }

      const updatedTicket: AdminTicket = {
        ...payload.ticket,
        event: ticket.event,
      };

      setTickets((current) => current.map((entry) => (entry.id === updatedTicket.id ? updatedTicket : entry)));
      setEdits((current) => ({
        ...current,
        [updatedTicket.id]: {
          status: updatedTicket.status,
          adminResponse: updatedTicket.adminResponse || "",
        },
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update support ticket");
    } finally {
      setSavingTicketId(null);
    }
  };

  if (sortedTickets.length === 0) {
    return <Alert severity="info">No support tickets currently assigned to your admin scope.</Alert>;
  }

  return (
    <Stack spacing={2}>
      {error ? <Alert severity="error">{error}</Alert> : null}

      {sortedTickets.map((ticket) => {
        const edit = edits[ticket.id] || {
          status: ticket.status,
          adminResponse: ticket.adminResponse || "",
        };
        const hasChanged = edit.status !== ticket.status || edit.adminResponse.trim() !== (ticket.adminResponse || "");

        return (
          <Paper key={ticket.id} elevation={2} sx={{ p: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  {ticket.subject}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {ticket.event.name} • Ticket #{ticket.registration.ticketId} • {ticket.user.name || "Unnamed attendee"} ({ticket.user.email})
                </Typography>
              </Box>
              <Chip label={STATUS_LABELS[ticket.status]} size="small" color={getStatusColor(ticket.status)} />
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, whiteSpace: "pre-wrap" }}>
              {ticket.description}
            </Typography>

            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField
                select
                label="Status"
                value={edit.status}
                onChange={(event) => updateField(ticket.id, "status", event.target.value as TicketStatus)}
                fullWidth
              >
                {STATUS_OPTIONS.map((status) => (
                  <MenuItem key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Admin response"
                value={edit.adminResponse}
                onChange={(event) => updateField(ticket.id, "adminResponse", event.target.value)}
                fullWidth
                multiline
                minRows={3}
              />

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Updated: {formatDate(ticket.updatedAt)}
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => void handleSave(ticket)}
                  disabled={!hasChanged || savingTicketId === ticket.id}
                >
                  {savingTicketId === ticket.id ? <CircularProgress size={20} color="inherit" /> : "Save Update"}
                </Button>
              </Box>
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}
