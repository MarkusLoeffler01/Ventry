import { 
  Box, 
  Typography, 
  Paper, 
  Stack, 
  Chip, 
  Grid
} from "@mui/material";
import { AccessTime, LocationOn } from "@mui/icons-material";

interface ScheduleItem {
  id?: string;
  title: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  description?: string;
  location?: string;
}

interface EventScheduleProps {
  schedule: ScheduleItem[] | unknown;
}

export default function EventSchedule({ schedule }: EventScheduleProps) {
  if (!Array.isArray(schedule) || schedule.length === 0) {
    return null;
  }

  // Cast and validate items vaguely
  const items = (schedule as ScheduleItem[])
    .filter(item => item.title && item.startTime && item.endTime)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  if (items.length === 0) return null;

  // Group by day
  const groupedItems = items.reduce((acc, item) => {
    const date = new Date(item.startTime);
    const dateKey = date.toLocaleDateString(undefined, { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(item);
    return acc;
  }, {} as Record<string, ScheduleItem[]>);

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">Event Schedule</Typography>
      
      <Stack spacing={4}>
        {Object.entries(groupedItems).map(([dateKey, dayItems]) => (
          <Box key={dateKey}>
            <Box 
              sx={{ 
                position: 'sticky', 
                top: 80, 
                zIndex: 1, 
                bgcolor: 'background.paper', 
                py: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                mb: 2
              }}
            >
              <Typography variant="h6" color="primary.main" fontWeight="bold">
                {dateKey}
              </Typography>
            </Box>

            <Stack spacing={2}>
              {dayItems.map((item) => (
                <Paper
                  key={item.id ?? `${item.title}-${item.startTime}-${item.endTime}`}
                  variant="outlined"
                  sx={{
                    p: 2,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateX(4px)',
                      boxShadow: 2,
                      borderColor: 'primary.light'
                    }
                  }}
                >
                  <Grid container spacing={2} alignItems="flex-start">
                    {/* Time Column */}
                    <Grid size={{ xs: 12, sm: 3, md: 2 }}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                        <AccessTime fontSize="small" />
                        <Typography variant="body2" fontWeight="medium">
                          {formatTime(item.startTime)}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 3.5, display: 'block' }}>
                        to {formatTime(item.endTime)}
                      </Typography>
                    </Grid>

                    {/* Content Column */}
                    <Grid size={{ xs: 12, sm: 9, md: 10 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
                        <Typography variant="h6" component="h3" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                          {item.title}
                        </Typography>
                        {item.location && (
                          <Chip 
                            icon={<LocationOn fontSize="small" />} 
                            label={item.location} 
                            size="small" 
                            variant="outlined" 
                            color="default"
                          />
                        )}
                      </Box>
                      
                      {item.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                          {item.description}
                        </Typography>
                      )}
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
