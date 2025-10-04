import { notFound } from "next/navigation";
import { 
  Container, 
  Paper,
  CardContent,
  Stack
} from "@mui/material";
import prisma from "@/lib/prisma";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileBio from "@/components/profile/ProfileBio";
import PersonalInfo from "@/components/profile/PersonalInfo";
import PhotoGallery from "@/components/profile/PhotoGallery";
import EmptyState from "@/components/profile/EmptyState";
import { getSignedUrl } from "@/lib/supabase";

interface ProfilePicture {
  id: string;
  signedUrl: string | null;
  storagePath: string;
  isPrimary: boolean;
  createdAt: Date;
  cachedUntil: Date | null;
  order: number;
}

async function validateAndRefreshSignedUrls(profilePictures: ProfilePicture[]) {
  const now = new Date();
  
  const validatedPictures = await Promise.all(
    profilePictures.map(async (picture) => {
      // Only refresh if URL is missing or expired
      if (!picture.signedUrl || !picture.cachedUntil || new Date(picture.cachedUntil) <= now) {
        try {
          const { signedUrl, expiresIn } = await getSignedUrl(picture.storagePath, 24 * 60 * 60);
          
          await prisma.profilePicture.update({
            where: { id: picture.id },
            data: {
              signedUrl,
              cachedUntil: new Date(Date.now() + expiresIn * 1000)
            }
          });
          
          return {
            ...picture,
            signedUrl,
            cachedUntil: new Date(Date.now() + expiresIn * 1000)
          };
        } catch (error) {
          console.error(`Failed to refresh signed URL for picture ${picture.id}:`, error);
          return picture;
        }
      }
      
      return picture;
    })
  );
  
  return validatedPictures;
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

export default async function ProfileViewPage({ params }: { params: { id: string }}) {
    const { id } = await params;
    
    const user = await prisma.user.findUnique({
        where: { id: id },
        select: {
            name: true,
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
            pronouns: true
        }
    });

    if (!user) {
        notFound();
    }

    // Validate and refresh signed URLs if needed
    const validatedPictures = await validateAndRefreshSignedUrls(user.profilePictures as ProfilePicture[]);

    const age = user.dateOfBirth ? calculateAge(user.dateOfBirth) : null;

    // Check if user has any meaningful content
    const hasContent = user.bio || user.dateOfBirth || user.pronouns || validatedPictures.length > 1;

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Main Profile Card */}
            <Paper elevation={3} sx={{ overflow: 'hidden', mb: 3 }}>
                {/* Header Section */}
                <ProfileHeader 
                    name={user.name}
                    pronouns={user.pronouns}
                    profilePictures={validatedPictures}
                    age={age}
                    showAge={user.showAge}
                />

                {/* Content Section */}
                <CardContent sx={{ p: 4 }}>
                    <Stack spacing={4}>
                        {user.bio && <ProfileBio bio={user.bio} />}
                        
                        <PersonalInfo 
                            dateOfBirth={user.dateOfBirth}
                            showAge={user.showAge}
                            pronouns={user.pronouns}
                            age={age}
                        />

                        <PhotoGallery 
                            profilePictures={validatedPictures}
                            userName={user.name}
                        />
                    </Stack>
                </CardContent>
            </Paper>

            {/* Empty State for No Information */}
            {!hasContent && (
                <EmptyState userName={user.name} />
            )}
        </Container>
    );
}