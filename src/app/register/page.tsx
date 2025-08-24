// RegisterPage.tsx
"use client";

import { 
  Box, 
  Typography, 
  Container, 
  Paper
} from '@mui/material';
import RegisterForm from '@/components/auth/RegisterForm';

export default function RegisterPage() {

  return (
    <Container maxWidth="lg">
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '100vh',
        py: 4
      }}>
        <Paper 
          elevation={0} 
          sx={{ 
            width: '100%', 
            maxWidth: 600, 
            display: 'flex', 
            flexDirection: 'column',
            p: { xs: 2, md: 4 }
          }}
        >
          <Typography component="h1" variant="h4" align="center" sx={{ mt: 4 }}>
            Sign up
          </Typography>
          
          <RegisterForm/>
          
          
        </Paper>
      </Box>
    </Container>
  );
};
