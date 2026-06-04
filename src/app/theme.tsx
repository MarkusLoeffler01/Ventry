'use client';

import type * as React from 'react';
import { createTheme, ThemeProvider as MUIThemeProvider } from '@mui/material/styles';
import { green } from '@mui/material/colors';
import CssBaseline from '@mui/material/CssBaseline';

// CSS variables mode: dark/light switching is handled entirely by CSS.
// No JS re-render is needed when the color scheme changes, so there is
// no server/client theme mismatch during hydration.
const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'class',
  },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#1976d2' },
        success: { main: green[500] },
        background: { default: '#ffffff', paper: '#ffffff' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#1976d2' },
        success: { main: green[500] },
        background: { default: '#0a0a0a', paper: '#171717' },
      },
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <MUIThemeProvider theme={theme} defaultMode="system">
      <CssBaseline />
      {children}
    </MUIThemeProvider>
  );
}
