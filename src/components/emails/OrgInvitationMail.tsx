interface OrgInvitationMailProps {
  orgName: string;
  inviterName: string;
  invitedEmail: string;
  acceptUrl: string;
  expiresAt: string;
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
    backgroundColor: "#ede9fe",
    color: "#5b21b6",
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
  body: {
    fontSize: "15px",
    lineHeight: 1.6,
    margin: "12px 0",
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
    fontWeight: 600,
  },
  button: {
    display: "inline-block",
    backgroundColor: "#7c3aed",
    color: "#ffffff",
    borderRadius: "8px",
    textDecoration: "none",
    padding: "12px 24px",
    fontWeight: 600,
    marginTop: "12px",
    fontSize: "15px",
  },
  note: {
    fontSize: "13px",
    color: "#64748b",
    marginTop: "20px",
  },
};

export default function OrgInvitationMail({
  orgName,
  inviterName,
  acceptUrl,
  expiresAt,
}: OrgInvitationMailProps) {
  return (
    <div style={styles.container}>
      <span style={styles.badge}>Organizer Invitation</span>
      <h1 style={styles.title}>You&apos;ve been invited to join {orgName}</h1>

      <p style={styles.body}>
        <strong>{inviterName}</strong> has invited you to become an organizer for{" "}
        <strong>{orgName}</strong> on Ventry.
      </p>

      <div style={styles.box}>
        <div style={styles.label}>Organization</div>
        <p style={styles.value}>{orgName}</p>
      </div>

      <div style={styles.box}>
        <div style={styles.label}>Invited by</div>
        <p style={styles.value}>{inviterName}</p>
      </div>

      <div style={styles.box}>
        <div style={styles.label}>Expires</div>
        <p style={styles.value}>{expiresAt}</p>
      </div>

      <a href={acceptUrl} style={styles.button}>
        Accept Invitation
      </a>

      <p style={styles.note}>
        You must be signed in with the email address this invitation was sent to.
        If you do not recognise this invitation, you can safely ignore this email.
      </p>
    </div>
  );
}
