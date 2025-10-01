/**
 * Environment Card Component - VibeBox Frontend
 * Display environment information in a card
 */

import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import type { Environment } from '@/types';
import { StatusBadge } from '@/components/common';

interface EnvironmentCardProps {
  environment: Environment;
  onClick?: () => void;
}

/**
 * Environment card component
 */
export function EnvironmentCard({ environment, onClick }: EnvironmentCardProps): JSX.Element {
  return (
    <Card sx={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <CardContent>
        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}
        >
          <Typography variant="h6">{environment.name}</Typography>
          <StatusBadge status={environment.status} />
        </Box>
        {environment.description && (
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {environment.description}
          </Typography>
        )}
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {environment.baseImage}
          </Typography>
          <br />
          <Typography variant="caption" color="text.secondary">
            CPU: {environment.cpuLimit} cores • Memory: {environment.memoryLimit} MB
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
