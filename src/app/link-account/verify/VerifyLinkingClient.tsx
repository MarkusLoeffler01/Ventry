"use client";

import { useState } from "react";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress
} from "@mui/material";
import { Lock, GitHub, Google } from "@mui/icons-material";
import authClient from "@/lib/auth/client";

interface VerifyLinkingClientProps {
  provider: string;
  returnTo: string;
  userId: string;
}

export default function VerifyLinkingClient({ provider, returnTo, userId }: VerifyLinkingClientProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getProviderIcon = () => {
    switch (provider) {
      case "github":
        return <GitHub sx={{ fontSize: 40 }} />;
      case "google":
        return <Google sx={{ fontSize: 40 }} />;
      default:
        return null;
    }
  };

  const getProviderName = () => {
    switch (provider) {
      case "github":
        return "GitHub";
      case "google":
        return "Google";
      default:
        return provider;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Step 1: Verify password
      const verifyResponse = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (!verifyResponse.ok) {
        const data = await verifyResponse.json();
        throw new Error(data.error || "Invalid password");
      }

      // Step 2: Set linking cookie
      await fetch('/api/auth/set-linking-cookie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          provider,
          expiresIn: 5 * 60 * 1000 // 5 minutes
        })
      });

      // Step 3: Initiate OAuth flow using better-auth client
      await authClient.signIn.social({
        provider: provider as "github" | "google",
        callbackURL: "/auth/callback/link"
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify password");
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 3 }}>
            {getProviderIcon()}
            <Typography variant="h4" component="h1" sx={{ mt: 2 }}>
              Link {getProviderName()} Account
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: "center" }}>
              Please verify your password to authorize linking your {getProviderName()} account
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <form onSubmit={(e) => { void handleSubmit(e); }}>
            <TextField
              fullWidth
              type="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              autoFocus
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: <Lock sx={{ mr: 1, color: "text.secondary" }} />
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading || !password}
              sx={{ mb: 2 }}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Verifying...
                </>
              ) : (
                `Continue to ${getProviderName()}`
              )}
            </Button>

            <Button
              fullWidth
              variant="text"
              onClick={() => { window.location.href = returnTo; }}
              disabled={loading}
            >
              Cancel
            </Button>
          </form>
        </Paper>
      </Box>
    </Container>
  );
}
