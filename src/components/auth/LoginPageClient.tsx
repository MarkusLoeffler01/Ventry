"use client";

import React from "react";
import LoginForm from "@/components/auth/LoginForm";
import { useSearchParams } from "next/navigation";
import Alert from "@mui/material/Alert";
import authClient from "@/lib/auth/client";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import { isLastUsedLoginMethod } from "@/lib/auth/client";
import LastUsedIndicator from "./LastUsedIndicator";

export default function LoginPageClient() {
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");
  const passwordReset = searchParams.get("message") === "Password reset successful";
  const error = searchParams.get("error");
  const provider = searchParams.get("provider");
  const message = searchParams.get("message");
  const accountExists = searchParams.get("account_exists");
  const linkRequired = searchParams.get("link_required");
  const linkProvider = searchParams.get("link_provider") as "google" | "github" | null;
  const linkEmail = searchParams.get("email");
  
  const [linkingPassword, setLinkingPassword] = React.useState("");
  const [linkingLoading, setLinkingLoading] = React.useState(false);
  const [linkingError, setLinkingError] = React.useState("");

  const handleGoogleSignIn = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    });
  }

  const handleGitHubSignIn = async () => {
    await authClient.signIn.social({
      provider: "github",
      callbackURL: "/dashboard",
    });
  }

  const handleLinkingLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkingError("");
    setLinkingLoading(true);

    if (!linkEmail || !linkProvider) {
      setLinkingError("Email or provider not found. Please try signing in with OAuth again.");
      setLinkingLoading(false);
      return;
    }

    try {
      // Call our API to verify password and set linking cookie
      const response = await fetch('/api/auth/verify-and-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: linkEmail,
          password: linkingPassword,
          provider: linkProvider,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setLinkingError(data.error || "Invalid password");
        setLinkingLoading(false);
        return;
      }

      // Password verified! Now initiate OAuth flow which will auto-link
      await authClient.signIn.social({
        provider: linkProvider,
        callbackURL: "/dashboard",
      });
    } catch (err) {
      console.error("Linking login error:", err);
      setLinkingError("An error occurred. Please try again.");
      setLinkingLoading(false);
    }
  };

  return (
    <>
      {registered && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="success">Registration successful! A validation E-Mail has been sent. Please check your E-Mail and validate your account!</Alert>
        </Box>
      )}

      {passwordReset && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="success">
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              Password Reset Successful!
            </Typography>
            <Typography variant="body2">
              Your password has been successfully updated. You can now log in with your new password.
            </Typography>
          </Alert>
        </Box>
      )}

      {accountExists && provider && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="info">
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              Account Already Exists
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              We found an existing account with this email. Please log in below, then you can link your {provider === "github" ? "GitHub" : "Google"} account from your profile.
            </Typography>
            <Typography variant="body2" color="text.secondary" fontSize="0.875rem">
              After logging in: Profile → Linked Accounts → Link {provider === "github" ? "GitHub" : "Google"}
            </Typography>
          </Alert>
        </Box>
      )}

      {linkRequired && linkProvider && linkEmail && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="info">
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              Link {linkProvider === "github" ? "GitHub" : "Google"} Account
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              We found an existing account with email <strong>{linkEmail}</strong>. Please enter your password to link your {linkProvider === "github" ? "GitHub" : "Google"} account.
            </Typography>
            
            <form onSubmit={(e) => { void handleLinkingLogin(e); }}>
              <Stack spacing={2}>
                <TextField
                  label="Password"
                  type="password"
                  value={linkingPassword}
                  onChange={(e) => setLinkingPassword(e.target.value)}
                  required
                  fullWidth
                  autoFocus
                  helperText={`Password for ${linkEmail}`}
                />
                {linkingError && (
                  <Alert severity="error">{linkingError}</Alert>
                )}
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={linkingLoading}
                  startIcon={linkingLoading ? <CircularProgress size={20} /> : null}
                >
                  {linkingLoading ? "Verifying..." : `Verify & Link ${linkProvider === "github" ? "GitHub" : "Google"}`}
                </Button>
              </Stack>
            </form>
          </Alert>
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

      {!linkRequired && (
        <Stack spacing={3}>
          <LoginForm />
        <Typography variant="subtitle2" color="text.secondary" align="center">
          Or
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
          <LoginMethodBox>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => void handleGoogleSignIn()}
            >
              Sign in with Google
            </Button>
            <LastUsedIndicator isLastUsed={isLastUsedLoginMethod("google")} />
          </LoginMethodBox>
          <LoginMethodBox>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => void handleGitHubSignIn()}
            >
              Sign in with GitHub
            </Button>
            <LastUsedIndicator isLastUsed={isLastUsedLoginMethod("github")} />
          </LoginMethodBox>
        </Stack>
        <Typography variant="caption" color="text.secondary" align="center">
          A Passkey lets you sign in without a password. If you don&apos;t have one yet, create it.
        </Typography>
      </Stack>
      )}
    </>
  );
}

function LoginMethodBox({ children }: { children: React.ReactNode }) {
    return <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2}}>
        {children}
    </Box>
}