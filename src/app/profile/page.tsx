import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/prisma";
import ProfilePageClient from "@/components/profile/ProfilePageClient";
import { Container, Box, Typography, Paper } from "@mui/material";

export default async function ProfilePage() {
  const session = await getSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch user data from database
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      profilePictures: {
        orderBy: [
          { order: 'asc' },
          { isPrimary: 'desc' },
          { createdAt: 'desc' }
        ]
      },
      accounts: {
        select: {
          providerId: true,
          password: true // Check if password is set (in credential account)
        }
      },
      bio: true,
      dateOfBirth: true,
      pronouns: true,
      showAge: true,
      createdAt: true,
      updatedAt: true,
    }
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Profile Settings
        </Typography>
        
        <Paper elevation={2} sx={{ p: 4, mt: 3 }}>
          <ProfilePageClient user={user} />
        </Paper>
      </Box>
    </Container>
  );
}