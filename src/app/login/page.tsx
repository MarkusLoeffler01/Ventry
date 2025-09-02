// LoginPage.tsx
"use client";

import React from "react";
import LoginForm from "@/components/auth/LoginForm";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { useSearchParams } from "next/navigation";
import Alert from "@mui/material/Alert";
import { useSession } from "next-auth/react";
import { signIn as passkeySignIn } from "next-auth/webauthn"; // Passkey specific signIn helper
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";




export default function LoginPage() {
  const searchParams = useSearchParams();
  const { status } = useSession();
  const registered = searchParams.get("registered");
  const [loadingPasskey, setLoadingPasskey] = React.useState<null | "login" | "register">(null);

  const handlePasskey = async (mode: "login" | "register") => {
    try {
      setLoadingPasskey(mode);
      // According to next-auth v5 passkey helper, registering vs authenticating can be toggled via "action" flag
      await passkeySignIn("passkey", { action: mode === "register" ? "register" : undefined });
    } finally {
      setLoadingPasskey(null);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
            alignItems: "center",
            minHeight: "100vh",
            py: 4,
          }}
      >
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            maxWidth: 600,
            display: "flex",
            flexDirection: "column",
            p: { xs: 2, md: 4 },
          }}
        >
          {registered && (
            <Box sx={{ mb: 2 }}>
              <Alert severity="success">Registration successful! Please log in.</Alert>
            </Box>
          )}

          <Typography component="h1" variant="h4" align="center" sx={{ mt: 2, mb: 3 }}>
            Login
          </Typography>

          {status === "loading" && (
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ py: 4 }}>
              <CircularProgress size={24} />
              <Typography variant="body2">Checking session…</Typography>
            </Stack>
          )}

          {status === "unauthenticated" && (
            <Stack spacing={3}>
              <LoginForm />
              <Typography variant="subtitle2" color="text.secondary" align="center">
                Or
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => { void handlePasskey("login"); }}
                  disabled={!!loadingPasskey}
                >
                  {loadingPasskey === "login" ? "Using Passkey…" : "Sign in with Passkey"}
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => { void handlePasskey("register"); }}
                  disabled={!!loadingPasskey}
                >
                  {loadingPasskey === "register" ? "Creating Passkey…" : "Create Passkey"}
                </Button>
              </Stack>
              <Typography variant="caption" color="text.secondary" align="center">
                A Passkey lets you sign in without a password. If you don&apos;t have one yet, create it.
              </Typography>
            </Stack>
          )}

          {status === "authenticated" && (
            <Typography variant="body1" align="center">You&apos;re already signed in.</Typography>
          )}
        </Paper>
      </Box>
    </Container>
  );
}