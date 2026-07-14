"use client";

import {
  Box,
  Typography,
  Avatar,
  Chip,
  Stack
} from "@mui/material";
import { Badge, Telegram, Twitter, PhotoCamera } from "@mui/icons-material";
import Image from "next/image";
import { getCountryFlag, getCountryByCode } from "@/lib/countries";

interface ProfilePicture {
  id: string;
  signedUrl?: string | null;
  isPrimary: boolean;
  createdAt: Date | string;
}

interface SocialLinks {
  telegram?: string;
  twitter?: string;
  instagram?: string;
}

interface ProfileHeaderProps {
  name: string | null;
  username?: string | null;
  pronouns: string | null;
  profilePictures: ProfilePicture[];
  age: number | null;
  showAge: boolean;
  country?: string | null;
  socialLinks?: SocialLinks | null;
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

const chipSx = {
  bgcolor: 'rgba(255,255,255,0.2)',
  color: 'white',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255,255,255,0.3)',
  cursor: 'pointer',
  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
};

export default function ProfileHeader({
  name,
  username,
  pronouns,
  profilePictures,
  age,
  showAge,
  country,
  socialLinks
}: ProfileHeaderProps) {
  const primaryPicture = profilePictures.find(pic => pic.isPrimary) || profilePictures[0];
  const countryData = country ? getCountryByCode(country) : null;
  const hasSocials = socialLinks && (socialLinks.telegram || socialLinks.twitter || socialLinks.instagram);

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
        <Box sx={{ flexShrink: 0 }}>
          <Avatar
            sx={{
              width: { xs: 150, sm: 180, md: 200 },
              height: { xs: 150, sm: 180, md: 200 },
              border: '6px solid white',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              transition: 'transform 0.2s ease-in-out',
              '&:hover': { transform: 'scale(1.02)' }
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
              mb: 1,
              fontWeight: 'bold',
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}
          >
            {name || 'Anonymous User'}
          </Typography>

          {username && (
            <Typography
              variant="body1"
              sx={{ mb: 2, opacity: 0.85, fontWeight: 500 }}
            >
              @{username}
            </Typography>
          )}

          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
            {pronouns && (
              <Chip
                icon={<Badge />}
                label={pronouns}
                sx={{
                  ...chipSx,
                  cursor: 'default',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                  fontSize: '0.9rem',
                  py: 1,
                  px: 2,
                }}
              />
            )}
            {countryData && (
              <Chip
                label={`${getCountryFlag(countryData.code)} ${countryData.name}`}
                sx={{
                  ...chipSx,
                  cursor: 'default',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                  fontSize: '0.9rem',
                }}
              />
            )}
          </Stack>

          {hasSocials && (
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
              {socialLinks.telegram && (
                <Chip
                  icon={<Telegram />}
                  label={`@${socialLinks.telegram}`}
                  component="a"
                  href={`https://t.me/${socialLinks.telegram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={chipSx}
                  clickable
                />
              )}
              {socialLinks.twitter && (
                <Chip
                  icon={<Twitter />}
                  label={`@${socialLinks.twitter}`}
                  component="a"
                  href={`https://x.com/${socialLinks.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={chipSx}
                  clickable
                />
              )}
              {socialLinks.instagram && (
                <Chip
                  icon={<PhotoCamera />}
                  label={`@${socialLinks.instagram}`}
                  component="a"
                  href={`https://instagram.com/${socialLinks.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={chipSx}
                  clickable
                />
              )}
            </Stack>
          )}

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
