

import { redirect } from "next/navigation";
import { auth } from "@/app/api/auth/auth";
import { prisma } from "@/lib/prisma";
import ProfilePageClient from "@/components/profile/ProfilePageClient";
import { Container, Box, Typography, Paper } from "@mui/material";

export default async function ProfilePage() {
  const session = await auth();

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
      password: true, // Check if password is set
      profilePictures: {
        orderBy: [
          { order: 'asc' },
          { isPrimary: 'desc' },
          { createdAt: 'desc' }
        ]
      },
      accounts: {
        select: {
          provider: true,
          providerAccountId: true
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