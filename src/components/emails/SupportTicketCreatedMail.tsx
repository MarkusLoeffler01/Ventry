interface SupportTicketCreatedMailProps {
  eventName: string;
  eventUrl: string;
  ticketId: string;
  requesterName: string;
  requesterEmail: string;
  subject: string;
  description: string;
}

const styles = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    maxWidth: "640px",
    margin: "0 auto",
    padding: "24px",
    color: "#1f2937",
  },
  badge: {
    display: "inline-block",
    backgroundColor: "#e0f2fe",
    color: "#075985",
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
  },
  title: {
    margin: "14px 0 10px",
    fontSize: "24px",
    lineHeight: 1.2,
  },
  box: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "16px",
    margin: "16px 0",
  },
  label: {
    fontSize: "12px",
    textTransform: "uppercase" as const,
    color: "#64748b",
    marginBottom: "4px",
    letterSpacing: "0.04em",
  },
  value: {
    margin: 0,
    fontSize: "15px",
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
    marginTop: "12px",
  },
};

export default function SupportTicketCreatedMail({
  eventName,
  eventUrl,
  ticketId,
  requesterName,
  requesterEmail,
  subject,
  description,
}: SupportTicketCreatedMailProps) {
  return (
    <div style={styles.container}>
      <span style={styles.badge}>New Support Ticket</span>
      <h1 style={styles.title}>{eventName}</h1>

      <div style={styles.box}>
        <div style={styles.label}>Ticket ID</div>
        <p style={styles.value}>#{ticketId.slice(-8).toUpperCase()}</p>
      </div>

      <div style={styles.box}>
        <div style={styles.label}>Requester</div>
        <p style={styles.value}>
          {requesterName} ({requesterEmail})
        </p>
      </div>

      <div style={styles.box}>
        <div style={styles.label}>Subject</div>
        <p style={styles.value}>{subject}</p>
      </div>

      <div style={styles.box}>
        <div style={styles.label}>Description</div>
        <p style={styles.value}>{description}</p>
      </div>

      <a href={eventUrl} style={styles.button}>
        Open Event Support Panel
      </a>
    </div>
  );
}
