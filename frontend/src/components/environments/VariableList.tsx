/**
 * Variable List Component - VibeBox Frontend
 * Display and manage environment variables
 */

import React, { useState } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Typography,
  Chip,
  FormControlLabel,
  Checkbox,
  Alert,
} from '@mui/material';
import { Delete, Add, Visibility, VisibilityOff } from '@mui/icons-material';
import type { EnvironmentVariable, AddEnvironmentVariableRequest } from '@/types';
import { useNotification } from '@/contexts/NotificationContext';
import { ApiException } from '@/services/api';

interface VariableListProps {
  variables: EnvironmentVariable[];
  onAdd: (data: AddEnvironmentVariableRequest) => Promise<void>;
  onRemove: (key: string) => Promise<void>;
}

/**
 * Environment variables list component
 */
export function VariableList({ variables, onAdd, onRemove }: VariableListProps): JSX.Element {
  const notification = useNotification();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    key: '',
    value: '',
    isSecret: false,
  });
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleAdd = async () => {
    setErrorMessage(''); // Clear previous errors

    try {
      await onAdd(formData);
      notification.success('Environment variable added successfully');
      setDialogOpen(false);
      setFormData({
        key: '',
        value: '',
        isSecret: false,
      });
    } catch (error) {
      // Extract user-friendly error message from API response
      let userMessage = 'Failed to add environment variable. Please try again.';

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
        // Handle specific duplicate key errors
        else if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          userMessage = error.message;
        }
      }

      setErrorMessage(userMessage);
      notification.error(userMessage);
      console.error('Failed to add environment variable:', error);
    }
  };

  const toggleShowSecret = (id: string) => {
    setShowSecrets((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleRemove = async (key: string) => {
    try {
      await onRemove(key);
      notification.success('Environment variable removed successfully');
    } catch (error) {
      // Extract user-friendly error message from API response
      let userMessage = 'Failed to remove environment variable. Please try again.';

      if (error instanceof ApiException) {
        userMessage = error.message;
      }

      notification.error(userMessage);
      console.error('Failed to remove environment variable:', error);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Environment Variables</Typography>
        <Button startIcon={<Add />} onClick={() => setDialogOpen(true)}>
          Add Variable
        </Button>
      </Box>

      {variables.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No environment variables configured
        </Typography>
      ) : (
        <List>
          {variables.map((variable) => (
            <ListItem key={variable.id}>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" component="span">
                      {variable.key}
                    </Typography>
                    {variable.isSecret && <Chip label="Secret" size="small" color="warning" />}
                  </Box>
                }
                secondary={
                  variable.isSecret && !showSecrets[variable.id] ? '••••••••' : variable.value
                }
              />
              <ListItemSecondaryAction>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {variable.isSecret && (
                    <IconButton
                      edge="end"
                      onClick={() => toggleShowSecret(variable.id)}
                      size="small"
                    >
                      {showSecrets[variable.id] ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  )}
                  <IconButton edge="end" onClick={() => handleRemove(variable.key)}>
                    <Delete />
                  </IconButton>
                </Box>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Add Environment Variable</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, minWidth: 400 }}>
            {errorMessage && (
              <Alert severity="error" onClose={() => setErrorMessage('')}>
                {errorMessage}
              </Alert>
            )}
            <TextField
              label="Key"
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Value"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              fullWidth
              required
              multiline
              rows={2}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.isSecret}
                  onChange={(e) => setFormData({ ...formData, isSecret: e.target.checked })}
                />
              }
              label="Mark as secret"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDialogOpen(false);
              setErrorMessage('');
            }}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={handleAdd}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
