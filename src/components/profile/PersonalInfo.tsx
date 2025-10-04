"use client";

import { 
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip
} from "@mui/material";
import { 
  Cake, 
  Badge,
  VisibilityOff 
} from "@mui/icons-material";

interface PersonalInfoProps {
  dateOfBirth: Date | null;
  showAge: boolean;
  pronouns: string | null;
  age: number | null;
}

export default function PersonalInfo({ 
  dateOfBirth, 
  showAge, 
  pronouns, 
  age 
}: PersonalInfoProps) {
  // Don't render if no personal info
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
        {/* Age/Birthday */}
        {dateOfBirth && (
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
                    {showAge ? (
                      <>Age: {age} years old</>
                    ) : (
                      <>Birthday: {dateOfBirth.toLocaleDateString()}</>
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Born on {dateOfBirth.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                    {!showAge && (
                      <Chip 
                        icon={<VisibilityOff />}
                        label="Age Hidden" 
                        size="small" 
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Pronouns */}
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