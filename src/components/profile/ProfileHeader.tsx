"use client";

import { 
  Box, 
  Typography, 
  Avatar, 
  Chip, 
  Stack
} from "@mui/material";
import { Badge } from "@mui/icons-material";
import Image from "next/image";

interface ProfilePicture {
  id: string;
  signedUrl?: string | null;
  isPrimary: boolean;
  createdAt: Date | string;
}

interface ProfileHeaderProps {
  name: string | null;
  pronouns: string | null;
  profilePictures: ProfilePicture[];
  age: number | null;
  showAge: boolean;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map(word => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ProfileHeader({ 
  name, 
  pronouns, 
  profilePictures, 
  age,
  showAge 
}: ProfileHeaderProps) {
  const primaryPicture = profilePictures.find(pic => pic.isPrimary) || profilePictures[0];

  return (
    <Box
      sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        p: 4,
        position: 'relative'
      }}
    >
      <Stack 
        direction={{ xs: 'column', sm: 'row' }} 
        spacing={4} 
        alignItems={{ xs: 'center', sm: 'flex-start' }}
      >
        {/* Large Profile Picture on Left */}
        <Box sx={{ flexShrink: 0 }}>
          <Avatar
            sx={{ 
              width: { xs: 150, sm: 180, md: 200 }, 
              height: { xs: 150, sm: 180, md: 200 },
              border: '6px solid white',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              transition: 'transform 0.2s ease-in-out',
              '&:hover': {
                transform: 'scale(1.02)'
              }
            }}
          >
            {primaryPicture?.signedUrl ? (
              <Image
                src={primaryPicture.signedUrl}
                alt={`${name || 'User'}'s profile`}
                width={200}
                height={200}
                style={{ objectFit: 'cover' }}
                unoptimized={true}
                priority
              />
            ) : (
              <Typography variant="h1" sx={{ fontSize: '4rem', fontWeight: 'bold' }}>
                {getInitials(name)}
              </Typography>
            )}
          </Avatar>
        </Box>

        {/* User Info on Right */}
        <Box sx={{ 
          flex: 1, 
          textAlign: { xs: 'center', sm: 'left' },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minHeight: { sm: 180, md: 200 }
        }}>
          <Typography 
            variant="h3" 
            sx={{ 
              mb: 2, 
              fontWeight: 'bold',
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}
          >
            {name || 'Anonymous User'}
          </Typography>
          
          {pronouns && (
            <Box sx={{ mb: 2 }}>
              <Chip 
                icon={<Badge />}
                label={pronouns}
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.2)', 
                  color: 'white',
                  backdropFilter: 'blur(10px)',
                  fontSize: '0.9rem',
                  py: 1,
                  px: 2,
                  border: '1px solid rgba(255,255,255,0.3)'
                }}
              />
            </Box>
          )}

          {/* Quick Stats */}
          <Stack direction="row" spacing={3} sx={{ mt: 1 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                {profilePictures.length}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {profilePictures.length === 1 ? 'Photo' : 'Photos'}
              </Typography>
            </Box>
            {age && showAge && (
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  {age}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Years Old
                </Typography>
              </Box>
            )}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}