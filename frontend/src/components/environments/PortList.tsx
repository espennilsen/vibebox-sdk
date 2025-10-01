/**
 * Port List Component - VibeBox Frontend
 * Display and manage port mappings
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
  MenuItem,
  Box,
  Typography,
} from '@mui/material';
import { Delete, Add } from '@mui/icons-material';
import type { PortMapping, AddPortMappingRequest } from '@/types';

interface PortListProps {
  ports: PortMapping[];
  onAdd: (data: AddPortMappingRequest) => Promise<void>;
  onRemove: (port: number) => Promise<void>;
}

/**
 * Port mappings list component
 */
export function PortList({ ports, onAdd, onRemove }: PortListProps): JSX.Element {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    containerPort: 3000,
    hostPort: 3000,
    protocol: 'TCP' as 'TCP' | 'UDP',
    description: '',
  });

  const handleAdd = async () => {
    try {
      await onAdd(formData);
      setDialogOpen(false);
      setFormData({
        containerPort: 3000,
        hostPort: 3000,
        protocol: 'TCP',
        description: '',
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Port Mappings</Typography>
        <Button startIcon={<Add />} onClick={() => setDialogOpen(true)}>
          Add Port
        </Button>
      </Box>

      {ports.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No port mappings configured
        </Typography>
      ) : (
        <List>
          {ports.map((port) => (
            <ListItem key={port.id}>
              <ListItemText
                primary={`${port.containerPort} → ${port.hostPort} (${port.protocol})`}
                secondary={port.description}
              />
              <ListItemSecondaryAction>
                <IconButton edge="end" onClick={() => onRemove(port.containerPort)}>
                  <Delete />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Add Port Mapping</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, minWidth: 400 }}>
            <TextField
              label="Container Port"
              type="number"
              value={formData.containerPort}
              onChange={(e) => setFormData({ ...formData, containerPort: Number(e.target.value) })}
              fullWidth
            />
            <TextField
              label="Host Port"
              type="number"
              value={formData.hostPort}
              onChange={(e) => setFormData({ ...formData, hostPort: Number(e.target.value) })}
              fullWidth
            />
            <TextField
              label="Protocol"
              value={formData.protocol}
              onChange={(e) =>
                setFormData({ ...formData, protocol: e.target.value as 'TCP' | 'UDP' })
              }
              select
              fullWidth
            >
              <MenuItem value="TCP">TCP</MenuItem>
              <MenuItem value="UDP">UDP</MenuItem>
            </TextField>
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
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
