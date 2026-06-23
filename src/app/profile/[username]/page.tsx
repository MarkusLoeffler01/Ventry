import { notFound } from "next/navigation";
import {
  Container,
  Paper,
  CardContent,
  Stack
} from "@mui/material";
import prisma from "@/lib/prisma/prisma";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileBio from "@/components/profile/ProfileBio";
import PersonalInfo from "@/components/profile/PersonalInfo";
import PhotoGallery from "@/components/profile/PhotoGallery";
import EmptyState from "@/components/profile/EmptyState";
import { refreshSignedUrls } from "@/lib/user/profilePicture";
import { Suspense } from "react";
import PageLoadingState from "@/components/common/PageLoadingState";

interface ProfilePicture {
  id: string;
  signedUrl: string | null;
  storagePath: string;
  isPrimary: boolean;
  createdAt: Date;
  cachedUntil: Date | null;
  order: number;
}

interface SocialLinks {
  telegram?: string;
  twitter?: string;
  instagram?: string;
}

function calculateAge(birthDate: Date): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

export default function ProfileViewPage({ params }: { params: Promise<{ username: string }> }) {
  return (
    <Suspense fallback={<PageLoadingState />}>
      <ProfileViewPageContent params={params} />
    </Suspense>
  );
}

async function ProfileViewPageContent({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  // Support both username (name) and legacy ID-based URLs
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { name: username },
        { id: username },
      ]
    },
    select: {
      name: true,
      country: true,
      profilePictures: {
        orderBy: [
          { order: 'asc' },
          { isPrimary: 'desc' },
          { createdAt: 'desc' }
        ]
      },
      bio: true,
      dateOfBirth: true,
      showAge: true,
      showExactBirthdate: true,
      socialLinks: true,
      pronouns: true
    }
  });

  if (!user) {
    notFound();
  }

  const validatedPictures = await refreshSignedUrls(user.profilePictures as ProfilePicture[]);
  const age = user.dateOfBirth ? calculateAge(user.dateOfBirth) : null;
  const socialLinks = user.socialLinks as SocialLinks | null;

  const hasContent = user.bio || user.dateOfBirth || user.pronouns || validatedPictures.length > 1;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ overflow: 'hidden', mb: 3 }}>
        <ProfileHeader
          name={user.name}
          pronouns={user.pronouns}
          profilePictures={validatedPictures}
          age={age}
          showAge={user.showAge}
          country={user.country}
          socialLinks={socialLinks}
        />

        <CardContent sx={{ p: 4 }}>
          <Stack spacing={4}>
            <PhotoGallery
              profilePictures={validatedPictures}
              userName={user.name}
            />

            {user.bio && <ProfileBio bio={user.bio} />}

            <PersonalInfo
              dateOfBirth={user.dateOfBirth}
              showAge={user.showAge}
              showExactBirthdate={user.showExactBirthdate}
              pronouns={user.pronouns}
              age={age}
            />
          </Stack>
        </CardContent>
      </Paper>

      {!hasContent && (
        <EmptyState userName={user.name} />
      )}
    </Container>
  );
}
