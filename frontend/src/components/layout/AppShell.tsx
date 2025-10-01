/**
 * App Shell Component - VibeBox Frontend
 * Main application layout with navbar and sidebar
 */

import React, { useState } from 'react';
import { Box, Toolbar } from '@mui/material';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  children: React.ReactNode;
  darkMode: boolean;
  onThemeToggle: () => void;
}

/**
 * Main application shell layout
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
