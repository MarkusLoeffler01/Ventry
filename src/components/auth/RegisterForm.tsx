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
import { DISPLAY_NAME_MAX_LENGTH } from "@/lib/user/display-name";

export default function RegisterForm({ callbackUrl }: { callbackUrl?: string }) {
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

  // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form watch() is intentional
  const password = watch("password");
  // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form watch() is intentional
  const username = watch("username") || "";

  const onSubmit = async (data: RegisterSchema, e?: React.BaseSyntheticEvent) => {
    e?.preventDefault();
    try {
      setError(null);
      const { confirmPassword: _, ...payload } = data;

      // Pre-check: better-auth silently returns 200 for duplicate emails when
      // requireEmailVerification is enabled (anti-enumeration). Check first.
      const checkRes = await fetch("/api/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: payload.email }),
      });
      const { exists } = await checkRes.json() as { exists: boolean };
      if (exists) {
        setError("An account with this email address already exists. Please sign in or reset your password.");
        return;
      }

      const { error } = await authClient.signUp.email({
        email: payload.email,
        name: payload.username,
        password: payload.password,
        legalName: payload.legalName,
        addressLine1: payload.addressLine1,
        addressLine2: payload.addressLine2 || null,
        addressCity: payload.addressCity,
        addressState: payload.addressState || null,
        addressPostalCode: payload.addressPostalCode,
        addressCountry: payload.addressCountry,
      });

      if (error) {
        setError(error.message || "Registrierung fehlgeschlagen");
        return;
      }

      const loginRedirectUrl = callbackUrl 
        ? `/login?registered=true&callbackUrl=${encodeURIComponent(callbackUrl)}`
        : "/login?registered=true";
        
      router.push(loginRedirectUrl);
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
          inputProps={{ maxLength: DISPLAY_NAME_MAX_LENGTH }}
          {...register("username")}
          error={!!errors.username}
          helperText={errors.username?.message || `${username.length}/${DISPLAY_NAME_MAX_LENGTH}`}
        />

        <Alert severity="info" sx={{ mt: 2, mb: 1 }}>
          Your legal name and address are protected personal data. They are not shown to other attendees or organizers in normal event views; check-in staff may see your legal name only when verifying your ID at the door.
        </Alert>

        <TextField
          margin="normal"
          required
          fullWidth
          label="Legal name"
          autoComplete="name"
          {...register("legalName")}
          error={!!errors.legalName}
          helperText={errors.legalName?.message || " "}
        />

        <TextField
          margin="normal"
          required
          fullWidth
          label="Address"
          autoComplete="street-address"
          {...register("addressLine1")}
          error={!!errors.addressLine1}
          helperText={errors.addressLine1?.message || " "}
        />

        <TextField
          margin="normal"
          fullWidth
          label="Address line 2"
          autoComplete="address-line2"
          {...register("addressLine2")}
          error={!!errors.addressLine2}
          helperText={errors.addressLine2?.message || " "}
        />

        <TextField
          margin="normal"
          required
          fullWidth
          label="City"
          autoComplete="address-level2"
          {...register("addressCity")}
          error={!!errors.addressCity}
          helperText={errors.addressCity?.message || " "}
        />

        <TextField
          margin="normal"
          fullWidth
          label="State/Region"
          autoComplete="address-level1"
          {...register("addressState")}
          error={!!errors.addressState}
          helperText={errors.addressState?.message || " "}
        />

        <TextField
          margin="normal"
          required
          fullWidth
          label="Postal code"
          autoComplete="postal-code"
          {...register("addressPostalCode")}
          error={!!errors.addressPostalCode}
          helperText={errors.addressPostalCode?.message || " "}
        />

        <TextField
          margin="normal"
          required
          fullWidth
          label="Country"
          autoComplete="country-name"
          {...register("addressCountry")}
          error={!!errors.addressCountry}
          helperText={errors.addressCountry?.message || " "}
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
