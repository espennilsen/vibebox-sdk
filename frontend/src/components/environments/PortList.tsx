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
import { useNotification } from '@/contexts/NotificationContext';

/**
 * Props for the PortList component
 */
interface PortListProps {
  /** Array of port mappings to display */
  ports: PortMapping[];
  /** Callback to add a new port mapping */
  onAdd: (data: AddPortMappingRequest) => Promise<void>;
  /** Callback to remove a port mapping by container port */
  onRemove: (port: number) => Promise<void>;
}

/**
 * Port mappings list component with add/remove functionality
 *
 * Displays environment port mappings and provides UI for adding/removing ports.
 * Validates port ranges (1-65535) and shows user-friendly error messages.
 *
 * @param props - Component props
 * @param props.ports - Array of port mappings to display
 * @param props.onAdd - Callback to add a new port mapping
 * @param props.onRemove - Callback to remove a port mapping by container port
 * @returns Port mappings list with add/remove UI
 * @public
 *
 * @example
 * ```tsx
 * <PortList
 *   ports={environment.portMappings}
 *   onAdd={async (data) => await environmentsApi.addPortMapping(envId, data)}
 *   onRemove={async (port) => await environmentsApi.removePortMapping(envId, port)}
 * />
 * ```
 */
export function PortList({ ports, onAdd, onRemove }: PortListProps): JSX.Element {
  const notification = useNotification();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<AddPortMappingRequest>({
    containerPort: 3000,
    hostPort: 3000,
    protocol: 'TCP',
    description: '',
  });
  const [portError, setPortError] = useState<string>('');

  /**
   * Validates port number is in valid range (1-65535)
   */
  const validatePort = (port: number): boolean => {
    return port >= 1 && port <= 65535;
  };

  const handleAdd = async () => {
    // Validate port ranges
    if (!validatePort(formData.containerPort)) {
      setPortError('Container port must be between 1 and 65535');
      return;
    }
    // Validate hostPort only if provided (it's optional and can be auto-assigned)
    if (formData.hostPort !== undefined && !validatePort(formData.hostPort)) {
      setPortError('Host port must be between 1 and 65535');
      return;
    }
    setPortError('');

    try {
      await onAdd(formData);
      notification.success('Port mapping added successfully');
      setDialogOpen(false);
      setFormData({
        containerPort: 3000,
        hostPort: 3000,
        protocol: 'TCP',
        description: '',
      });
    } catch (error) {
      notification.error('Failed to add port mapping');
      console.error('Failed to add port mapping:', error);
    }
  };

  const handleRemove = async (port: number) => {
    try {
      await onRemove(port);
      notification.success('Port mapping removed successfully');
    } catch (error) {
      notification.error('Failed to remove port mapping');
      console.error('Failed to remove port mapping:', error);
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
                <IconButton
                  edge="end"
                  onClick={() => handleRemove(port.containerPort)}
                  aria-label={`Delete port mapping ${port.containerPort} to ${port.hostPort} ${port.protocol}`}
                >
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
            {portError && (
              <Typography color="error" variant="body2">
                {portError}
              </Typography>
            )}
            <TextField
              label="Container Port"
              type="number"
              value={formData.containerPort}
              onChange={(e) => {
                setFormData({ ...formData, containerPort: Number(e.target.value) });
                setPortError('');
              }}
              inputProps={{ min: 1, max: 65535 }}
              fullWidth
            />
            <TextField
              label="Host Port"
              type="number"
              value={formData.hostPort}
              onChange={(e) => {
                setFormData({ ...formData, hostPort: Number(e.target.value) });
                setPortError('');
              }}
              inputProps={{ min: 1, max: 65535 }}
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
          <Button
            onClick={() => {
              setFormData({
                containerPort: 3000,
                hostPort: 3000,
                protocol: 'TCP',
                description: '',
              });
              setPortError('');
              setDialogOpen(false);
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
