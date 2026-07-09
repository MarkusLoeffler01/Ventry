import { Box, Container, Paper, Typography } from "@mui/material";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import PageLoadingState from "@/components/common/PageLoadingState";
import CompleteProfileWizard from "@/components/auth/CompleteProfileWizard";

export default function CompleteProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  return (
    <Suspense fallback={<PageLoadingState />}>
      <CompleteProfilePageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function CompleteProfilePageContent({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const session = await getSession();

  if (!session?.user) {
    redirect(`/login${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`);
  }

  // Already completed (e.g. revisiting this URL) — skip straight through.
  if (session.user.legalName) {
    redirect(callbackUrl || "/");
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          minHeight: "100vh",
          py: 6,
        }}
      >
        <Paper variant="outlined" sx={{ width: "100%", p: { xs: 3, sm: 5 }, borderRadius: 3 }}>
          <Typography component="h1" variant="h4" fontWeight={700} align="center" sx={{ mb: 4 }}>
            Complete your account
          </Typography>

          <CompleteProfileWizard
            callbackUrl={callbackUrl}
            defaultLegalName={session.user.name ?? undefined}
          />
        </Paper>
      </Box>
    </Container>
  );
}
