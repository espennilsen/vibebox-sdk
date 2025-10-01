/**
 * Protected Route Component - VibeBox Frontend
 * Route wrapper that requires authentication
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';

/**
 * Props for the ProtectedRoute component
 */
interface ProtectedRouteProps {
  /** React children to render when authenticated */
  children: React.ReactNode;
}

/**
 * Protected route wrapper that requires authentication
 *
 * Displays a loading spinner while checking authentication status.
 * Redirects to /login if not authenticated, preserving the intended destination.
 * Renders children if authenticated.
 *
 * @param props - Component props
 * @param props.children - React children to render when authenticated
 * @returns Protected route content or redirect
 * @public
 *
 * @example
 * ```tsx
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({ children }: ProtectedRouteProps): JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
