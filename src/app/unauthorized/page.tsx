"use client";

import { Box, Typography, Button } from "@mui/material";
import { LockOutlined } from "@mui/icons-material";
import Link from "next/link";

export default function AdminUnauthorized() {
    return (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 2, textAlign: "center" }}>
            <LockOutlined sx={{ fontSize: 64, color: "error.main" }} />
            <Typography variant="h4" fontWeight="bold">Access Denied</Typography>
            <Typography variant="body1" color="text.secondary">
                You do not have permission to access this page.
            </Typography>
            <Button variant="contained" component={Link} href="/login">
                Log in as Admin
            </Button>
        </Box>
    );
}
