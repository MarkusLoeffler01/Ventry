"use client";

import { useState } from "react";
import {
    Box,
    TextField,
    Button,
    Typography,
    Alert,
    Paper,
    InputAdornment,
    IconButton,
    CircularProgress,
} from "@mui/material";
import { Visibility, VisibilityOff, Warning } from "@mui/icons-material";

interface ResetPasswordFormProps {
    token: string;
    identifier: string;
    onSubmit: (password: string) => Promise<{ success: boolean; error?: string }>;
}

const styles = {
    container: {
        maxWidth: 500,
        mx: "auto",
        mt: 4,
        p: 4,
    },
    title: {
        mb: 2,
        fontWeight: 600,
    },
    warningBox: {
        mb: 3,
        display: "flex",
        alignItems: "flex-start",
        gap: 1,
        p: 2,
        backgroundColor: "warning.light",
        borderRadius: 1,
    },
    warningIcon: {
        color: "warning.dark",
        mt: 0.5,
    },
    warningText: {
        color: "warning.dark",
        fontSize: "0.875rem",
    },
    form: {
        display: "flex",
        flexDirection: "column",
        gap: 2,
    },
    submitButton: {
        mt: 1,
        py: 1.5,
    },
};

export default function ResetPasswordForm({ token: _token, identifier: _identifier, onSubmit }: ResetPasswordFormProps) {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const passwordsMatch = password === confirmPassword;
    const isPasswordValid = password.length >= 8;
    const canSubmit = password && confirmPassword && passwordsMatch && isPasswordValid && !loading;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!canSubmit) return;

        setLoading(true);
        setError("");

        try {
            const result = await onSubmit(password);
            
            if (result.success) {
                setSuccess(true);
            } else {
                setError(result.error || "Failed to reset password. Please try again.");
            }
        } catch {
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <Paper elevation={3} sx={styles.container}>
                <Alert severity="success" sx={{ mb: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        Password Reset Successful!
                    </Typography>
                    <Typography variant="body2">
                        Your password has been updated. All active sessions have been terminated.
                        You can now log in with your new password.
                    </Typography>
                </Alert>
                <Button
                    variant="contained"
                    fullWidth
                    href="/login"
                    sx={{ mt: 2 }}
                >
                    Go to Login
                </Button>
            </Paper>
        );
    }

    return (
        <Paper elevation={3} sx={styles.container}>
            <Typography variant="h4" sx={styles.title}>
                Reset Your Password
            </Typography>

            <Box sx={styles.warningBox}>
                <Warning sx={styles.warningIcon} />
                <Box>
                    <Typography variant="body2" sx={{ ...styles.warningText, fontWeight: 600, mb: 0.5 }}>
                        Security Notice
                    </Typography>
                    <Typography variant="body2" sx={styles.warningText}>
                        Resetting your password will immediately invalidate all active sessions 
                        and log you out of all devices. You&apos;ll need to log in again with your new password.
                    </Typography>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Box component="form" onSubmit={(e) => { void handleSubmit(e); }} sx={styles.form}>
                <TextField
                    label="New Password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    fullWidth
                    disabled={loading}
                    error={password.length > 0 && !isPasswordValid}
                    helperText={
                        password.length > 0 && !isPasswordValid
                            ? "Password must be at least 8 characters"
                            : ""
                    }
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton
                                    onClick={() => setShowPassword(!showPassword)}
                                    edge="end"
                                    disabled={loading}
                                >
                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                />

                <TextField
                    label="Confirm New Password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    fullWidth
                    disabled={loading}
                    error={confirmPassword.length > 0 && !passwordsMatch}
                    helperText={
                        confirmPassword.length > 0 && !passwordsMatch
                            ? "Passwords do not match"
                            : ""
                    }
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    edge="end"
                                    disabled={loading}
                                >
                                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                />

                <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    disabled={!canSubmit}
                    sx={styles.submitButton}
                >
                    {loading ? (
                        <>
                            <CircularProgress size={24} sx={{ mr: 1 }} />
                            Resetting Password...
                        </>
                    ) : (
                        "Reset Password"
                    )}
                </Button>
            </Box>
        </Paper>
    );
}
