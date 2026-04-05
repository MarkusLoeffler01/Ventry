import { 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Box, 
  Stack 
} from '@mui/material';
import { CalendarMonth, LocationOn } from '@mui/icons-material';
import Image from 'next/image';

interface EventCardProps {
  event: {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    imageUrl: string | null;
    location: {
      city: string;
      country: string;
    } | null;
  };
  priority?: boolean;
}

export default function EventCard({ event, priority = false }: EventCardProps) {
  const startDate = new Date(event.startDate);
  const dateString = startDate.toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
      <Box sx={{ position: 'relative', pt: '56.25%' }}>
        {event.imageUrl ? (
          <Image
            src={event.imageUrl}
            alt={event.name}
            fill
            sizes="(min-width: 1200px) 33vw, (min-width: 600px) 50vw, 100vw"
            preload={priority}
            loading={priority ? "eager" : "lazy"}
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', bgcolor: 'grey.300', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="h6" color="text.secondary">No Image</Typography>
          </Box>
        )}
      </Box>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography gutterBottom variant="h5" component="div" noWrap>
          {event.name}
        </Typography>
        
        <Stack spacing={1} mb={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarMonth fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {dateString}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationOn fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {event.location ? `${event.location.city}, ${event.location.country}` : 'Virtual / TBD'}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
      <Box sx={{ p: 2, pt: 0 }}>
        <Button 
          fullWidth 
          variant="contained" 
          href={`/events/${event.id}`}
        >
          View Details
        </Button>
      </Box>
    </Card>
  );
}
