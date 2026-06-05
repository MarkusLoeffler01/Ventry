import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

interface LegalDocumentShellProps {
  children: ReactNode;
  description: string;
  title: string;
  updatedAt?: string;
}

export default function LegalDocumentShell({
  children,
  description,
  title,
  updatedAt,
}: LegalDocumentShellProps) {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
      <Stack spacing={4}>
        <Box>
          <Typography color="primary" component="p" fontWeight={700} gutterBottom variant="overline">
            Legal
          </Typography>
          <Typography component="h1" fontWeight={800} gutterBottom variant="h3">
            {title}
          </Typography>
          <Typography color="text.secondary" variant="body1">
            {description}
          </Typography>
          {updatedAt ? (
            <Typography color="text.secondary" sx={{ mt: 1 }} variant="body2">
              Last updated: {updatedAt}
            </Typography>
          ) : null}
        </Box>

        <Paper
          component="article"
          elevation={0}
          sx={{
            border: 1,
            borderColor: "divider",
            borderRadius: 2,
            p: { xs: 2.5, md: 5 },
            "& a": {
              color: "primary.main",
              overflowWrap: "anywhere",
            },
            "& h1": {
              fontSize: { xs: "2rem", md: "2.5rem" },
              fontWeight: 800,
              lineHeight: 1.15,
              mb: 2,
              mt: 0,
            },
            "& h2": {
              borderTop: 1,
              borderColor: "divider",
              fontSize: { xs: "1.35rem", md: "1.65rem" },
              fontWeight: 750,
              lineHeight: 1.25,
              mb: 1.5,
              mt: 4,
              pt: 3,
            },
            "& h2:first-of-type": {
              borderTop: 0,
              mt: 0,
              pt: 0,
            },
            "& h3": {
              fontSize: "1.1rem",
              fontWeight: 700,
              mb: 1,
              mt: 2.5,
            },
            "& li": {
              mb: 0.75,
              pl: 0.25,
            },
            "& p": {
              lineHeight: 1.75,
              mb: 2,
            },
            "& ul": {
              mb: 2,
              pl: 3,
            },
            "& .index": {
              columns: { xs: 1, sm: 2 },
              gap: 4,
              listStyle: "none",
              pl: 0,
            },
            "& .index li": {
              breakInside: "avoid",
              mb: 1,
            },
          }}
        >
          {children}
        </Paper>

        <Stack direction="row" spacing={2}>
          <Link href="/" underline="hover">
            Back to events
          </Link>
          <Link href="/privacy" underline="hover">
            Privacy
          </Link>
          <Link href="/imprint" underline="hover">
            Imprint
          </Link>
        </Stack>
      </Stack>
    </Container>
  );
}
