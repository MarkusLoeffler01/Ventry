"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { Business, CheckCircle, Cancel } from "@mui/icons-material";

type OrgPermission = "COMMUNITY" | "SUPPORT_TICKETS" | "EVENT_APPROVAL" | "STRIPE_FINANCES";

const PERMISSION_LABELS: Record<OrgPermission, string> = {
  COMMUNITY: "Community",
  SUPPORT_TICKETS: "Support Tickets",
  EVENT_APPROVAL: "Event Approval",
  STRIPE_FINANCES: "Finances",
};

interface InviteDetails {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  invitedEmail: string;
  inviterName: string | null;
  permissions: OrgPermission[];
  expiresAt: string;
}

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<"accept" | "decline" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [done, setDone] = useState<"accepted" | "declined" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/invite/${token}`);
      const body = (await res.json()) as { invitation?: InviteDetails; error?: string };
      if (!res.ok) {
        setFetchError(body.error ?? "Failed to load invitation");
      } else {
        setInvite(body.invitation!);
      }
    } catch {
      setFetchError("Failed to load invitation");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAccept = async () => {
    if (!invite) return;
    setActionLoading("accept");
    setActionError(null);
    try {
      const res = await fetch(
        `/api/admin/organizations/${invite.organizationId}/invitations/${token}/accept`,
        { method: "POST" },
      );
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setActionError(body.error ?? "Failed to accept invitation");
        return;
      }
      setDone("accepted");
      setTimeout(() => router.push("/admin/organization"), 2000);
    } catch {
      setActionError("Failed to accept invitation");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async () => {
    if (!invite) return;
    setActionLoading("decline");
    setActionError(null);
    try {
      const res = await fetch(
        `/api/admin/organizations/${invite.organizationId}/invitations/${token}/decline`,
        { method: "POST" },
      );
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setActionError(body.error ?? "Failed to decline invitation");
        return;
      }
      setDone("declined");
    } catch {
      setActionError("Failed to decline invitation");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (fetchError) {
    return (
      <Box sx={{ maxWidth: 480, mx: "auto", py: 6 }}>
        <Alert severity="error">{fetchError}</Alert>
      </Box>
    );
  }

  if (done === "accepted") {
    return (
      <Box sx={{ maxWidth: 480, mx: "auto", py: 6 }}>
        <Alert severity="success" icon={<CheckCircle />}>
          Invitation accepted! Redirecting to your organization…
        </Alert>
      </Box>
    );
  }

  if (done === "declined") {
    return (
      <Box sx={{ maxWidth: 480, mx: "auto", py: 6 }}>
        <Alert severity="info" icon={<Cancel />}>
          Invitation declined.
        </Alert>
      </Box>
    );
  }

  if (!invite) return null;

  return (
    <Box sx={{ maxWidth: 520, mx: "auto", py: 6 }}>
      <Paper variant="outlined" sx={{ p: 4, borderRadius: 2 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              bgcolor: "secondary.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Business sx={{ color: "white" }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Organization Invitation
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You have been invited to join an organization
            </Typography>
          </Box>
        </Stack>

        <Stack spacing={2} sx={{ mb: 3 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Organization
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {invite.organizationName}
            </Typography>
          </Box>

          {invite.inviterName && (
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Invited by
              </Typography>
              <Typography variant="body1">{invite.inviterName}</Typography>
            </Box>
          )}

          <Box>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Invited email
            </Typography>
            <Typography variant="body1" sx={{ fontFamily: "monospace" }}>
              {invite.invitedEmail}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Permissions granted
            </Typography>
            {invite.permissions.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No specific permissions (read-only access)
              </Typography>
            ) : (
              <Stack direction="row" flexWrap="wrap" gap={0.5}>
                {invite.permissions.map((p) => (
                  <Chip
                    key={p}
                    label={PERMISSION_LABELS[p] ?? p}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Stack>
            )}
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Expires
            </Typography>
            <Typography variant="body2">
              {new Date(invite.expiresAt).toLocaleDateString("en-GB", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Typography>
          </Box>
        </Stack>

        {actionError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {actionError}
          </Alert>
        )}

        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => void handleAccept()}
            disabled={!!actionLoading}
            endIcon={actionLoading === "accept" ? <CircularProgress size={16} /> : <CheckCircle />}
          >
            {actionLoading === "accept" ? "Accepting…" : "Accept"}
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={() => void handleDecline()}
            disabled={!!actionLoading}
            endIcon={actionLoading === "decline" ? <CircularProgress size={16} /> : <Cancel />}
          >
            {actionLoading === "decline" ? "Declining…" : "Decline"}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
