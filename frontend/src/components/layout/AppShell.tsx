/**
 * App Shell Component - VibeBox Frontend
 * Main application layout with navbar and sidebar
 */

import React, { useState } from 'react';
import { Box, Toolbar } from '@mui/material';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

/**
 * Props for the AppShell component
 */
interface AppShellProps {
  /** Page content to render in the main area */
  children: React.ReactNode;
  /** Current theme mode (true = dark, false = light) */
  darkMode: boolean;
  /** Callback to toggle theme mode */
  onThemeToggle: () => void;
}

/**
 * Main application shell layout with navbar and sidebar
 *
 * Provides the core application layout structure with:
 * - Top navbar with menu toggle and theme switcher
 * - Collapsible sidebar navigation
 * - Main content area with responsive padding
 * - Mobile-responsive drawer behavior
 *
 * @param props - Component props
 * @param props.children - Page content to render in the main area
 * @param props.darkMode - Current theme mode (true = dark, false = light)
 * @param props.onThemeToggle - Callback to toggle theme mode
 * @returns Application shell layout
 * @public
 *
 * @example
 * ```tsx
 * <AppShell darkMode={darkMode} onThemeToggle={toggleTheme}>
 *   <Dashboard />
 * </AppShell>
 * ```
 */
export function AppShell({ children, darkMode, onThemeToggle }: AppShellProps): JSX.Element {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Navbar onMenuClick={handleDrawerToggle} darkMode={darkMode} onThemeToggle={onThemeToggle} />
      <Sidebar open={mobileOpen} onClose={handleDrawerToggle} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - 240px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
