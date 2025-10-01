/**
 * Loading Spinner Component - VibeBox Frontend
 * Centered loading indicator
 */

import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * Props for the LoadingSpinner component
 */
interface LoadingSpinnerProps {
  /** Optional text to display below the spinner */
  message?: string;
  /** Diameter of the spinner in pixels (default: 40) */
  size?: number;
}

/**
 * Centered loading spinner with optional message
 *
 * Displays a Material-UI CircularProgress indicator centered on the screen
 * with an optional message below it. Used for loading states throughout the app.
 *
 * @param props - Component props
 * @param props.message - Optional text to display below the spinner
 * @param props.size - Diameter of the spinner in pixels (default: 40)
 * @returns A centered loading indicator with optional message text
 * @public
 *
 * @example
 * ```tsx
 * <LoadingSpinner message="Loading projects..." size={50} />
 * ```
 */
export function LoadingSpinner({ message, size = 40 }: LoadingSpinnerProps): JSX.Element {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        gap: 2,
      }}
    >
      <CircularProgress size={size} />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );
}
