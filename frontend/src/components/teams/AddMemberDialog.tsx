/**
 * Add Member Dialog Component - VibeBox Frontend
 * Dialog for adding team members
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
import type { AddTeamMemberRequest } from '@/types';

interface AddMemberDialogProps {
  open: boolean;
  onSubmit: (data: AddTeamMemberRequest) => Promise<void>;
  onCancel: () => void;
}

/**
 * Add member dialog component
 */
export function AddMemberDialog({ open, onSubmit, onCancel }: AddMemberDialogProps): JSX.Element {
  const [userId, setUserId] = useState<string>('');
  const [role, setRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [loading, setLoading] = useState<boolean>(false);
  const [userIdError, setUserIdError] = useState<string>('');

  const validateUserId = (value: string): boolean => {
    if (!value) return false;
    // Basic check: either looks like email or is non-empty string (ID)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) || value.length > 0;
  };

  const handleSubmit = async () => {
    if (!userId || !validateUserId(userId)) {
      setUserIdError('Please enter a valid user ID or email');
      return;
    }
    setUserIdError('');

    setLoading(true);
    try {
      await onSubmit({ userId, role });
      setUserId('');
      setRole('MEMBER');
      onCancel();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Add Team Member</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="User ID or Email"
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              setUserIdError('');
            }}
            error={!!userIdError}
            helperText={userIdError}
            required
            fullWidth
            autoFocus
          />
          <TextField
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value as 'ADMIN' | 'MEMBER')}
            select
            fullWidth
          >
            <MenuItem value="MEMBER">Member</MenuItem>
            <MenuItem value="ADMIN">Admin</MenuItem>
          </TextField>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading || !userId}>
          {loading ? 'Adding...' : 'Add Member'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
