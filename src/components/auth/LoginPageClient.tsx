"use client";

import React from "react";
import LoginForm from "@/components/auth/LoginForm";
import { useSearchParams } from "next/navigation";
import Alert from "@mui/material/Alert";
import { useSession } from "next-auth/react";
import { signIn as passkeySignIn } from "next-auth/webauthn";
import { signIn } from "next-auth/react";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

export default function LoginPageClient() {
  const searchParams = useSearchParams();
  const { status } = useSession();
  const registered = searchParams.get("registered");
  const [loadingPasskey, setLoadingPasskey] = React.useState<null | "login" | "register">(null);

  const handleGoogleSignIn = async () => {
    await signIn("google", {
      redirect: true,
      redirectTo: "/auth/success?provider=google"
    });
  }

  const handleGitHubSignIn = async () => {
    await signIn("github", {
      redirect: true,
      redirectTo: "/auth/success?provider=github"
    });
  }

  const handlePasskey = async (mode: "login" | "register") => {
    setLoadingPasskey(mode);
    try {
      await passkeySignIn("passkey", { action: mode === "register" ? "register" : undefined });
    } finally {
      setLoadingPasskey(null);
    }
  };

  return (
    <>
      {registered && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="success">Registration successful! Please log in.</Alert>
        </Box>
      )}

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
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => void handleGoogleSignIn()}
            >
              Sign in with Google
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => void handleGitHubSignIn()}
            >
              Sign in with GitHub
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary" align="center">
            A Passkey lets you sign in without a password. If you don&apos;t have one yet, create it.
          </Typography>
        </Stack>
      )}

      {status === "authenticated" && (
        <Typography color="#FFFFFF" variant="body1" align="center">
          You&apos;re already signed in.
        </Typography>
      )}
    </>
  );
}