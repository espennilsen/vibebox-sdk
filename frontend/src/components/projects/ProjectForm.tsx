/**
 * Project Form Component - VibeBox Frontend
 * Form for creating and editing projects
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert,
} from '@mui/material';
import type { Project, CreateProjectRequest, UpdateProjectRequest } from '@/types';
import { useNotification } from '@/contexts/NotificationContext';
import { ApiException } from '@/services/api';

/**
 * Props for the ProjectForm component
 */
interface ProjectFormProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Project to edit, or null/undefined for create mode */
  project?: Project | null;
  /** Callback when form is submitted with project data */
  onSubmit: (data: CreateProjectRequest | UpdateProjectRequest) => Promise<void>;
  /** Callback when form is cancelled */
  onCancel: () => void;
}

/**
 * Project form dialog for creating and editing projects
 *
 * Displays a modal form with name, description, and repository URL fields.
 * Validates repository URL format (http/https).
 * In edit mode, pre-fills with existing project data.
 *
 * @param props - Component props
 * @param props.open - Whether the dialog is open
 * @param props.project - Project to edit, or null/undefined for create mode
 * @param props.onSubmit - Callback when form is submitted with project data
 * @param props.onCancel - Callback when form is cancelled
 * @returns Project form dialog
 * @public
 *
 * @example
 * ```tsx
 * <ProjectForm
 *   open={formOpen}
 *   project={selectedProject}
 *   onSubmit={async (data) => {
 *     await projectsApi.createProject(data);
 *     setFormOpen(false);
 *   }}
 *   onCancel={() => setFormOpen(false)}
 * />
 * ```
 */
export function ProjectForm({ open, project, onSubmit, onCancel }: ProjectFormProps): JSX.Element {
  const notification = useNotification();
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [repositoryUrl, setRepositoryUrl] = useState<string>('');
  const [repositoryUrlError, setRepositoryUrlError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setRepositoryUrl(project.repositoryUrl || '');
    } else {
      setName('');
      setDescription('');
      setRepositoryUrl('');
    }
    setErrorMessage(''); // Clear errors when opening dialog
    setRepositoryUrlError(''); // Clear validation errors too
  }, [project, open]);

  /**
   * Validates repository URL format
   */
  const validateRepositoryUrl = (url: string): boolean => {
    if (!url) return true; // Optional field
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate repository URL if provided
    if (repositoryUrl && !validateRepositoryUrl(repositoryUrl)) {
      setRepositoryUrlError('Please enter a valid http or https URL');
      return;
    }
    setRepositoryUrlError('');
    setErrorMessage(''); // Clear previous errors

    setLoading(true);

    try {
      await onSubmit({
        name,
        description: description || undefined,
        repositoryUrl: repositoryUrl || undefined,
      });
      handleClose();
    } catch (error) {
      // Extract user-friendly error message from API response
      let userMessage = 'Failed to save project. Please try again.';

      if (error instanceof ApiException) {
        // Use the specific error message from the API
        userMessage = error.message;

        // For validation errors, provide more context
        if (error.error === 'VALIDATION_ERROR' && error.details) {
          const fieldErrors = Object.entries(error.details)
            .map(([field, msg]) => `${field}: ${msg}`)
            .join(', ');
          userMessage = `Validation error: ${fieldErrors}`;
        }
      }

      setErrorMessage(userMessage);
      notification.error(userMessage);
      console.error('Form submission failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setRepositoryUrl('');
    setErrorMessage('');
    setRepositoryUrlError('');
    onCancel();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{project ? 'Edit Project' : 'Create Project'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {errorMessage && (
              <Alert severity="error" onClose={() => setErrorMessage('')}>
                {errorMessage}
              </Alert>
            )}
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
              autoFocus
            />
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={3}
            />
            <TextField
              label="Repository URL"
              value={repositoryUrl}
              onChange={(e) => {
                setRepositoryUrl(e.target.value);
                setRepositoryUrlError('');
              }}
              error={!!repositoryUrlError}
              helperText={repositoryUrlError || 'Optional'}
              fullWidth
              placeholder="https://github.com/username/repo"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Saving...' : project ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
