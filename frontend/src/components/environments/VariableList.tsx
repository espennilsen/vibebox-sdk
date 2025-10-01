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
} from '@mui/material';
import { Delete, Add, Visibility, VisibilityOff } from '@mui/icons-material';
import type { EnvironmentVariable, AddEnvironmentVariableRequest } from '@/types';

interface VariableListProps {
  variables: EnvironmentVariable[];
  onAdd: (data: AddEnvironmentVariableRequest) => Promise<void>;
  onRemove: (key: string) => Promise<void>;
}

/**
 * Environment variables list component
 */
export function VariableList({ variables, onAdd, onRemove }: VariableListProps): JSX.Element {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    key: '',
    value: '',
    isSecret: false,
  });

  const handleAdd = async () => {
    try {
      await onAdd(formData);
      setDialogOpen(false);
      setFormData({
        key: '',
        value: '',
        isSecret: false,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const toggleShowSecret = (id: string) => {
    setShowSecrets((prev) => ({ ...prev, [id]: !prev[id] }));
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
                  <IconButton edge="end" onClick={() => onRemove(variable.key)}>
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
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
