/**
 * Extension Search Bar Component - VibeBox Frontend
 * Search input for extensions
 */

import React from 'react';
import { TextField, InputAdornment } from '@mui/material';
import { Search } from '@mui/icons-material';

interface ExtensionSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Extension search bar component
 */
export function ExtensionSearchBar({ value, onChange }: ExtensionSearchBarProps): JSX.Element {
  return (
    <TextField
      fullWidth
      placeholder="Search extensions..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Search />
          </InputAdornment>
        ),
      }}
    />
  );
}
