import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import LoginPageClient from "@/components/auth/LoginPageClient";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma/prisma";

export default async function LoginPage() {
  // Check if user is already logged in and has pending links
  const session = await getSession();
  
  if (session?.user?.id) {
    // User is logged in, check for pending links
    const pendingLinks = await prisma.pendingAccountLink.findMany({
      where: {
        userId: session.user.id,
        expiresAt: {
          gt: new Date()
        }
      }
    });
    
    if (pendingLinks.length > 0) {
      // Redirect to link-account page
      redirect("/link-account");
    }
  }

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