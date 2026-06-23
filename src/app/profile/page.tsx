import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/prisma";
import { refreshSignedUrls } from "@/lib/user/profilePicture";
import ProfilePageClient from "@/components/profile/ProfilePageClient";
import { Container, Box, Typography } from "@mui/material";
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
      legalName: true,
      addressLine1: true,
      addressLine2: true,
      addressCity: true,
      addressState: true,
      addressPostalCode: true,
      addressCountry: true,
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
      showExactBirthdate: true,
      socialLinks: true,
      createdAt: true,
      updatedAt: true,
    }
  });

  if (!user) {
    redirect("/login");
  }

  const profilePictures = await refreshSignedUrls(user.profilePictures);

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 3 }}>
        <Typography variant="h5" component="h1" fontWeight={700} sx={{ mb: 2 }}>
          Profile Settings
        </Typography>
        <ProfilePageClient user={{ ...user, profilePictures, socialLinks: user.socialLinks as { telegram?: string; twitter?: string; instagram?: string } | null }} />
      </Box>
    </Container>
  );
}
