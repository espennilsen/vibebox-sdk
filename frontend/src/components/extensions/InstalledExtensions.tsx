/**
 * Installed Extensions Component - VibeBox Frontend
 * List of installed extensions
 */

import React from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Box,
  Typography,
} from '@mui/material';
import { Delete } from '@mui/icons-material';
import type { Extension } from '@/types';

interface InstalledExtensionsProps {
  extensions: Extension[];
  onUninstall: (extension: Extension) => void;
}

/**
 * Installed extensions list component
 */
export function InstalledExtensions({
  extensions,
  onUninstall,
}: InstalledExtensionsProps): JSX.Element {
  if (extensions.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No extensions installed
        </Typography>
      </Box>
    );
  }

  return (
    <List>
      {extensions.map((extension) => (
        <ListItem key={extension.id}>
          <ListItemText
            primary={extension.extensionId}
            secondary={`Version ${extension.version}`}
          />
          <ListItemSecondaryAction>
            <IconButton edge="end" onClick={() => onUninstall(extension)}>
              <Delete />
            </IconButton>
          </ListItemSecondaryAction>
        </ListItem>
      ))}
    </List>
  );
}
