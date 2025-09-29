"use client";

import { useState } from 'react';
import { 
  Box, 
  TextField, 
  Typography, 
  FormControl,
  InputLabel,
  OutlinedInput,
  InputAdornment,
  IconButton,
  Switch,
  FormControlLabel
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import PasswordStrengthMeter from '@/components/auth/PasswordStrengthMeter';

export default function PasswordTestClient() {
  const [formValues, setFormValues] = useState({
    name: '',
    email: '',
    password: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [includeUserInfo, setIncludeUserInfo] = useState(true);
  
  const handleChange = (prop: keyof typeof formValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormValues({ ...formValues, [prop]: event.target.value });
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };
  
  const handleToggleUserInfo = () => {
    setIncludeUserInfo(!includeUserInfo);
  };

  // Define user inputs for zxcvbn to check against
  const userInputs = includeUserInfo ? [
    formValues.name,
    formValues.email,
    // Add other personal information that should not be in password
  ].filter(Boolean) : [];

  return (
    <Box component="form" noValidate sx={{ mt: 3 }}>
      <TextField
        margin="normal"
        fullWidth
        id="name"
        label="Name"
        name="name"
        autoComplete="name"
        value={formValues.name}
        onChange={handleChange('name')}
      />
      
      <TextField
        margin="normal"
        fullWidth
        id="email"
        label="Email Address"
        name="email"
        autoComplete="email"
        value={formValues.email}
        onChange={handleChange('email')}
      />
      
      <FormControl fullWidth margin="normal" variant="outlined">
        <InputLabel htmlFor="password">Password</InputLabel>
        <OutlinedInput
          id="password"
          type={showPassword ? 'text' : 'password'}
          value={formValues.password}
          onChange={handleChange('password')}
          endAdornment={
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={handleClickShowPassword}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          }
          label="Password"
        />
      </FormControl>
      
      <FormControlLabel
        control={
          <Switch 
            checked={includeUserInfo} 
            onChange={handleToggleUserInfo}
            color="primary"
          />
        }
        label="Check password against personal information"
        sx={{ mt: 2 }}
      />
      
      {formValues.password && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Password Strength:
          </Typography>
          <PasswordStrengthMeter 
            password={formValues.password}
            userInputs={userInputs}
          />
        </Box>
      )}
      
      {formValues.password && includeUserInfo && (formValues.name || formValues.email) && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Note: Using personal information in your password decreases its security.
        </Typography>
      )}
    </Box>
  );
}