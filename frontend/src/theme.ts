/**
 * Material-UI Theme Configuration - VibeBox Frontend
 * Custom theme with dark/light mode support
 */

import { createTheme, ThemeOptions, Theme } from '@mui/material/styles';

/**
 * Create Material-UI theme with specified mode
 *
 * Generates a customized theme with VibeBox branding colors, typography,
 * and component overrides for both light and dark modes.
 *
 * @param mode - Theme mode ('light' or 'dark')
 * @returns Configured Material-UI theme
 * @public
 *
 * @example
 * ```tsx
 * const theme = createAppTheme('dark');
 * ```
 */
export function createAppTheme(mode: 'light' | 'dark'): Theme {
  const themeOptions: ThemeOptions = {
    palette: {
      mode,
      primary: {
        main: '#6366f1', // Indigo
        light: '#818cf8',
        dark: '#4f46e5',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#8b5cf6', // Purple
        light: '#a78bfa',
        dark: '#7c3aed',
        contrastText: '#ffffff',
      },
      success: {
        main: '#10b981', // Green
        light: '#34d399',
        dark: '#059669',
      },
      error: {
        main: '#ef4444', // Red
        light: '#f87171',
        dark: '#dc2626',
      },
      warning: {
        main: '#f59e0b', // Amber
        light: '#fbbf24',
        dark: '#d97706',
      },
      info: {
        main: '#3b82f6', // Blue
        light: '#60a5fa',
        dark: '#2563eb',
      },
      background: {
        default: mode === 'dark' ? '#0f172a' : '#f8fafc',
        paper: mode === 'dark' ? '#1e293b' : '#ffffff',
      },
      text: {
        primary: mode === 'dark' ? '#f1f5f9' : '#1e293b',
        secondary: mode === 'dark' ? '#94a3b8' : '#64748b',
      },
    },
    typography: {
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(','),
      h1: {
        fontSize: '2.5rem',
        fontWeight: 700,
        lineHeight: 1.2,
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 600,
        lineHeight: 1.3,
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: 600,
        lineHeight: 1.5,
      },
      h6: {
        fontSize: '1rem',
        fontWeight: 600,
        lineHeight: 1.5,
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.5,
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.5,
      },
      button: {
        textTransform: 'none',
        fontWeight: 500,
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '8px 16px',
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow:
              mode === 'dark' ? '0 1px 3px 0 rgba(0, 0, 0, 0.3)' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
    },
  };

  return createTheme(themeOptions);
}

// Export default light theme
export const lightTheme = createAppTheme('light');
export const darkTheme = createAppTheme('dark');
