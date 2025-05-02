"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Box,
    Button,
    TextField,
    InputAdornment,
    IconButton,
    CircularProgress
} from "@mui/material";
import { Visibility, VisibilityOff, CheckCircle } from "@mui/icons-material";
import AuthTemplate from "./template";
import { green } from "@mui/material/colors";

export default function LoginForm() {
    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const router = useRouter();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(formData)
            });

            if(!response.ok) {
                const data = await response.json();
                setError(data.error || "An error occurred");
                return;
            }

            setSuccess(true);
            setTimeout(() => {
                router.push("/dashboard");
                
            }, 1000);

            
        } catch(err: unknown) {
            if(err instanceof Error) {
                setError(err.message || "An error occurred");
            }
        } finally {
            setLoading(false);
        }
    }

    const buttonColor = success ? "success" : "primary";

    const buttonSx = {
        mt: 3,
        mb: 2,
        py: 1.5,
        height: "48px",
        position: "relative",
        transition: "background-color 0.3s, color 0.3s",
        // Override disabled styles when in success state
        "&.Mui-disabled": {
            backgroundColor: "primary.main",
            color: "white"
        }
    };

    const progressSx = {
        color: success ? green[500] : "inherit",
        position: "absolute",
        top: "50%",
        left: "50%",
        marginTop:  "-12px",
        marginLeft: "-12px",
    };

    return (
        <AuthTemplate form="login" error={error}>
            {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%' }}>
                <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="email"
                    label="E-Mail"
                    name="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                />
                
                <TextField
                    margin="normal"
                    required
                    fullWidth
                    name="password"
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={handleChange}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton
                                    aria-label="toggle password visibility"
                                    onClick={() => setShowPassword(!showPassword)}
                                    edge="end"
                                >
                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                />
                
                <Button
                    // type={(loading || success) ? "button" : "submit"}
                    type="submit"
                    fullWidth
                    variant="contained"
                    color={buttonColor}
                    sx={buttonSx}
                    disabled={loading || success}
                >
                    <span style={{
                        visibility: (loading || success) ? "hidden" : "visible",
                        position: (loading || success) ? "absolute" : "static",
                    }}>
                        Login
                    </span>
                    {loading && <CircularProgress size={24} sx={progressSx} />}
                    {success && <CheckCircle sx={{ ...progressSx, animation: "scale 0.3s"}} />}
                </Button>
            </Box>
        </AuthTemplate>
    );
}