"use client";

import { useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Alert,
    CircularProgress,
    Typography,
    Box,
    IconButton,
} from "@mui/material";
import { Close } from "@mui/icons-material";

interface ForgotPasswordProps {
    open: boolean;
    onClose: () => void;
}

export default function ForgotPassword({ open, onClose }: ForgotPasswordProps) {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess(false);

        try {
            const res = await fetch("/api/auth/password-reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (res.ok) {
                setSuccess(true);
                setEmail("");
                // Close modal after 3 seconds
                setTimeout(() => {
                    onClose();
                    setSuccess(false);
                }, 3000);
            } else {
                const data = await res.json();
                setError(data.error || "Failed to send reset email.");
            }
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setEmail("");
            setError("");
            setSuccess(false);
            onClose();
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            slotProps={
                {
                    paper: {
                        sx: {
                            borderRadius: 2
                        }
                    }
                }
            }
        >
            <Title loading={loading} handleClose={handleClose} />

            <DialogContent>
                {success ? (
                    <Alert severity="success" sx={{ mt: 1 }}>
                        If an account exists with this email, a password reset link has been sent.
                    </Alert>
                ) : (
                    <Box component="form" onSubmit={(e) => { void handleSubmit(e); }} id="forgot-password-form">
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Enter your email address and we&apos;ll send you a link to reset your password.
                        </Typography>

                        <TextField
                            fullWidth
                            label="Email Address"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                            disabled={loading}
                            error={!!error}
                            sx={{ mb: 2 }}
                        />

                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {error}
                            </Alert>
                        )}
                    </Box>
                )}
            </DialogContent>

            {!success && <Success loading={loading} email={email} handleClose={handleClose} />}
        </Dialog>
    );
}

function Success({loading, email, handleClose}: {loading: boolean, email: string, handleClose: () => void}) {
    return <DialogActions sx={{ px: 3, pb: 3 }}>
                <Button 
                        onClick={handleClose} 
                        disabled={loading}
                        color="inherit"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        form="forgot-password-form"
                        variant="contained"
                        disabled={loading || !email}
                        startIcon={loading && <CircularProgress size={20} />}
                    >
                        {loading ? "Sending..." : "Send Reset Link"}
                </Button>
            </DialogActions>
}

function Title({ loading, handleClose }: { loading: boolean; handleClose: () => void }) {
    return <DialogTitle sx={{ pb: 1 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography variant="h5" component="span">
                        Reset Your Password
                    </Typography>
                    <IconButton
                        edge="end"
                        color="inherit"
                        onClick={handleClose}
                        aria-label="close"
                        disabled={loading}
                    >
                        <Close />
                    </IconButton>
                </Box>
            </DialogTitle>
}