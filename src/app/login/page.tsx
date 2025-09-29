import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import LoginPageClient from "@/components/auth/LoginPageClient";

export default function LoginPage() {
  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          minHeight: "100vh",
          py: 4,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            maxWidth: 600,
            display: "flex",
            flexDirection: "column",
            p: { xs: 2, md: 4 },
          }}
        >
          <Typography component="h1" variant="h4" align="center" sx={{ mt: 2, mb: 3 }}>
            Login
          </Typography>
          
          <LoginPageClient />
        </Paper>
      </Box>
    </Container>
  );
}