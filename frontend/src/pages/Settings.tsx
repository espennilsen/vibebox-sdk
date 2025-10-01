/**
 * Settings Page - VibeBox Frontend
 * User settings and preferences
 */

import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { Delete, Add } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { usersApi } from '@/services/api';
import { useNotification } from '@/contexts/NotificationContext';
import type { UpdateUserRequest } from '@/types';

/**
 * Settings page component
 */
export function Settings(): JSX.Element {
  const { user, refreshUser } = useAuth();
  const notification = useNotification();
  const [currentTab, setCurrentTab] = useState(0);
  const [sshKeyDialogOpen, setSshKeyDialogOpen] = useState(false);
  const [newSshKey, setNewSshKey] = useState('');
  const [loading, setLoading] = useState(false);

  // Profile form state
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');

  // Preferences form state
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [locale, setLocale] = useState(user?.locale || 'en-US');
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    user?.notificationsEnabled ?? true
  );

  if (!user) {
    return <Typography>Loading...</Typography>;
  }

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const data: UpdateUserRequest = {
        displayName: displayName || undefined,
        avatarUrl: avatarUrl || undefined,
      };
      await usersApi.updateUser(user.id, data);
      await refreshUser();
      notification.success('Profile updated successfully');
    } catch (error) {
      notification.error('Failed to update profile');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setLoading(true);
    try {
      const data: UpdateUserRequest = {
        timezone,
        locale,
        notificationsEnabled,
      };
      await usersApi.updateUser(user.id, data);
      await refreshUser();
      notification.success('Preferences updated successfully');
    } catch (error) {
      notification.error('Failed to update preferences');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSshKey = async () => {
    if (!newSshKey.trim()) return;

    setLoading(true);
    try {
      await usersApi.addSshKey(user.id, { publicKey: newSshKey });
      await refreshUser();
      notification.success('SSH key added successfully');
      setSshKeyDialogOpen(false);
      setNewSshKey('');
    } catch (error) {
      notification.error('Failed to add SSH key');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSshKey = async (index: number) => {
    setLoading(true);
    try {
      await usersApi.removeSshKey(user.id, index);
      await refreshUser();
      notification.success('SSH key removed successfully');
    } catch (error) {
      notification.error('Failed to remove SSH key');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>

      <Paper sx={{ mt: 3 }}>
        <Tabs value={currentTab} onChange={(_, value) => setCurrentTab(value)}>
          <Tab label="Profile" />
          <Tab label="Preferences" />
          <Tab label="SSH Keys" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {currentTab === 0 && (
            <Box sx={{ maxWidth: 600 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
                <Avatar src={avatarUrl || undefined} sx={{ width: 80, height: 80 }}>
                  {displayName?.[0] || user.email[0]}
                </Avatar>
                <Box>
                  <Typography variant="h6">{displayName || user.email}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user.email}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Display Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Avatar URL"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  fullWidth
                  placeholder="https://..."
                />
                <TextField label="Email" value={user.email} disabled fullWidth />
                <Button
                  variant="contained"
                  onClick={handleSaveProfile}
                  disabled={loading}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Save Changes
                </Button>
              </Box>
            </Box>
          )}

          {currentTab === 1 && (
            <Box sx={{ maxWidth: 600 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  fullWidth
                  placeholder="UTC"
                />
                <TextField
                  label="Locale"
                  value={locale}
                  onChange={(e) => setLocale(e.target.value)}
                  fullWidth
                  placeholder="en-US"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationsEnabled}
                      onChange={(e) => setNotificationsEnabled(e.target.checked)}
                    />
                  }
                  label="Enable notifications"
                />
                <Button
                  variant="contained"
                  onClick={handleSavePreferences}
                  disabled={loading}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Save Changes
                </Button>
              </Box>
            </Box>
          )}

          {currentTab === 2 && (
            <Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography variant="h6">SSH Public Keys</Typography>
                <Button startIcon={<Add />} onClick={() => setSshKeyDialogOpen(true)}>
                  Add Key
                </Button>
              </Box>

              {user.sshPublicKeys.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No SSH keys configured
                </Typography>
              ) : (
                <List>
                  {user.sshPublicKeys.map((key, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={`Key ${index + 1}`}
                        secondary={`${key.substring(0, 50)}...`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton edge="end" onClick={() => handleRemoveSshKey(index)}>
                          <Delete />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          )}
        </Box>
      </Paper>

      <Dialog
        open={sshKeyDialogOpen}
        onClose={() => setSshKeyDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add SSH Public Key</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            rows={6}
            fullWidth
            value={newSshKey}
            onChange={(e) => setNewSshKey(e.target.value)}
            placeholder="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSshKeyDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddSshKey}
            disabled={loading || !newSshKey.trim()}
          >
            Add Key
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
