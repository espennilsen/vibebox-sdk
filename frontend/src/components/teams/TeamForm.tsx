/**
 * Team Form Component - VibeBox Frontend
 * Form for creating and editing teams
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
} from '@mui/material';
import type { Team, CreateTeamRequest, UpdateTeamRequest } from '@/types';
import { useNotification } from '@/contexts/NotificationContext';

/**
 * Props for the TeamForm component
 */
interface TeamFormProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Team to edit, or null/undefined for create mode */
  team?: Team | null;
  /** Callback when form is submitted with team data */
  onSubmit: (data: CreateTeamRequest | UpdateTeamRequest) => Promise<void>;
  /** Callback when form is cancelled */
  onCancel: () => void;
}

/**
 * Team form dialog for creating and editing teams
 *
 * Displays a modal form with name and description fields.
 * In edit mode, pre-fills with existing team data.
 *
 * @param props - Component props
 * @param props.open - Whether the dialog is open
 * @param props.team - Team to edit, or null/undefined for create mode
 * @param props.onSubmit - Callback when form is submitted with team data
 * @param props.onCancel - Callback when form is cancelled
 * @returns Team form dialog
 * @public
 *
 * @example
 * ```tsx
 * <TeamForm
 *   open={formOpen}
 *   team={selectedTeam}
 *   onSubmit={async (data) => {
 *     await teamsApi.createTeam(data);
 *     setFormOpen(false);
 *   }}
 *   onCancel={() => setFormOpen(false)}
 * />
 * ```
 */
export function TeamForm({ open, team, onSubmit, onCancel }: TeamFormProps): JSX.Element {
  const notification = useNotification();
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (team) {
      setName(team.name);
      setDescription(team.description || '');
    } else {
      setName('');
      setDescription('');
    }
  }, [team, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSubmit({
        name,
        description: description || undefined,
      });
      handleClose();
    } catch (error) {
      notification.error('Failed to save team. Please try again.');
      console.error('Form submission failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    onCancel();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{team ? 'Edit Team' : 'Create Team'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Saving...' : team ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
