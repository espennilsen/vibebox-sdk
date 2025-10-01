/**
 * Extension Card Component - VibeBox Frontend
 * Display extension information
 */

import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Avatar,
  Rating,
} from '@mui/material';
import { Download } from '@mui/icons-material';
import type { ExtensionSearchResult } from '@/types';

interface ExtensionCardProps {
  extension: ExtensionSearchResult;
  isInstalled?: boolean;
  onInstall?: (extension: ExtensionSearchResult) => void;
}

/**
 * Extension card component
 */
export function ExtensionCard({
  extension,
  isInstalled = false,
  onInstall,
}: ExtensionCardProps): JSX.Element {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          {extension.iconUrl ? (
            <Avatar src={extension.iconUrl} variant="rounded" />
          ) : (
            <Avatar variant="rounded">{extension.displayName[0]}</Avatar>
          )}
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" gutterBottom>
              {extension.displayName}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {extension.shortDescription}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {extension.publisher}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Rating value={extension.rating} readOnly size="small" precision={0.5} />
                <Typography variant="caption" color="text.secondary">
                  ({extension.rating.toFixed(1)})
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                <Download fontSize="inherit" /> {(extension.installs / 1000).toFixed(1)}K
              </Typography>
            </Box>
          </Box>
        </Box>
      </CardContent>
      {!isInstalled && onInstall && (
        <CardActions>
          <Button size="small" onClick={() => onInstall(extension)}>
            Install
          </Button>
        </CardActions>
      )}
      {isInstalled && (
        <CardActions>
          <Button size="small" disabled>
            Installed
          </Button>
        </CardActions>
      )}
    </Card>
  );
}
