"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Card,
  CardContent,
  Chip,
  Stack,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  IconButton
} from "@mui/material";
import {
  GitHub,
  Google,
  Warning,
  CheckCircle,
  Link as LinkIcon,
  Visibility,
  VisibilityOff,
  Schedule,
  Lock
} from "@mui/icons-material";

interface PendingLink {
  id: string;
  provider: string;
  providerEmail: string;
  emailVerified: boolean;
  createdAt: Date;
  expiresAt: Date;
}

interface LinkAccountClientProps {
  pendingLinks: PendingLink[];
  currentProviders: string[];
  hasPassword: boolean;
  hasOAuthProviders: boolean;
}

export default function LinkAccountClient({
  pendingLinks,
  currentProviders,
  hasPassword,
  hasOAuthProviders
}: LinkAccountClientProps) {
  const router = useRouter();
  const [selectedLink, setSelectedLink] = useState<PendingLink | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [disableEmailLogin, setDisableEmailLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "github":
        return <GitHub />;
      case "google":
        return <Google />;
      default:
        return <LinkIcon />;
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case "github":
        return "GitHub";
      case "google":
        return "Google";
      default:
        return provider;
    }
  };

  const handleOpenConfirmDialog = (link: PendingLink) => {
    setSelectedLink(link);
    setError(null);
    setPassword("");
    setConfirmDialogOpen(true);
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDialogOpen(false);
    setSelectedLink(null);
    setPassword("");
    setDisableEmailLogin(false);
    setError(null);
  };

  const handleConfirmLink = async () => {
    if (!selectedLink) {
      setError("No pending link selected");
      return;
    }

    // Only require password if user has password and no OAuth providers
    if (hasPassword && !hasOAuthProviders && !password) {
      setError("Please enter your password");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/user/link-account/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pendingLinkId: selectedLink.id,
          password: password || undefined,
          disableEmailLogin: disableEmailLogin
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to link account");
      }

      // Success - redirect to profile with hard refresh to ensure fresh data
      window.location.href = `/profile?linked=${selectedLink.provider}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link account");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelLink = async (linkId: string) => {
    try {
      const response = await fetch(`/api/user/link-account/pending?id=${linkId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Failed to cancel link");
      }

      router.refresh();
    } catch (err) {
      console.error("Error cancelling link:", err);
    }
  };

  const getTimeRemaining = (expiresAt: Date) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    const minutes = Math.floor(diff / 1000 / 60);
    
    if (minutes < 1) return "Less than 1 minute";
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  if (!hasPassword && !hasOAuthProviders) {
    return (
      <Box className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
        <Paper elevation={8} sx={{ maxWidth: 500, p: 4, borderRadius: 3 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Authentication Required
            </Typography>
            <Typography variant="body2">
              Your account does not have a password or any OAuth providers linked. You need at least one
              authentication method to link additional providers. Please set a password in your profile settings first.
            </Typography>
          </Alert>
          <Button
            variant="contained"
            onClick={() => router.push("/profile")}
            fullWidth
          >
            Go to Profile
          </Button>
        </Paper>
      </Box>
    );
  }

  if (pendingLinks.length === 0) {
    return (
      <Box className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
        <Paper elevation={8} sx={{ maxWidth: 500, p: 4, borderRadius: 3 }}>
          <Typography variant="h5" gutterBottom>
            No Pending Account Links
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            You don&apos;t have any pending account link requests. You can link accounts from your profile settings.
          </Typography>
          <Button
            variant="contained"
            onClick={() => router.push("/profile")}
            fullWidth
          >
            Go to Profile
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <Paper elevation={8} sx={{ maxWidth: 700, width: "100%", p: 4, borderRadius: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <LinkIcon color="primary" />
          Link Your Account
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            You have {pendingLinks.length} pending account link request{pendingLinks.length > 1 ? 's' : ''}.
            Review and confirm to link external providers to your account.
          </Typography>
        </Alert>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Pending Link Requests
        </Typography>

        <Stack spacing={2}>
          {pendingLinks.map((link) => (
            <Card key={link.id} variant="outlined">
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {getProviderIcon(link.provider)}
                    <Typography variant="h6">
                      {getProviderName(link.provider)}
                    </Typography>
                  </Box>
                  {link.emailVerified && (
                    <Chip
                      icon={<CheckCircle />}
                      label="Email Verified"
                      color="success"
                      size="small"
                    />
                  )}
                </Box>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Email: <strong>{link.providerEmail}</strong>
                </Typography>

                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 2 }}>
                  <Schedule fontSize="small" color="action" />
                  <Typography variant="caption" color="text.secondary">
                    Expires in {getTimeRemaining(link.expiresAt)}
                  </Typography>
                </Box>

                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="caption">
                    <strong>Security Notice:</strong> Linking this account will allow you to sign in
                    using {getProviderName(link.provider)}. {hasPassword && !hasOAuthProviders ? "You'll need to verify your password to proceed." : ""}
                  </Typography>
                </Alert>

                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleOpenConfirmDialog(link)}
                    startIcon={<Lock />}
                    fullWidth
                  >
                    Confirm & Link
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => void handleCancelLink(link.id)}
                  >
                    Cancel
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>

        <Divider sx={{ my: 3 }} />

        <Typography variant="body2" color="text.secondary" align="center">
          Currently linked providers: {currentProviders.length > 0 ? currentProviders.join(", ") : "None"}
        </Typography>
      </Paper>

      {/* Confirmation Dialog with Password */}
      <Dialog open={confirmDialogOpen} onClose={handleCloseConfirmDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Warning color="warning" />
            Confirm Account Linking
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedLink && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  You are about to link your <strong>{getProviderName(selectedLink.provider)}</strong> account
                  ({selectedLink.providerEmail}) to your current account.
                </Typography>
              </Alert>

              <Typography variant="body2" sx={{ mb: 2 }}>
                After linking, you will be able to sign in using either:
              </Typography>
              <ul style={{ marginLeft: 20, marginBottom: 16 }}>
                <li>
                  <Typography variant="body2">
                    Email & Password (if not disabled)
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2">
                    {getProviderName(selectedLink.provider)} OAuth
                  </Typography>
                </li>
              </ul>

              {hasPassword && !hasOAuthProviders && (
                <TextField
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  required
                  autoFocus
                  placeholder="Enter your password to confirm"
                  error={!!error}
                  helperText={error || "Enter your current password to verify this action"}
                  sx={{ mb: 2 }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              )}

              {hasOAuthProviders && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    Since you&apos;re already authenticated with another OAuth provider, no password is required to link this account.
                  </Typography>
                </Alert>
              )}

              {hasPassword && (
                <>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={disableEmailLogin}
                        onChange={(e) => setDisableEmailLogin(e.target.checked)}
                      />
                    }
                    label={
                      <Typography variant="body2">
                        Disable email & password login after linking (you can only sign in with {getProviderName(selectedLink.provider)})
                      </Typography>
                    }
                  />

                  {disableEmailLogin && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      <Typography variant="caption">
                        <strong>Warning:</strong> If you disable email login, you won&apos;t be able to sign in
                        with your password anymore. Make sure you can access your {getProviderName(selectedLink.provider)} account!
                      </Typography>
                    </Alert>
                  )}
                </>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDialog} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleConfirmLink()}
            variant="contained"
            color="primary"
            disabled={loading || (hasPassword && !hasOAuthProviders && !password)}
            startIcon={loading ? <CircularProgress size={16} /> : <Lock />}
          >
            {loading ? "Confirming..." : "Confirm & Link"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
