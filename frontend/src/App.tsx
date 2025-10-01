/**
 * App Component - VibeBox Frontend
 * Main application with routing
 */

import React, { useState, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { createAppTheme } from '@/theme';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

// Pages
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { Dashboard } from '@/pages/Dashboard';
import { Projects } from '@/pages/Projects';
import { ProjectDetail } from '@/pages/ProjectDetail';
import { EnvironmentDetail } from '@/pages/EnvironmentDetail';
import { Extensions } from '@/pages/Extensions';
import { Teams } from '@/pages/Teams';
import { Settings } from '@/pages/Settings';

/**
 * Main application component with routing and providers
 */
export function App(): JSX.Element {
  const [darkMode, setDarkMode] = useState(true);

  const theme = useMemo(() => createAppTheme(darkMode ? 'dark' : 'light'), [darkMode]);

  const toggleTheme = () => {
    setDarkMode((prev) => !prev);
  };

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <NotificationProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected routes with AppShell */}
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <AppShell darkMode={darkMode} onThemeToggle={toggleTheme}>
                        <Routes>
                          <Route path="/" element={<Dashboard />} />
                          <Route path="/projects" element={<Projects />} />
                          <Route path="/projects/:id" element={<ProjectDetail />} />
                          <Route path="/environments/:id" element={<EnvironmentDetail />} />
                          <Route path="/extensions" element={<Extensions />} />
                          <Route path="/teams" element={<Teams />} />
                          <Route path="/settings" element={<Settings />} />
                          <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                      </AppShell>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
