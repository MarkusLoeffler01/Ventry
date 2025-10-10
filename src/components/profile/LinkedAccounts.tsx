"use client";

import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Stack,
  Alert,
  Divider
} from "@mui/material";
import {
  GitHub,
  Google,
  Email,
  Add,
  CheckCircle,
  Link as LinkIcon
} from "@mui/icons-material";
import authClient from "@/lib/auth/client";

interface LinkedAccountsProps {
  accounts: Array<{
    providerId: string;  // Changed from 'provider' for better-auth
  }>;
  hasPassword: boolean;
  hasOAuthProviders: boolean;
}

export default function LinkedAccounts({ accounts, hasPassword, hasOAuthProviders }: LinkedAccountsProps) {
  const [linking, setLinking] = useState<string | null>(null);

  const getProviderIcon = (providerId: string) => {
    switch (providerId) {
      case "github":
        return <GitHub />;
      case "google":
        return <Google />;
      case "credential":
      case "credentials":
        return <Email />;
      default:
        return <LinkIcon />;
    }
  };

  const getProviderName = (providerId: string) => {
    switch (providerId) {
      case "github":
        return "GitHub";
      case "google":
        return "Google";
      case "credential":
      case "credentials":
        return "Email & Password";
      default:
        return providerId;
    }
  };

  const availableProviders = [
    { id: "github", name: "GitHub", icon: <GitHub /> },
    { id: "google", name: "Google", icon: <Google /> }
  ];

  const linkedProviders = accounts.map(a => a.providerId);
  
  // Add credentials if user has password
  const allLinkedProviders = hasPassword 
    ? [...linkedProviders, "credentials"]
    : linkedProviders;

  const unlinkableProviders = availableProviders.filter(
    p => !linkedProviders.includes(p.id)
  );

  const handleLinkProvider = async (providerId: string) => {
    if (!hasPassword && !hasOAuthProviders) {
      alert("Please set a password or link an OAuth provider first");
      return;
    }

    setLinking(providerId);
    
    try {
      // Store linking intent in sessionStorage
      sessionStorage.setItem('oauth_linking_intent', JSON.stringify({
        provider: providerId,
        timestamp: Date.now(),
        mode: 'link' // This tells us it's a linking attempt, not a new sign-in
      }));

      // Initiate OAuth flow - better-auth will handle this
      // The callback will check sessionStorage to determine if this is a link or new sign-in
      await authClient.signIn.social({
        provider: providerId as "github" | "google",
        callbackURL: "/auth/callback/link" // Special callback for linking
      });
    } catch (error) {
      console.error("Error linking account:", error);
      sessionStorage.removeItem('oauth_linking_intent');
      setLinking(null);
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <LinkIcon />
          Linked Accounts
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Manage how you sign in to your account. You can link multiple providers.
        </Typography>

        {!hasPassword && !hasOAuthProviders && allLinkedProviders.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="caption">
              <strong>Security Notice:</strong> Set a password or link an OAuth provider to enable linking additional accounts.
            </Typography>
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom>
          Currently Linked:
        </Typography>

        {allLinkedProviders.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            No accounts linked yet. Link an account to enable sign-in.
          </Alert>
        ) : (
          <Stack spacing={1} sx={{ mb: 3 }}>
            {allLinkedProviders.map((providerId) => (
              <Box
                key={providerId}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  bgcolor: "background.default"
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {getProviderIcon(providerId)}
                  <Typography variant="body2">
                    {getProviderName(providerId)}
                  </Typography>
                </Box>
                <Chip
                  icon={<CheckCircle />}
                  label="Linked"
                  color="success"
                  size="small"
                />
              </Box>
            ))}
          </Stack>
        )}

        {unlinkableProviders.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle2" gutterBottom>
              Available to Link:
            </Typography>

            <Stack spacing={1}>
              {unlinkableProviders.map((provider) => (
                <Box
                  key={provider.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1.5,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {provider.icon}
                    <Typography variant="body2">
                      {provider.name}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={() => void handleLinkProvider(provider.id)}
                    disabled={(!hasPassword && !hasOAuthProviders) || linking === provider.id}
                  >
                    {linking === provider.id ? "Linking..." : "Link"}
                  </Button>
                </Box>
              ))}
            </Stack>
          </>
        )}

        {!hasPassword && hasOAuthProviders && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="caption">
              You currently sign in using OAuth only. Consider setting a password as a backup login method.
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
