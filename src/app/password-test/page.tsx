import { 
  Box, 
  Typography, 
  Container, 
  Paper
} from '@mui/material';
import PasswordTestClient from '@/components/auth/PasswordTestClient';

export default function PasswordTestPage() {
  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Password Strength Tester
        </Typography>
        
        <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
          <Typography variant="body1" paragraph>
            Enter a password to test its strength. Add personal information to see how it affects the strength calculation.
          </Typography>

          <PasswordTestClient />
        </Paper>
      </Box>
    </Container>
  );
}