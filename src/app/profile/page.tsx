import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/prisma";
import ProfilePageClient from "@/components/profile/ProfilePageClient";
import { Container, Box, Typography, Paper } from "@mui/material";
import { Suspense } from "react";
import PageLoadingState from "@/components/common/PageLoadingState";

export default function ProfilePage() {
  return (
    <Suspense fallback={<PageLoadingState />}>
      <ProfilePageContent />
    </Suspense>
  );
}

async function ProfilePageContent() {
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
      country: true,
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
