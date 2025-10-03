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
    const user = await prisma.user.findUnique({
        where: { id: params.id },
        select: {
            name: true,
            profilePictures: true,
            bio: true,
            dateOfBirth: true,
            showAge: true,
            pronouns: true
        }
    });

    if (!user) {
        notFound();
    }

    const age = user.dateOfBirth ? calculateAge(user.dateOfBirth) : null;

    // Check if user has any meaningful content
    const hasContent = user.bio || user.dateOfBirth || user.pronouns || user.profilePictures.length > 1;

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Main Profile Card */}
            <Paper elevation={3} sx={{ overflow: 'hidden', mb: 3 }}>
                {/* Header Section */}
                <ProfileHeader 
                    name={user.name}
                    pronouns={user.pronouns}
                    profilePictures={user.profilePictures}
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
                            profilePictures={user.profilePictures}
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