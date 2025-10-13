"use client";

import {
    Container,
    Paper,
    Box,
    Typography,
    Button,
    Alert,
    Stack,
    Chip,
    Divider,
} from "@mui/material";
import {
    NoAccounts,
    Info,
    Schedule,
    Email,
    ArrowBack,
    Notifications,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";

interface DisabledSignUpProps {
    reason?: "maintenance" | "capacity" | "invitation_only" | "temporarily_disabled" | "signup_disabled";
    message?: string;
    estimatedRestoration?: string;
    contactEmail?: string;
}

export default function DisabledSignUp({
    reason = "temporarily_disabled",
    message,
    estimatedRestoration,
    contactEmail = "support@ventry.com"
}: DisabledSignUpProps) {
    const router = useRouter();

    const getReasonConfig = () => {
        switch (reason) {
            case "maintenance":
                return {
                    title: "Registration Under Maintenance",
                    description: "We're currently performing system maintenance to improve your experience.",
                    icon: <Schedule sx={{ fontSize: 64, color: "warning.main" }} />,
                    color: "warning" as const,
                    chipLabel: "Maintenance Mode"
                };
            case "capacity":
                return {
                    title: "Registration Temporarily Full",
                    description: "We've reached our current capacity limit and are working to expand our infrastructure.",
                    icon: <NoAccounts sx={{ fontSize: 64, color: "error.main" }} />,
                    color: "error" as const,
                    chipLabel: "At Capacity"
                };
            case "invitation_only":
                return {
                    title: "Invitation-Only Registration",
                    description: "Ventry is currently in beta and available by invitation only.",
                    icon: <Email sx={{ fontSize: 64, color: "info.main" }} />,
                    color: "info" as const,
                    chipLabel: "Invite Only"
                };
            case "signup_disabled":
                return {
                    title: "Cannot Link OAuth Provider",
                    description: "New account creation is currently disabled. OAuth provider linking is only available from your profile page after logging in.",
                    icon: <NoAccounts sx={{ fontSize: 64, color: "warning.main" }} />,
                    color: "warning" as const,
                    chipLabel: "OAuth Linking Disabled"
                };
            default:
                return {
                    title: "Registration Temporarily Disabled",
                    description: "New user registration is currently disabled. We apologize for the inconvenience.",
                    icon: <NoAccounts sx={{ fontSize: 64, color: "warning.main" }} />,
                    color: "warning" as const,
                    chipLabel: "Temporarily Disabled"
                };
        }
    };

    const config = getReasonConfig();

    return (
        <Container maxWidth="md">
            <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", py: 4 }}>
                <Paper 
                    elevation={3} 
                    sx={{ 
                        p: 6, 
                        width: "100%", 
                        textAlign: "center",
                        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
                        position: "relative",
                        overflow: "hidden"
                    }}
                >
                    {/* Background decoration */}
                    <Box
                        sx={{
                            position: "absolute",
                            top: -50,
                            right: -50,
                            width: 200,
                            height: 200,
                            borderRadius: "50%",
                            background: "rgba(25, 118, 210, 0.1)",
                            zIndex: 0
                        }}
                    />
                    <Box
                        sx={{
                            position: "absolute",
                            bottom: -30,
                            left: -30,
                            width: 150,
                            height: 150,
                            borderRadius: "50%",
                            background: "rgba(156, 39, 176, 0.1)",
                            zIndex: 0
                        }}
                    />

                    {/* Main content */}
                    <Box sx={{ position: "relative", zIndex: 1 }}>
                        {/* Status chip */}
                        <Chip
                            label={config.chipLabel}
                            color={config.color}
                            size="medium"
                            sx={{ mb: 3, fontWeight: 600 }}
                        />

                        {/* Icon */}
                        <Box sx={{ mb: 3 }}>
                            {config.icon}
                        </Box>

                        {/* Title */}
                        <Typography variant="h3" gutterBottom sx={{ fontWeight: 700, mb: 2 }}>
                            {config.title}
                        </Typography>

                        {/* Description */}
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: "auto" }}>
                            {message || config.description}
                        </Typography>

                        <Divider sx={{ my: 4, maxWidth: 400, mx: "auto" }} />

                        {/* Information sections */}
                        <Stack spacing={3} sx={{ mb: 4 }}>
                            {estimatedRestoration && (
                                <Alert severity="info" sx={{ textAlign: "left" }}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        <Schedule />
                                        <Typography variant="body2" fontWeight={600}>
                                            Estimated Restoration:
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" sx={{ mt: 1 }}>
                                        {estimatedRestoration}
                                    </Typography>
                                </Alert>
                            )}

                            {reason === "invitation_only" && (
                                <Alert severity="info" sx={{ textAlign: "left" }}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        <Email />
                                        <Typography variant="body2" fontWeight={600}>
                                            Request an Invitation:
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" sx={{ mt: 1 }}>
                                        Contact us at{" "}
                                        <Typography component="span" sx={{ fontWeight: 600, color: "primary.main" }}>
                                            {contactEmail}
                                        </Typography>
                                        {" "}to request early access to Ventry.
                                    </Typography>
                                </Alert>
                            )}

                            {reason === "signup_disabled" && (
                                <Alert severity="warning" sx={{ textAlign: "left" }}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        <Info />
                                        <Typography variant="body2" fontWeight={600}>
                                            How to Link OAuth Providers:
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" sx={{ mt: 1 }}>
                                        1. Log in to your existing account using email & password<br/>
                                        2. Go to your Profile settings<br/>
                                        3. Navigate to &quot;Linked Accounts&quot; section<br/>
                                        4. Click &quot;Link&quot; next to your preferred OAuth provider
                                    </Typography>
                                </Alert>
                            )}

                            <Alert severity="success" sx={{ textAlign: "left" }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <Info />
                                    <Typography variant="body2" fontWeight={600}>
                                        Already have an account?
                                    </Typography>
                                </Box>
                                <Typography variant="body2" sx={{ mt: 1 }}>
                                    Existing users can continue to log in normally. This restriction only affects new registrations.
                                </Typography>
                            </Alert>
                        </Stack>

                        {/* Action buttons */}
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<ArrowBack />}
                                onClick={() => router.push("/login")}
                                sx={{ px: 4, py: 1.5 }}
                            >
                                Back to Login
                            </Button>

                            {reason === "invitation_only" ? (
                                <Button
                                    variant="outlined"
                                    size="large"
                                    startIcon={<Email />}
                                    href={`mailto:${contactEmail}?subject=Ventry Beta Access Request&body=Hi, I'd like to request access to Ventry beta.`}
                                    sx={{ px: 4, py: 1.5 }}
                                >
                                    Request Invitation
                                </Button>
                            ) : reason === "signup_disabled" ? (
                                <Button
                                    variant="outlined"
                                    size="large"
                                    startIcon={<ArrowBack />}
                                    onClick={() => router.push("/profile")}
                                    sx={{ px: 4, py: 1.5 }}
                                >
                                    Go to Profile
                                </Button>
                            ) : (
                                <Button
                                    variant="outlined"
                                    size="large"
                                    startIcon={<Notifications />}
                                    onClick={() => {
                                        // TODO: Implement notification signup
                                        alert("Notification signup coming soon!");
                                    }}
                                    sx={{ px: 4, py: 1.5 }}
                                >
                                    Notify When Available
                                </Button>
                            )}
                        </Stack>

                        {/* Footer info */}
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 4 }}>
                            We appreciate your patience and look forward to welcoming you to Ventry soon.
                        </Typography>
                    </Box>
                </Paper>
            </Box>
        </Container>
    );
}

export type { DisabledSignUpProps };