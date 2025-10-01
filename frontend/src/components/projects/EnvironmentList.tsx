/**
 * Environment List Component - VibeBox Frontend
 * List of environments within a project
 */

import React from 'react';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  Box,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { Environment } from '@/types';
import { StatusBadge } from '@/components/common';

interface EnvironmentListProps {
  environments: Environment[];
}

/**
 * List of environments with navigation
 */
export function EnvironmentList({ environments }: EnvironmentListProps): JSX.Element {
  const navigate = useNavigate();

  if (environments.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No environments yet. Create one to get started.
        </Typography>
      </Box>
    );
  }

  return (
    <List>
      {environments.map((env) => (
        <ListItem key={env.id} disablePadding>
          <ListItemButton onClick={() => navigate(`/environments/${env.id}`)}>
            <ListItemText
              primary={env.name}
              secondary={
                <>
                  {env.description || env.baseImage}
                  <br />
                  CPU: {env.cpuLimit} cores • Memory: {env.memoryLimit} MB
                </>
              }
            />
            <ListItemSecondaryAction>
              <StatusBadge status={env.status} />
            </ListItemSecondaryAction>
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
}
