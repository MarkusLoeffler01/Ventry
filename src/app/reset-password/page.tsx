"use client";

import { useState } from "react";
import {
    Container,
    Paper,
    Box,
    Typography,
    TextField,
    Button,
    Alert,
    CircularProgress,
    InputAdornment,
    IconButton,
} from "@mui/material";
import { Visibility, VisibilityOff, LockReset, CheckCircle } from "@mui/icons-material";
import { useSearchParams, useRouter } from "next/navigation";
import authClient from "@authclient";

export default function ResetPasswordPage() {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const token = useSearchParams().get("token");
    const router = useRouter();

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters long");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const result = await authClient.resetPassword({
                newPassword: newPassword,
                token: token as string
            });

            if (result.error) {
                setError(result.error.message || "Failed to reset password");
                return;
            }

            setSuccess(true);
            
            // Redirect to login after 3 seconds
            setTimeout(() => {
                router.push("/login?message=Password reset successful");
            }, 3000);
        } catch (err) {
            console.error("Password reset error:", err);
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <Container maxWidth="sm">
                <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", py: 4 }}>
                    <Paper elevation={3} sx={{ p: 4, width: "100%", textAlign: "center" }}>
                        <Alert severity="error" sx={{ mb: 2 }}>
                            <Typography variant="h6" gutterBottom>
                                Invalid Password Reset Link
                            </Typography>
                            <Typography variant="body2">
                                The password reset link is invalid, expired, or has already been used.
                                Please request a new password reset link.
                            </Typography>
                        </Alert>
                        <Button
                            variant="contained"
                            onClick={() => router.push("/login")}
                            sx={{ mt: 2 }}
                        >
                            Back to Login
                        </Button>
                    </Paper>
                </Box>
            </Container>
        );
    }

    if (success) {
        return (
            <Container maxWidth="sm">
                <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", py: 4 }}>
                    <Paper elevation={3} sx={{ p: 4, width: "100%", textAlign: "center" }}>
                        <CheckCircle color="success" sx={{ fontSize: 64, mb: 2 }} />
                        <Typography variant="h4" gutterBottom color="success.main">
                            Password Reset Successful!
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 3 }}>
                            Your password has been successfully updated. You will be redirected to the login page shortly.
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={() => router.push("/login")}
                            sx={{ mt: 2 }}
                        >
                            Continue to Login
                        </Button>
                    </Paper>
                </Box>
            </Container>
        );
    }

    const passwordsMatch = newPassword === confirmPassword;
    const isPasswordValid = newPassword.length >= 8;
    const canSubmit = newPassword && confirmPassword && passwordsMatch && isPasswordValid && !loading;

    return (
        <Container maxWidth="sm">
            <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", py: 4 }}>
                <Paper elevation={3} sx={{ p: 4, width: "100%" }}>
                    {/* Header */}
                    <Box sx={{ textAlign: "center", mb: 4 }}>
                        <LockReset color="primary" sx={{ fontSize: 48, mb: 2 }} />
                        <Typography variant="h4" gutterBottom>
                            Reset Your Password
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Enter your new password below
                        </Typography>
                    </Box>

                    {/* Form */}
                    <Box component="form" onSubmit={(e) => { void handlePasswordReset(e); }}>
                        <TextField
                            fullWidth
                            label="New Password"
                            type={showPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            autoFocus
                            disabled={loading}
                            error={newPassword.length > 0 && !isPasswordValid}
                            helperText={
                                newPassword.length > 0 && !isPasswordValid
                                    ? "Password must be at least 8 characters"
                                    : ""
                            }
                            sx={{ mb: 3 }}
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
                            fullWidth
                            label="Confirm New Password"
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={loading}
                            error={confirmPassword.length > 0 && !passwordsMatch}
                            helperText={
                                confirmPassword.length > 0 && !passwordsMatch
                                    ? "Passwords do not match"
                                    : ""
                            }
                            sx={{ mb: 3 }}
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

                        {error && (
                            <Alert severity="error" sx={{ mb: 3 }}>
                                {error}
                            </Alert>
                        )}

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            size="large"
                            disabled={!canSubmit}
                            startIcon={loading ? <CircularProgress size={20} /> : <LockReset />}
                            sx={{ py: 1.5, mb: 2 }}
                        >
                            {loading ? "Resetting Password..." : "Reset Password"}
                        </Button>

                        <Button
                            fullWidth
                            variant="text"
                            onClick={() => router.push("/login")}
                            disabled={loading}
                        >
                            Back to Login
                        </Button>
                    </Box>
                </Paper>
            </Box>
        </Container>
    );
}