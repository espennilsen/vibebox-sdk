/**
 * Status Badge Component - VibeBox Frontend
 * Display status with color-coded badge
 */

import React from 'react';
import { Chip } from '@mui/material';
import type { EnvironmentStatus } from '@/types';

interface StatusBadgeProps {
  status: EnvironmentStatus;
  size?: 'small' | 'medium';
}

const statusConfig: Record<
  EnvironmentStatus,
  { label: string; color: 'success' | 'error' | 'warning' | 'default' | 'info' }
> = {
  CREATING: { label: 'Creating', color: 'info' },
  RUNNING: { label: 'Running', color: 'success' },
  STOPPED: { label: 'Stopped', color: 'default' },
  ERROR: { label: 'Error', color: 'error' },
  DELETING: { label: 'Deleting', color: 'warning' },
};

/**
 * Status badge with appropriate color
 */
export function StatusBadge({ status, size = 'small' }: StatusBadgeProps): JSX.Element {
  const config = statusConfig[status];

  return <Chip label={config.label} color={config.color} size={size} />;
}
