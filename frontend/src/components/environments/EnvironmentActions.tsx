/**
 * Environment Actions Component - VibeBox Frontend
 * Action buttons for environment control (start/stop/restart)
 */

import React, { useState } from 'react';
import { Box, Button, CircularProgress } from '@mui/material';
import { PlayArrow, Stop, Refresh } from '@mui/icons-material';
import type { Environment } from '@/types';
import { environmentsApi } from '@/services/api';
import { useNotification } from '@/contexts/NotificationContext';

interface EnvironmentActionsProps {
  environment: Environment;
  onUpdate: () => void;
}

/**
 * Environment control actions component
 */
export function EnvironmentActions({
  environment,
  onUpdate,
}: EnvironmentActionsProps): JSX.Element {
  const notification = useNotification();
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      await environmentsApi.startEnvironment(environment.id);
      notification.success('Environment started');
      onUpdate();
    } catch (error) {
      notification.error('Failed to start environment');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      await environmentsApi.stopEnvironment(environment.id);
      notification.success('Environment stopped');
      onUpdate();
    } catch (error) {
      notification.error('Failed to stop environment');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async () => {
    setLoading(true);
    try {
      await environmentsApi.restartEnvironment(environment.id);
      notification.success('Environment restarted');
      onUpdate();
    } catch (error) {
      notification.error('Failed to restart environment');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const canStart = environment.status === 'STOPPED' || environment.status === 'ERROR';
  const canStop = environment.status === 'RUNNING';
  const canRestart = environment.status === 'RUNNING';

  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      {loading ? (
        <CircularProgress size={24} />
      ) : (
        <>
          {canStart && (
            <Button
              variant="contained"
              startIcon={<PlayArrow />}
              onClick={handleStart}
              color="success"
            >
              Start
            </Button>
          )}
          {canStop && (
            <Button variant="outlined" startIcon={<Stop />} onClick={handleStop} color="error">
              Stop
            </Button>
          )}
          {canRestart && (
            <Button variant="outlined" startIcon={<Refresh />} onClick={handleRestart}>
              Restart
            </Button>
          )}
        </>
      )}
    </Box>
  );
}
