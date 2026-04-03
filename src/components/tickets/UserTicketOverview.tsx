import Link from "next/link";
import {
  Alert,
  Box,
  Chip,
  Paper,
  Stack,
  Typography,
  Button,
} from "@mui/material";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

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

interface TicketItem {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  adminResponse: string | null;
  updatedAt: string;
  createdAt: string;
}

interface EventTicketGroup {
  eventId: number;
  eventName: string;
  eventStartDate: string;
  eventEndDate: string;
  tickets: TicketItem[];
}

interface UserTicketOverviewProps {
  groups: EventTicketGroup[];
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function UserTicketOverview({ groups }: UserTicketOverviewProps) {
  if (groups.length === 0) {
    return (
      <Alert severity="info">
        You have no support tickets yet. Open one from an event page where you hold a ticket.
      </Alert>
    );
  }

  return (
    <Stack spacing={3}>
      {groups.map((group) => (
        <Paper key={group.eventId} elevation={2} sx={{ p: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                {group.eventName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {new Date(group.eventStartDate).toLocaleDateString()} - {new Date(group.eventEndDate).toLocaleDateString()}
              </Typography>
            </Box>
            <Button component={Link} href={`/events/${group.eventId}`} variant="outlined" size="small">
              Open Event
            </Button>
          </Box>

          <Stack spacing={2}>
            {group.tickets.map((ticket) => (
              <Paper key={ticket.id} variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {ticket.subject}
                  </Typography>
                  <Chip label={STATUS_LABELS[ticket.status]} size="small" color={getStatusColor(ticket.status)} />
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, whiteSpace: "pre-wrap" }}>
                  {ticket.description}
                </Typography>

                {ticket.adminResponse ? (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="subtitle2">Admin response</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                      {ticket.adminResponse}
                    </Typography>
                  </Alert>
                ) : null}

                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                  Updated: {formatDate(ticket.updatedAt)}
                </Typography>
              </Paper>
            ))}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
