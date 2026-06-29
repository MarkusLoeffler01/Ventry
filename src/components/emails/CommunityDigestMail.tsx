export interface CommunityDigestPost {
  id: string;
  content: string | null;
  type: string;
  authorName: string;
}

export interface CommunityDigestMailProps {
  userName: string;
  eventName: string;
  eventUrl: string;
  posts: CommunityDigestPost[];
  unsubscribeUrl: string;
}

const styles = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    maxWidth: "600px",
    margin: "0 auto",
    padding: "40px 20px",
    backgroundColor: "#ffffff",
  },
  logo: {
    fontSize: "28px",
    fontWeight: "bold" as const,
    color: "#1976d2",
    textAlign: "center" as const,
    marginBottom: "32px",
  },
  title: {
    fontSize: "22px",
    fontWeight: "600" as const,
    color: "#1a1a1a",
    marginBottom: "8px",
    marginTop: "0",
  },
  text: {
    fontSize: "15px",
    lineHeight: "1.6",
    color: "#4a4a4a",
    marginBottom: "20px",
  },
  postCard: {
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "12px",
    backgroundColor: "#fafafa",
  },
  postAuthor: {
    fontSize: "13px",
    fontWeight: "600" as const,
    color: "#1976d2",
    marginBottom: "6px",
  },
  postContent: {
    fontSize: "14px",
    color: "#333",
    margin: "0",
    whiteSpace: "pre-wrap" as const,
  },
  button: {
    display: "inline-block",
    backgroundColor: "#1976d2",
    color: "#ffffff",
    padding: "12px 28px",
    textDecoration: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "600" as const,
  },
  buttonContainer: {
    textAlign: "center" as const,
    margin: "28px 0",
  },
  footer: {
    marginTop: "40px",
    paddingTop: "20px",
    borderTop: "1px solid #e0e0e0",
    textAlign: "center" as const,
  },
  footerText: {
    fontSize: "13px",
    color: "#999",
    margin: "6px 0",
  },
  unsubLink: {
    color: "#999",
    fontSize: "12px",
  },
};

export default function CommunityDigestMail({
  userName,
  eventName,
  eventUrl,
  posts,
  unsubscribeUrl,
}: CommunityDigestMailProps) {
  return (
    <div style={styles.container}>
      <div style={styles.logo}>Ventry</div>

      <h1 style={styles.title}>New posts in {eventName}</h1>
      <p style={styles.text}>Hi {userName},</p>
      <p style={styles.text}>
        {posts.length === 1
          ? "There is 1 new community post"
          : `There are ${posts.length} new community posts`}{" "}
        waiting for you in <strong>{eventName}</strong>.
      </p>

      <div>
        {posts.map((post) => (
          <div key={post.id} style={styles.postCard}>
            <div style={styles.postAuthor}>{post.authorName}</div>
            <p style={styles.postContent}>
              {post.content
                ? post.content.length > 200
                  ? `${post.content.slice(0, 200)}…`
                  : post.content
                : `[${post.type.toLowerCase()} post]`}
            </p>
          </div>
        ))}
      </div>

      <div style={styles.buttonContainer}>
        <a href={eventUrl} style={styles.button}>
          View community
        </a>
      </div>

      <div style={styles.footer}>
        <p style={styles.footerText}>
          © {new Date().getFullYear()} Ventry. All rights reserved.
        </p>
        <p style={styles.footerText}>
          <a href={unsubscribeUrl} style={styles.unsubLink}>
            Unsubscribe from community digests for this event
          </a>
        </p>
      </div>
    </div>
  );
}
