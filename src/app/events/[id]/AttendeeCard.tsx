import { Avatar, Box, Card, CardContent, Stack, Typography } from "@mui/material";
import { getCountryFlag, getCountryByCode } from "@/lib/countries";

interface AttendeeCardProps {
  attendee: {
    id: string;
    name: string;
    country: string | null;
    imageUrl: string | null;
  };
}

/**
 * Attendee card for the event attendees list.
 */
export function AttendeeCard({ attendee }: AttendeeCardProps) {
  const initials = attendee.name
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const countryData = attendee.country ? getCountryByCode(attendee.country) : null;

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            src={attendee.imageUrl || undefined}
            alt={attendee.name}
            sx={{ width: 56, height: 56 }}
          >
            {attendee.imageUrl ? null : initials || "?"}
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              {attendee.name}
            </Typography>
            {countryData ? (
              <Typography variant="body2" color="text.secondary">
                {getCountryFlag(countryData.code)} {countryData.name}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Country not shared
              </Typography>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
