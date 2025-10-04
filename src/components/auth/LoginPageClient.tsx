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
  const error = searchParams.get("error");
  const provider = searchParams.get("provider");
  const message = searchParams.get("message");
  const [loadingPasskey, setLoadingPasskey] = React.useState<null | "login" | "register">(null);
  const [countdown, setCountdown] = React.useState(5);

  // Auto-redirect countdown when user is authenticated with pending link error
  React.useEffect(() => {
    if (status === "authenticated" && error === "AccessDenied" && message === "AccountExists") {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // Reload the page to trigger server-side redirect
            window.location.href = "/login";
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [status, error, message]);

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

      {error === "PleaseLoginFirst" && provider && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="warning">
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              Account Linking Required
            </Typography>
            <Typography variant="body2">
              We found an existing account with this email. Please log in with your existing account
              first, then you can link your {provider === "github" ? "GitHub" : "Google"} account from your profile.
            </Typography>
          </Alert>
        </Box>
      )}

      {error === "AccessDenied" && message === "AccountExists" && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="info">
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              Account Already Exists
            </Typography>
            <Typography variant="body2">
              An account with this email already exists. Please log in to link this provider to your account.
            </Typography>
          </Alert>
        </Box>
      )}

      {status === "loading" && (
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ py: 4 }}>
          <CircularProgress size={24} />
          <Typography variant="body2">Checking session…</Typography>
        </Stack>
      )}

      {status === "authenticated" && error === "AccessDenied" && message === "AccountExists" && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <CircularProgress size={48} sx={{ mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Redirecting to Account Linking...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Redirecting in {countdown} second{countdown !== 1 ? "s" : ""}...
          </Typography>
        </Box>
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

      {status === "authenticated" && !(error === "AccessDenied" && message === "AccountExists") && (
        <Typography color="#FFFFFF" variant="body1" align="center">
          You&apos;re already signed in.
        </Typography>
      )}
    </>
  );
}