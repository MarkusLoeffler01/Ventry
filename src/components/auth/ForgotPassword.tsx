"use client";

import { useState, useId } from "react";
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
import { Close, Email } from "@mui/icons-material";
import authClient from "@/lib/auth/client";

interface ForgotPasswordProps {
    open: boolean;
    onClose: () => void;
}

export default function ForgotPassword({ open, onClose }: ForgotPasswordProps) {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const formId = useId();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess(false);

        try {
            const result = await authClient.forgetPassword({
                email,
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (result.error) {
                setError(result.error.message || "Failed to send reset email.");
                return;
            }

            setSuccess(true);
            setEmail("");
            
            // Auto-close after 3 seconds
            setTimeout(() => {
                handleClose();
            }, 3000);
        } catch (err) {
            console.error("Password reset error:", err);
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

    const isValidEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            sx={{
                borderRadius: 2,
                minHeight: 200
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center" gap={1}>
                        <Email color="primary" />
                        <Typography variant="h5" component="span">
                            Reset Password
                        </Typography>
                    </Box>
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

            <DialogContent>
                {success ? (
                    <Alert severity="success" sx={{ mt: 1 }}>
                        <Typography variant="body2" gutterBottom>
                            Password reset email sent!
                        </Typography>
                        <Typography variant="body2">
                            If an account exists with this email address, you&apos;ll receive 
                            a password reset link shortly. Check your inbox and spam folder.
                        </Typography>
                    </Alert>
                ) : (
                    <Box component="form" onSubmit={(e) => { void handleSubmit(e); }} id={formId}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Enter your email address and we&apos;ll send you a secure link to reset your password.
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
                            error={!!error || (email.length > 0 && !isValidEmail(email))}
                            helperText={
                                error || 
                                (email.length > 0 && !isValidEmail(email) ? "Please enter a valid email address" : "")
                            }
                            sx={{ mb: 2 }}
                            InputProps={{
                                startAdornment: (
                                    <Email sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
                                ),
                            }}
                        />

                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {error}
                            </Alert>
                        )}
                    </Box>
                )}
            </DialogContent>

            {!success && (
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button 
                        onClick={handleClose} 
                        disabled={loading}
                        color="inherit"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        form={formId}
                        variant="contained"
                        disabled={loading || !email || !isValidEmail(email)}
                        startIcon={loading ? <CircularProgress size={20} /> : <Email />}
                        sx={{ minWidth: 140 }}
                    >
                        {loading ? "Sending..." : "Send Reset Link"}
                    </Button>
                </DialogActions>
            )}
        </Dialog>
    );
}