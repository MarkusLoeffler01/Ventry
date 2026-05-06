"use client";

import React from "react";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import { useSearchParams } from "next/navigation";

const STATUS_MESSAGES: Record<string, { severity: "success" | "info" | "warning" | "error"; message: string }> = {
    email_verified: {
        severity: "success",
        message: "Your email has been verified and your account is now active. Welcome to Ventry!",
    },
};

/**
 * Reads ?status= from the URL on mount, shows a Snackbar if recognised, then
 * strips the param from the address bar via window.history.replaceState.
 */
export default function StatusSnackbar() {
    const searchParams = useSearchParams();

    // Initialise state from the URL params. useState initialiser runs once.
    const [entry] = React.useState(() => {
        const status = searchParams.get("status");
        return status ? (STATUS_MESSAGES[status] ?? null) : null;
    });
    const [open, setOpen] = React.useState(!!entry);

    React.useEffect(() => {
        if (!entry) return;
        // Clean the param from the URL without triggering navigation
        const next = new URLSearchParams(window.location.search);
        next.delete("status");
        const qs = next.toString();
        window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    }, [entry]);

    if (!entry) return null;

    return (
        <Snackbar
            open={open}
            autoHideDuration={6000}
            onClose={() => setOpen(false)}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
            <Alert
                severity={entry.severity}
                variant="filled"
                onClose={() => setOpen(false)}
                sx={{ width: "100%" }}
            >
                {entry.message}
            </Alert>
        </Snackbar>
    );
}
