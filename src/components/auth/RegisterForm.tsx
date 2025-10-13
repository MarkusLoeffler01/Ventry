"use client";
 
import { useState } from "react";
import {
  Box,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  CircularProgress,
  Alert,
  Typography,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";

import authClient from "@/lib/auth/client";
import AuthTemplate from "./template";
import PasswordStrengthMeter from "./PasswordStrengthMeter";
import { registerSchema } from "@/types/schemas/client/register";
import type { RegisterSchema } from "@/types/schemas/client/register";

export default function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<{ message: string | null; suggestions: string[] } | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterSchema>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
  });

  const password = watch("password");

  const onSubmit = async (data: RegisterSchema, e?: React.BaseSyntheticEvent) => {
    e?.preventDefault();
    try {
      setError(null);
      const { confirmPassword: _, ...payload } = data;

      const { error } = await authClient.signUp.email({
        email: payload.email,
        name: payload.username,
        password: payload.password,
      });

      if (error) {
        setError(error.message || "Registrierung fehlgeschlagen");
        return;
      }

      router.push("/login?registered=true");
    } catch (err) {
      console.error("Registration error:", err);
      setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten");
    }
  };

  return (
    <AuthTemplate form="register" error={error} title="Registrieren">
      <Box
        component="form"
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        noValidate
        autoComplete="off"
      >
        <TextField
          margin="normal"
          required
          fullWidth
          label="E-Mail"
          autoComplete="email"
          {...register("email")}
          error={!!errors.email}
          helperText={errors.email?.message || " "}
        />

        <TextField
          margin="normal"
          required
          fullWidth
          label="Username"
          autoComplete="username"
          {...register("username")}
          error={!!errors.username}
          helperText={errors.username?.message || " "}
        />

        <TextField
          margin="normal"
          required
          fullWidth
          label="Password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          {...register("password")}
          error={!!errors.password}
          helperText={errors.password?.message || " "}
          slotProps={
            {
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={
                        showPassword ? "Passwort verbergen" : "Passwort anzeigen"
                      }
                      onClick={() => setShowPassword((s) => !s)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }
            }
          }
        />

        <PasswordStrengthMeter password={password} setWarning={setWarning}/>

        {warning?.message && (
          <Alert severity="error" sx={{ mt: 2, mb: 1 }}>
            <Typography variant="body2" gutterBottom>
              {warning.message}
            </Typography>
            {warning.suggestions.length > 0 && (
              <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                {warning.suggestions.map((suggestion) => (
                  <Typography component="li" variant="body2" key={suggestion}>
                    {suggestion}
                  </Typography>
                ))}
              </Box>
            )}
          </Alert>
        )}

        <TextField
          margin="normal"
          required
          fullWidth
          label="Confirm Password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          {...register("confirmPassword")}
          error={!!errors.confirmPassword}
          helperText={errors.confirmPassword?.message || " "}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2, py: 1.5 }}
          disabled={isSubmitting || warning !== null}
        >
          {isSubmitting ? <CircularProgress size={24} /> : "Sign up"}
        </Button>
      </Box>
    </AuthTemplate>
  );
}
