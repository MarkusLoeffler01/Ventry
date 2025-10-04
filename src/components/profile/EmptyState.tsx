"use client";

import { 
  Paper,
  Typography
} from "@mui/material";

interface EmptyStateProps {
  userName: string | null;
}

export default function EmptyState({ userName }: EmptyStateProps) {
  return (
    <Paper elevation={1} sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
      <Typography variant="h6" color="text.secondary" gutterBottom>
        Profile Information Coming Soon
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {userName || 'This user'} hasn&apos;t added additional profile information yet.
      </Typography>
    </Paper>
  );
}