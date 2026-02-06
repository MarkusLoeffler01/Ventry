'use client';

import * as React from 'react';
import { createTheme, ThemeProvider as MUIThemeProvider } from '@mui/material/styles';
import { green } from '@mui/material/colors';
import CssBaseline from '@mui/material/CssBaseline';
import useMediaQuery from '@mui/material/useMediaQuery';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: prefersDarkMode ? 'dark' : 'light',
          primary: {
            main: '#1976d2', // Default blue
          },
          success: {
            main: green[500], // Use Material UI green
          },
          background: {
            default: prefersDarkMode ? '#0a0a0a' : '#ffffff',
            paper: prefersDarkMode ? '#171717' : '#ffffff',
          }
        },
        components: {
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none', // Remove elevation gradient in dark mode for cleaner look
              },
            },
          },
        },
      }),
    [prefersDarkMode],
  );

  return (
    <MUIThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MUIThemeProvider>
  );
}