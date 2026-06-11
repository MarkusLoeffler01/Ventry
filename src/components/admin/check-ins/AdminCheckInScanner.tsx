"use client";

import { type MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { CheckCircle, CloudDownload, CloudSync, StopCircle, Videocam } from "@mui/icons-material";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { parseTicketQrPayload } from "@/lib/tickets/qr";
import {
  addPendingOperation,
  chunkPendingOperations,
  deletePendingOperations,
  listPendingOperations,
  loadSnapshot,
  saveSnapshot,
  type CheckInSnapshot,
  type CheckInSnapshotRegistration,
  type PendingCheckInOperation,
} from "@/lib/tickets/check-in-offline";

type SyncResult = {
  clientOperationId: string;
  ticketId: number;
  result: string;
};

type AdminCheckInScannerProps = {
  eventId: number;
};

function createOperationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `checkin-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function applyLocalCheckIn(snapshot: CheckInSnapshot, ticketId: number): CheckInSnapshot {
  return {
    ...snapshot,
    registrations: snapshot.registrations.map(registration => {
      if (registration.ticketId !== ticketId) {
        return registration;
      }

      return {
        ...registration,
        checkedInAt: registration.checkedInAt || new Date().toISOString(),
        checkInCount: registration.checkInCount + 1,
        eligible: !snapshot.event.scanOnce,
        eligibilityReason: snapshot.event.scanOnce ? "Ticket was already checked in" : null,
      };
    }),
  };
}

function stopScannerControls(scannerControls: MutableRefObject<IScannerControls | null>) {
  scannerControls.current?.stop();
  scannerControls.current = null;
}

function isSetPhotoOptionsFailure(reason: unknown) {
  return reason instanceof Error && reason.name === "UnknownError" && reason.message.includes("setPhotoOptions failed");
}

export default function AdminCheckInScanner({ eventId }: AdminCheckInScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerControls = useRef<IScannerControls | null>(null);
  const lastScanRef = useRef<{ value: string; at: number } | null>(null);
  const successTimeoutRef = useRef<number | null>(null);

  const [snapshot, setSnapshot] = useState<CheckInSnapshot | null>(null);
  const [selectedRegistration, setSelectedRegistration] = useState<CheckInSnapshotRegistration | null>(null);
  const [manualTicketId, setManualTicketId] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [loadingSnapshot, setLoadingSnapshot] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [resumeScannerAfterDialog, setResumeScannerAfterDialog] = useState(false);
  const [showCheckInSuccess, setShowCheckInSuccess] = useState(false);
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [message, setMessage] = useState<{ severity: "success" | "info" | "warning" | "error"; text: string } | null>(null);

  const registrationsByTicket = useMemo(() => {
    return new Map(snapshot?.registrations.map(registration => [registration.ticketId, registration]) || []);
  }, [snapshot]);

  const selectedDisplayName =
    selectedRegistration?.displayName || selectedRegistration?.attendeeName || "Unnamed attendee";
  const selectedLegalName = selectedRegistration?.legalName || null;

  const refreshPendingCount = useCallback(async () => {
    const operations = await listPendingOperations(eventId);
    setPendingCount(operations.length);
  }, [eventId]);

  const refreshSnapshot = useCallback(async () => {
    setLoadingSnapshot(true);
    try {
      const response = await fetch(`/api/admin/event/${eventId}/check-ins/snapshot`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to refresh check-in data");
      }
      setSnapshot(data);
      await saveSnapshot(data);
      setMessage({ severity: "success", text: "Check-in data refreshed." });
    } catch (error) {
      const cached = await loadSnapshot(eventId);
      if (cached) {
        setSnapshot(cached);
        setMessage({ severity: "warning", text: "Using cached check-in data." });
      } else {
        setMessage({ severity: "error", text: error instanceof Error ? error.message : "Could not load check-in data." });
      }
    } finally {
      setLoadingSnapshot(false);
      await refreshPendingCount();
    }
  }, [eventId, refreshPendingCount]);

  const syncPending = useCallback(async () => {
    if (!navigator.onLine) {
      return;
    }

    setSyncing(true);
    try {
      const operations = await listPendingOperations(eventId);
      const chunks = chunkPendingOperations(operations);
      let synced = 0;

      for (const chunk of chunks) {
        const response = await fetch(`/api/admin/event/${eventId}/check-ins/batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operations: chunk.map(operation => ({
              clientOperationId: operation.clientOperationId,
              ticketId: operation.ticketId,
              scannedAt: operation.scannedAt,
            })),
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to sync check-ins");
        }

        const completedIds = (data.results as SyncResult[]).map(result => result.clientOperationId);
        await deletePendingOperations(completedIds);
        synced += completedIds.length;
      }

      if (synced > 0) {
        setMessage({ severity: "success", text: `Synced ${synced} pending check-in${synced === 1 ? "" : "s"}.` });
        await refreshSnapshot();
      }
    } catch (error) {
      setMessage({ severity: "warning", text: error instanceof Error ? error.message : "Check-ins are queued for retry." });
    } finally {
      setSyncing(false);
      await refreshPendingCount();
    }
  }, [eventId, refreshPendingCount, refreshSnapshot]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial client-side snapshot load is intentional
    void refreshSnapshot();

    const handleOnline = () => {
      setOnline(true);
      void syncPending();
    };
    const handleOffline = () => setOnline(false);
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isSetPhotoOptionsFailure(event.reason)) {
        event.preventDefault();
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      if (successTimeoutRef.current !== null) {
        window.clearTimeout(successTimeoutRef.current);
      }
      scannerControls.current?.stop();
    };
  }, [refreshSnapshot, syncPending]);

  const handleTicketId = useCallback((ticketId: number, source: "manual" | "scan" = "manual") => {
    const registration = registrationsByTicket.get(ticketId);
    if (!registration) {
      setSelectedRegistration(null);
      setMessage({
        severity: "error",
        text: source === "scan"
          ? "Scanned QR code is not in this event snapshot. Refresh the snapshot and try again."
          : `Ticket #${ticketId} is not in this event snapshot.`,
      });
      return;
    }

    if (source === "scan") {
      setResumeScannerAfterDialog(true);
      stopScannerControls(scannerControls);
      setScannerActive(false);
    }

    setSelectedRegistration(registration);
  }, [registrationsByTicket]);

  const handleRawScan = useCallback((rawValue: string) => {
    if (selectedRegistration) {
      return;
    }

    const now = Date.now();
    if (lastScanRef.current?.value === rawValue && now - lastScanRef.current.at < 1500) {
      return;
    }
    lastScanRef.current = { value: rawValue, at: now };

    const payload = parseTicketQrPayload(rawValue);
    if (!payload) {
      setMessage({ severity: "warning", text: "Incomplete scan. Move closer and keep the QR code inside the camera view." });
      return;
    }

    if (payload.eventId !== eventId) {
      setMessage({ severity: "error", text: "Ticket belongs to another event." });
      return;
    }

    handleTicketId(payload.ticketId, "scan");
  }, [eventId, handleTicketId, selectedRegistration]);

  const startScanner = async () => {
    if (!videoRef.current) {
      return;
    }

    try {
      const reader = new BrowserMultiFormatReader();
      scannerControls.current = await reader.decodeFromVideoDevice(undefined, videoRef.current, result => {
        if (result) {
          handleRawScan(result.getText());
        }
      });
      setScannerActive(true);
      setMessage({ severity: "info", text: "Camera scanner started." });
    } catch (error) {
      setMessage({ severity: "error", text: error instanceof Error ? error.message : "Could not start camera scanner." });
    }
  };

  const stopScanner = () => {
    setResumeScannerAfterDialog(false);
    stopScannerControls(scannerControls);
    setScannerActive(false);
  };

  const closeRegistrationDialog = () => {
    const shouldResumeScanner = resumeScannerAfterDialog;
    setSelectedRegistration(null);
    if (shouldResumeScanner) {
      setResumeScannerAfterDialog(false);
      void startScanner();
    }
  };

  const showSuccessAndResume = (shouldResumeScanner: boolean) => {
    if (successTimeoutRef.current !== null) {
      window.clearTimeout(successTimeoutRef.current);
    }

    setShowCheckInSuccess(true);
    successTimeoutRef.current = window.setTimeout(() => {
      setShowCheckInSuccess(false);
      successTimeoutRef.current = null;
      if (shouldResumeScanner) {
        void startScanner();
      }
    }, 800);
  };

  const handleManualLookup = () => {
    const ticketId = Number(manualTicketId);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      setMessage({ severity: "error", text: "Enter a valid ticket ID." });
      return;
    }

    handleTicketId(ticketId);
  };

  const handleQueueCheckIn = async () => {
    if (!selectedRegistration || !snapshot) {
      return;
    }

    setCheckingIn(true);
    const shouldResumeScanner = resumeScannerAfterDialog;
    const operation: PendingCheckInOperation = {
      clientOperationId: createOperationId(),
      eventId,
      ticketId: selectedRegistration.ticketId,
      scannedAt: new Date().toISOString(),
    };

    try {
      const nextSnapshot = applyLocalCheckIn(snapshot, selectedRegistration.ticketId);
      setSnapshot(nextSnapshot);
      await saveSnapshot(nextSnapshot);
      await addPendingOperation(operation);
      await refreshPendingCount();
      setSelectedRegistration(null);
      setResumeScannerAfterDialog(false);
      showSuccessAndResume(shouldResumeScanner);
      setMessage({ severity: online ? "info" : "warning", text: online ? "Check-in queued for sync." : "Offline check-in queued." });
      void syncPending();
    } catch (error) {
      setMessage({ severity: "error", text: error instanceof Error ? error.message : "Could not queue check-in." });
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <Stack spacing={{ xs: 2, md: 3 }}>
      <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 } }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }}>
          <Box>
            <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: "1.5rem", md: "2.125rem" } }}>
              {snapshot?.event.name || "Event Check-in"}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
              <Chip label={online ? "Online" : "Offline"} color={online ? "success" : "warning"} size="small" />
              <Chip label={`${pendingCount} pending`} color={pendingCount > 0 ? "warning" : "default"} size="small" />
              {snapshot?.event.scanOnce ? <Chip label="Scan once" color="primary" size="small" /> : <Chip label="Repeat scans allowed" size="small" />}
            </Stack>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button variant="outlined" startIcon={<CloudDownload />} onClick={() => void refreshSnapshot()} disabled={loadingSnapshot} fullWidth>
              Refresh
            </Button>
            <Button variant="contained" startIcon={syncing ? <CircularProgress size={18} color="inherit" /> : <CloudSync />} onClick={() => void syncPending()} disabled={syncing || pendingCount === 0} fullWidth>
              Sync
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {message ? <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert> : null}

      {showCheckInSuccess ? (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: theme => theme.zIndex.modal + 2,
            bgcolor: "success.main",
            color: "success.contrastText",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            "@keyframes ventry-check-success": {
              "0%": { opacity: 0, transform: "scale(0.65)" },
              "45%": { opacity: 1, transform: "scale(1.08)" },
              "100%": { opacity: 1, transform: "scale(1)" },
            },
          }}
        >
          <CheckCircle
            sx={{
              fontSize: { xs: 132, md: 180 },
              animation: "ventry-check-success 650ms ease-out",
            }}
          />
        </Box>
      ) : null}

      <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 } }}>
        <Stack spacing={2}>
          <Box
            sx={{
              position: "relative",
              bgcolor: "grey.900",
              borderRadius: 1,
              overflow: "hidden",
              aspectRatio: { xs: "3 / 4", sm: "16 / 9" },
              maxHeight: { xs: "68vh", md: 560 },
            }}
          >
            <video ref={videoRef} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <Box
              sx={{
                position: "absolute",
                inset: { xs: "14%", sm: "18%" },
                border: "2px solid",
                borderColor: "success.light",
                borderRadius: 1,
                pointerEvents: "none",
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Scan only the full Ventry QR code. Plain ticket numbers are accepted in manual lookup only.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button variant="contained" startIcon={<Videocam />} onClick={() => void startScanner()} disabled={scannerActive || loadingSnapshot} fullWidth>
              Start Camera
            </Button>
            <Button variant="outlined" startIcon={<StopCircle />} onClick={stopScanner} disabled={!scannerActive} fullWidth>
              Stop
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 } }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="Manual ticket ID"
            value={manualTicketId}
            onChange={event => setManualTicketId(event.target.value)}
            type="number"
            fullWidth
          />
          <Button variant="contained" onClick={handleManualLookup} sx={{ minWidth: { sm: 160 } }} fullWidth>
            Look Up
          </Button>
        </Stack>
      </Paper>

      <Dialog open={!!selectedRegistration} onClose={closeRegistrationDialog} fullScreen>
        <DialogTitle>
          Ticket #{selectedRegistration?.ticketId}
        </DialogTitle>
        <DialogContent dividers>
          {selectedRegistration ? (
            <Stack spacing={3}>
              <Box>
                <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: "2rem", md: "3rem" } }}>
                  {selectedDisplayName}
                </Typography>
                {selectedLegalName ? (
                  <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 0.5 }}>
                    Legal name: {selectedLegalName}
                  </Typography>
                ) : null}
                <Typography variant="body1" color="text.secondary">
                  {selectedRegistration.ticketTier || "No ticket tier"}
                </Typography>
              </Box>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={selectedRegistration.status} />
                <Chip
                  label={selectedRegistration.checkedInAt ? `Checked in ${new Date(selectedRegistration.checkedInAt).toLocaleString()}` : "Not checked in"}
                  color={selectedRegistration.checkedInAt ? "success" : "default"}
                />
                <Chip label={`${selectedRegistration.checkInCount} scan${selectedRegistration.checkInCount === 1 ? "" : "s"}`} />
              </Stack>

              {!selectedRegistration.eligible ? (
                <Alert severity="warning">{selectedRegistration.eligibilityReason || "Ticket is not eligible for check-in."}</Alert>
              ) : null}

              <Divider />

              <Box>
                <Typography variant="h6" gutterBottom>
                  Booked Items
                </Typography>
                <Stack spacing={1}>
                  {selectedRegistration.bookedItems.map(item => (
                    <Paper key={item.id} variant="outlined" sx={{ p: 1.5 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography>{item.name}</Typography>
                        <Chip label={item.type} size="small" />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ position: "sticky", bottom: 0, bgcolor: "background.paper", p: 2 }}>
          <Button onClick={closeRegistrationDialog}>Close</Button>
          <Button
            variant="contained"
            startIcon={<CheckCircle />}
            onClick={() => void handleQueueCheckIn()}
            disabled={!selectedRegistration?.eligible || checkingIn}
          >
            {checkingIn ? "Checking in..." : "Check In"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
