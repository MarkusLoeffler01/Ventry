// LoginPage.tsx
"use client";

import LoginForm from "@/components/auth/LoginForm";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { useSearchParams } from "next/navigation";
import Alert from "@mui/material/Alert";

export default function LoginPage() {
    const searchParams = useSearchParams();

    const registered = searchParams.get("registered");


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
          
          
            {   registered && (
                <Box sx={{ mb: 2 }}>
                    <Alert severity="success">
                        Registration successful! Please log in.
                    </Alert>
                </Box>
            )}

            <Typography component="h1" variant="h4" align="center" sx={{ mt: 4 }}>
                Login
            </Typography>

          <LoginForm/>
          
        </Paper>
      </Box>
    </Container>
  );
}