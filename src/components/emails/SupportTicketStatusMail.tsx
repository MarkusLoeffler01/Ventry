interface SupportTicketStatusMailProps {
  userName: string;
  eventName: string;
  eventUrl: string;
  ticketId: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  adminResponse?: string | null;
}

const STATUS_LABELS: Record<SupportTicketStatusMailProps["status"], string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const styles = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    maxWidth: "640px",
    margin: "0 auto",
    padding: "24px",
    color: "#1f2937",
  },
  title: {
    margin: "0 0 12px",
    fontSize: "24px",
  },
  paragraph: {
    margin: "0 0 14px",
    fontSize: "15px",
    lineHeight: 1.6,
  },
  statusBox: {
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "14px 16px",
    backgroundColor: "#f8fafc",
    margin: "14px 0",
  },
  statusLabel: {
    fontSize: "12px",
    color: "#64748b",
    marginBottom: "6px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  },
  statusValue: {
    margin: 0,
    fontWeight: 700,
    fontSize: "18px",
  },
  responseBox: {
    borderLeft: "4px solid #1976d2",
    backgroundColor: "#f1f8ff",
    padding: "12px 14px",
    margin: "14px 0",
    whiteSpace: "pre-wrap" as const,
  },
  button: {
    display: "inline-block",
    backgroundColor: "#1976d2",
    color: "#ffffff",
    borderRadius: "8px",
    textDecoration: "none",
    padding: "12px 18px",
    fontWeight: 600,
    marginTop: "8px",
  },
};

export default function SupportTicketStatusMail({
  userName,
  eventName,
  eventUrl,
  ticketId,
  status,
  adminResponse,
}: SupportTicketStatusMailProps) {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Support Ticket Update</h1>

      <p style={styles.paragraph}>Hi {userName},</p>
      <p style={styles.paragraph}>
        Your support ticket for <strong>{eventName}</strong> has been updated.
      </p>

      <div style={styles.statusBox}>
        <div style={styles.statusLabel}>Ticket #{ticketId.slice(-8).toUpperCase()}</div>
        <p style={styles.statusValue}>{STATUS_LABELS[status]}</p>
      </div>

      {adminResponse ? <div style={styles.responseBox}>{adminResponse}</div> : null}

      <a href={eventUrl} style={styles.button}>
        View Ticket Status
      </a>
    </div>
  );
}
