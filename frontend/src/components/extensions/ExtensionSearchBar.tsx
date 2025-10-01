/**
 * Extension Search Bar Component - VibeBox Frontend
 * Search input for extensions
 */

import React from 'react';
import { TextField, InputAdornment } from '@mui/material';
import { Search } from '@mui/icons-material';

/**
 * Props for the ExtensionSearchBar component
 */
interface ExtensionSearchBarProps {
  /** Current search query string */
  value: string;
  /** Callback invoked when the search input changes, receives the new value */
  onChange: (value: string) => void;
}

/**
 * Extension search bar component
 *
 * Provides a full-width search TextField with a search icon adornment for filtering extensions.
 *
 * @param props - Component props
 * @param props.value - Current search query string
 * @param props.onChange - Callback invoked when the search input changes
 * @returns A full-width search TextField with search icon adornment
 * @public
 *
 * @example
 * ```tsx
 * const [searchQuery, setSearchQuery] = useState('');
 * <ExtensionSearchBar value={searchQuery} onChange={setSearchQuery} />
 * ```
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
