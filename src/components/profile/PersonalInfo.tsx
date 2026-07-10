"use client";

import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack
} from "@mui/material";
import {
  Cake,
  Badge,
} from "@mui/icons-material";

interface PersonalInfoProps {
  dateOfBirth: Date | null;
  showAge: boolean;
  showExactBirthdate: boolean;
  pronouns: string | null;
  age: number | null;
}

export default function PersonalInfo({
  dateOfBirth,
  showAge,
  showExactBirthdate,
  pronouns,
  age
}: PersonalInfoProps) {
  if (!dateOfBirth && !pronouns) {
    return null;
  }

  return (
    <Box>
      <Typography
        variant="h6"
        gutterBottom
        sx={{
          color: 'primary.main',
          fontWeight: 'bold',
          mb: 2
        }}
      >
        Personal Information
      </Typography>

      <Stack spacing={2}>
        {dateOfBirth && showAge && age !== null && (
          <Card variant="outlined">
            <CardContent sx={{ py: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{
                  p: 1,
                  borderRadius: '50%',
                  bgcolor: 'primary.light',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Cake sx={{ color: 'primary.main' }} />
                </Box>
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Age: {age} years old
                  </Typography>
                  {showExactBirthdate && (
                    <Typography variant="body2" color="text.secondary">
                      Born on {dateOfBirth.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </Typography>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )}

        {pronouns && (
          <Card variant="outlined">
            <CardContent sx={{ py: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{
                  p: 1,
                  borderRadius: '50%',
                  bgcolor: 'secondary.light',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Badge sx={{ color: 'secondary.main' }} />
                </Box>
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Pronouns
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {pronouns}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Box>
  );
}
