/**
 * Environment Selector Dialog Component - VibeBox Frontend
 * Dialog for selecting an environment for extension installation
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import { projectsApi, environmentsApi } from '@/services/api';
import type { Project, Environment } from '@/types';
import { StatusBadge } from '@/components/common';

/**
 * Props for the EnvironmentSelectorDialog component
 */
interface EnvironmentSelectorDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Extension name being installed */
  extensionName: string;
  /** Callback when user selects an environment */
  onSelect: (environmentId: string) => void;
  /** Callback when user cancels */
  onCancel: () => void;
}

/**
 * Dialog for selecting an environment to install an extension
 *
 * Displays a list of user's environments grouped by project, allowing them
 * to select which environment to install the extension in. Shows environment
 * status and highlights running environments.
 *
 * @param props - Component props
 * @param props.open - Whether the dialog is open
 * @param props.extensionName - Extension name being installed
 * @param props.onSelect - Callback when user selects an environment
 * @param props.onCancel - Callback when user cancels
 * @returns Environment selector dialog
 * @public
 *
 * @example
 * ```tsx
 * <EnvironmentSelectorDialog
 *   open={selectorOpen}
 *   extensionName="Python"
 *   onSelect={handleEnvironmentSelect}
 *   onCancel={() => setSelectorOpen(false)}
 * />
 * ```
 */
export function EnvironmentSelectorDialog({
  open,
  extensionName,
  onSelect,
  onCancel,
}: EnvironmentSelectorDialogProps): JSX.Element {
  const [projects, setProjects] = useState<Project[]>([]);
  const [environments, setEnvironments] = useState<Record<string, Environment[]>>({});
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load all user's projects and their environments
   */
  const loadEnvironments = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const projectsData = await projectsApi.listProjects();

      if (projectsData.length === 0) {
        setError('No projects found. Please create a project and environment first.');
        setLoading(false);
        return;
      }

      setProjects(projectsData);

      // Load environments for each project
      const envPromises = projectsData.map((project) =>
        environmentsApi.listEnvironments(project.id)
      );
      const envResults = await Promise.all(envPromises);

      const envByProject: Record<string, Environment[]> = {};
      let hasEnvironments = false;
      projectsData.forEach((project, index) => {
        const envs = envResults[index] || [];
        envByProject[project.id] = envs;
        if (envs.length > 0) {
          hasEnvironments = true;
        }
      });

      if (!hasEnvironments) {
        setError('No environments found. Please create an environment first.');
      }

      setEnvironments(envByProject);
    } catch (err) {
      setError('Failed to load environments. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load projects and environments when dialog opens
  useEffect(() => {
    if (open) {
      loadEnvironments();
    } else {
      // Reset state when dialog closes
      setSelectedEnvId(null);
      setError(null);
    }
  }, [open, loadEnvironments]);

  /**
   * Handle environment selection
   */
  const handleSelect = (): void => {
    if (selectedEnvId) {
      onSelect(selectedEnvId);
    }
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Select Environment</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Choose an environment to install <strong>{extensionName}</strong>
        </Typography>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && (
          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {projects.map((project) => {
              const projectEnvs = environments[project.id] || [];
              if (projectEnvs.length === 0) return null;

              return (
                <Box key={project.id}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    sx={{ px: 2, py: 1, fontWeight: 600 }}
                  >
                    {project.name}
                  </Typography>
                  {projectEnvs.map((env) => (
                    <ListItem key={env.id} disablePadding>
                      <ListItemButton
                        selected={selectedEnvId === env.id}
                        onClick={() => setSelectedEnvId(env.id)}
                        disabled={env.status === 'ERROR' || env.status === 'DELETING'}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {env.name}
                              {selectedEnvId === env.id && (
                                <CheckCircle color="primary" fontSize="small" />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              <StatusBadge status={env.status} size="small" />
                              {env.status === 'RUNNING' && (
                                <Chip
                                  label="Running"
                                  size="small"
                                  color="success"
                                  variant="outlined"
                                  sx={{ height: 20 }}
                                />
                              )}
                            </Box>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                  <Divider />
                </Box>
              );
            })}
          </List>
        )}

        {!loading && !error && projects.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            No environments available. Create a project and environment first.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          onClick={handleSelect}
          variant="contained"
          disabled={!selectedEnvId || loading || !!error}
        >
          Install
        </Button>
      </DialogActions>
    </Dialog>
  );
}
