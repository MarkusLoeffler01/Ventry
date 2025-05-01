"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box,
    Button,
    TextField,
    InputAdornment,
    IconButton,
    CircularProgress
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import zxcvbn from 'zxcvbn';

import ValidationDetails from '@/types/apiResponses/register';
import AuthTemplate from './template';
import PasswordStrengthMeter from './PasswordStrengthMeter';

const RegisterForm = () => {
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    
    // Form validations states
    const [emailError, setEmailError] = useState<string | null>(null);
    const [usernameError, setUsernameError] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
    
    const router = useRouter();

    const handleRegister = async ({email, name, password}: {email: string, name: string, password: string}) => {
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, name, password }),
        });

        const data = await response.json();

        if (!response.ok && "error" in data) {
            const error: ValidationDetails = data;

            setError(error.message || 'Registrierung fehlgeschlagen');

            if("details" in error) {
              if(error.details.email?._errors) {
                setEmailError(error.details.email._errors.join(", "));
              }
              if(error.details.name?._errors) {
                  setUsernameError(error.details.name._errors.join(", "));
              }
              if(error.details.password?._errors) {
                  setPasswordError(error.details.password._errors.join(", "));
              }
            }
            return;
        }

        // Erfolgreiche Registrierung, weiterleiten zur Login-Seite
        router.push('/login?registered=true');
      } catch (error) {
        console.error('Registrierungsfehler:', error);
        throw error;
      }
    };

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValid = emailRegex.test(email);
        setEmailError(isValid ? null : "Invalid email address");
        return isValid;
    }
    
    const validateUsername = (username: string): boolean => {
        const isValid = username.length >= 3;
        setUsernameError(isValid ? null : 'Benutzername muss mindestens 3 Zeichen haben');
        return isValid;
    };
    
    const validatePassword = (password: string): boolean => {
        // Use zxcvbn for enhanced password validation
        if (!password) {
            setPasswordError('Password is required');
            return false;
        }
        
        const result = zxcvbn(password, [email, username]);
        const isStrong = result.score >= 2; // Require at least a "Fair" strength
        
        if (!isStrong) {
            setPasswordError('Password is too weak. Please choose a stronger password.');
            return false;
        }
        
        setPasswordError(null);
        return true;
    };
    
    const validateConfirmPassword = (password: string, confirmPassword: string): boolean => {
        const isValid = password === confirmPassword;
        setConfirmPasswordError(isValid ? null : 'Passwörter stimmen nicht überein');
        return isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        // Validate all fields
        const isEmailValid = validateEmail(email);
        const isUsernameValid = validateUsername(username);
        const isPasswordValid = validatePassword(password);
        const isConfirmPasswordValid = validateConfirmPassword(password, confirmPassword);

        if(!isEmailValid || !isUsernameValid || !isPasswordValid || !isConfirmPasswordValid) {
            return;
        }

        try {
            setLoading(true);
            await handleRegister({email, password, name: username});
            // Handle successful registration (e.g., redirect or show success message)
        } catch (error) {
            setError(error instanceof Error ? error.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return  <AuthTemplate form="register" error={error} title="Registrieren">
      {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <TextField
          margin="normal"
          required
          fullWidth
          id="email"
          label="E-Mail"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => validateEmail(email)}
          error={!!emailError}
          helperText={emailError}
        />
        
        <TextField
          margin="normal"
          required
          fullWidth
          id="username"
          label="Username"
          name="username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onBlur={() => validateUsername(username)}
          error={!!usernameError}
          helperText={usernameError}
        />
        
        <TextField
          margin="normal"
          required
          fullWidth
          name="password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          id="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => validatePassword(password)}
          error={!!passwordError}
          helperText={passwordError}
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
        
        <PasswordStrengthMeter password={password} />
        
        <TextField
          margin="normal"
          required
          fullWidth
          name="confirmPassword"
          label="Confirm Password"
          type={showPassword ? 'text' : 'password'}
          id="confirmPassword"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onBlur={() => validateConfirmPassword(password, confirmPassword)}
          error={!!confirmPasswordError}
          helperText={confirmPasswordError}
        />
        
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2, py: 1.5 }}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Sign up'}
        </Button>
      </Box>
  </AuthTemplate>
    
}

export default RegisterForm;