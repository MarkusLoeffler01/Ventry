"use client";

import { useState, useEffect } from 'react';
import { Typography, Box } from '@mui/material';

interface RegistrationCountdownProps {
  opensAt: string;
}

export default function RegistrationCountdown({ opensAt }: RegistrationCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const targetDate = new Date(opensAt);

    const updateTimer = () => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

      if (difference <= 0) {
        setTimeLeft('Registration Open!');
        window.location.reload(); // Refresh to show register button
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [opensAt]);

  return (
    <Box sx={{ textAlign: 'center', py: 2, bgcolor: 'primary.50', borderRadius: 2 }}>
      <Typography variant="subtitle2" color="primary.main" fontWeight="bold">
        Registration opens in:
      </Typography>
      <Typography variant="h4" color="primary.main" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
        {timeLeft}
      </Typography>
    </Box>
  );
}
