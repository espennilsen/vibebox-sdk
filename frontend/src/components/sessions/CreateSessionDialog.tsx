/**
 * Create Session Dialog Component - VibeBox Frontend
 * Dialog for creating new terminal sessions
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Box,
} from '@mui/material';
import type { CreateSessionRequest } from '@/types';

interface CreateSessionDialogProps {
  open: boolean;
  environmentId: string;
  onSubmit: (data: CreateSessionRequest) => Promise<void>;
  onCancel: () => void;
}

/**
 * Create session dialog component
 */
export function CreateSessionDialog({
  open,
  environmentId,
  onSubmit,
  onCancel,
}: CreateSessionDialogProps): JSX.Element {
  const [name, setName] = useState('');
  const [shell, setShell] = useState('/bin/bash');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSubmit({
        environmentId,
        name: name || undefined,
        shell,
        cols: 80,
        rows: 24,
      });
      setName('');
      setShell('/bin/bash');
      onCancel();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Create Terminal Session</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Session Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            placeholder="Optional"
          />
          <TextField
            label="Shell"
            value={shell}
            onChange={(e) => setShell(e.target.value)}
            select
            fullWidth
          >
            <MenuItem value="/bin/bash">Bash</MenuItem>
            <MenuItem value="/bin/sh">Shell</MenuItem>
            <MenuItem value="/bin/zsh">Zsh</MenuItem>
            <MenuItem value="/bin/fish">Fish</MenuItem>
          </TextField>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? 'Creating...' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
