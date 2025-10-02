/**
 * Environment Detail Page - VibeBox Frontend
 * Comprehensive environment management with tabs
 */

import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  Grid,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { ArrowBack, Add } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { environmentsApi, sessionsApi, extensionsApi } from '@/services/api';
import type {
  Environment,
  TerminalSession,
  Extension,
  AddPortMappingRequest,
  AddEnvironmentVariableRequest,
  CreateSessionRequest,
} from '@/types';
import { LoadingSpinner, EmptyState, StatusBadge, ConfirmDialog } from '@/components/common';
import { EnvironmentActions, PortList, VariableList } from '@/components/environments';
import { LogViewer } from '@/components/logs';
import { Terminal } from '@/components/terminal';
import { SessionList, CreateSessionDialog } from '@/components/sessions';
import { InstalledExtensions } from '@/components/extensions';
import { useNotification } from '@/contexts/NotificationContext';
import { useWebSocket } from '@/hooks';
import type { EnvironmentStatusPayload } from '@/types';

/**
 * Environment detail page with comprehensive management
 */
export function EnvironmentDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const notification = useNotification();

  const [environment, setEnvironment] = useState<Environment | null>(null);
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [activeSession, setActiveSession] = useState<TerminalSession | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createSessionOpen, setCreateSessionOpen] = useState(false);
  const [deleteSessionDialog, setDeleteSessionDialog] = useState<TerminalSession | null>(null);

  const loadEnvironmentData = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const [envData, sessionsData, extensionsData] = await Promise.all([
        environmentsApi.getEnvironment(id),
        sessionsApi.listSessions(id),
        extensionsApi.listExtensions(id),
      ]);
      setEnvironment(envData);
      setSessions(sessionsData);
      setExtensions(extensionsData);
    } catch (error) {
      notification.error('Failed to load environment');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [id, notification]);

  useEffect(() => {
    if (id) {
      loadEnvironmentData();
    }
  }, [id, loadEnvironmentData]);

  // Subscribe to real-time environment status updates
  useWebSocket<EnvironmentStatusPayload>(
    'environment:status',
    (payload) => {
      if (payload.environmentId === id) {
        setEnvironment((prev) =>
          prev
            ? {
                ...prev,
                status: payload.status,
                dockerContainerId: payload.dockerContainerId ?? prev.dockerContainerId,
              }
            : null
        );
      }
    },
    [id]
  );

  const handleAddPort = async (data: AddPortMappingRequest) => {
    if (!id) return;
    try {
      await environmentsApi.addPort(id, data);
      notification.success('Port mapping added');
      await loadEnvironmentData();
    } catch (error) {
      notification.error('Failed to add port mapping');
      throw error;
    }
  };

  const handleRemovePort = async (port: number) => {
    if (!id) return;
    try {
      await environmentsApi.removePort(id, port);
      notification.success('Port mapping removed');
      await loadEnvironmentData();
    } catch (error) {
      notification.error('Failed to remove port mapping');
      throw error;
    }
  };

  const handleAddVariable = async (data: AddEnvironmentVariableRequest) => {
    if (!id) return;
    try {
      await environmentsApi.addVariable(id, data);
      notification.success('Environment variable added');
      await loadEnvironmentData();
    } catch (error) {
      notification.error('Failed to add variable');
      throw error;
    }
  };

  const handleRemoveVariable = async (key: string) => {
    if (!id) return;
    try {
      await environmentsApi.removeVariable(id, key);
      notification.success('Environment variable removed');
      await loadEnvironmentData();
    } catch (error) {
      notification.error('Failed to remove variable');
      throw error;
    }
  };

  const handleCreateSession = async (data: CreateSessionRequest) => {
    try {
      const session = await sessionsApi.createSession(data);
      notification.success('Terminal session created');
      setSessions((prev) => [...prev, session]);
      setActiveSession(session);
      setCurrentTab(2); // Switch to terminal tab
    } catch (error) {
      notification.error('Failed to create session');
      throw error;
    }
  };

  const handleSelectSession = (session: TerminalSession) => {
    setActiveSession(session);
    setCurrentTab(2); // Switch to terminal tab
  };

  const handleDeleteSession = async (session: TerminalSession) => {
    try {
      await sessionsApi.deleteSession(session.id);
      notification.success('Session terminated');
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
      if (activeSession?.id === session.id) {
        setActiveSession(null);
      }
    } catch (error) {
      notification.error('Failed to terminate session');
      console.error(error);
    } finally {
      setDeleteSessionDialog(null);
    }
  };

  const handleUninstallExtension = async (extension: Extension) => {
    try {
      await extensionsApi.uninstallExtension(extension.id);
      notification.success('Extension uninstalled');
      setExtensions((prev) => prev.filter((e) => e.id !== extension.id));
    } catch (error) {
      notification.error('Failed to uninstall extension');
      console.error(error);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading environment..." />;
  }

  if (!environment) {
    return (
      <EmptyState
        title="Environment not found"
        description="The environment you're looking for doesn't exist or you don't have access to it."
        actionText="Back to Dashboard"
        onAction={() => navigate('/')}
      />
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(`/projects/${environment.projectId}`)}
          sx={{ mb: 2 }}
        >
          Back to Project
        </Button>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h4" component="h1">
                {environment.name}
              </Typography>
              <StatusBadge status={environment.status} size="medium" />
            </Box>
            {environment.description && (
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                {environment.description}
              </Typography>
            )}
          </Box>
          <EnvironmentActions environment={environment} onUpdate={loadEnvironmentData} />
        </Box>
      </Box>

      <Paper>
        <Tabs value={currentTab} onChange={(_, value) => setCurrentTab(value)}>
          <Tab label="Overview" />
          <Tab label="Logs" />
          <Tab label="Terminal" />
          <Tab label="Sessions" />
          <Tab label="Extensions" />
          <Tab label="Settings" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Overview Tab */}
          {currentTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Environment Info
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Base Image
                        </Typography>
                        <Typography variant="body2">{environment.baseImage}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Resources
                        </Typography>
                        <Typography variant="body2">
                          CPU: {environment.cpuLimit} cores • Memory: {environment.memoryLimit} MB •
                          Disk: {environment.diskLimit} MB
                        </Typography>
                      </Box>
                      {environment.dockerContainerId && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Container ID
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                          >
                            {environment.dockerContainerId.substring(0, 12)}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Quick Stats
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Active Sessions
                        </Typography>
                        <Typography variant="body2">
                          {sessions.filter((s) => s.status === 'ACTIVE').length}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Port Mappings
                        </Typography>
                        <Typography variant="body2">{environment.ports?.length || 0}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Environment Variables
                        </Typography>
                        <Typography variant="body2">
                          {environment.variables?.length || 0}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Extensions
                        </Typography>
                        <Typography variant="body2">{extensions.length}</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Logs Tab */}
          {currentTab === 1 && (
            <Box sx={{ height: '600px' }}>
              <LogViewer environmentId={environment.id} />
            </Box>
          )}

          {/* Terminal Tab */}
          {currentTab === 2 && (
            <Box>
              {activeSession ? (
                <Box sx={{ height: '600px' }}>
                  <Terminal sessionId={activeSession.id} onClose={() => setActiveSession(null)} />
                </Box>
              ) : (
                <EmptyState
                  title="No active terminal session"
                  description="Create or select a terminal session to get started"
                  actionText="Create Session"
                  onAction={() => setCreateSessionOpen(true)}
                />
              )}
            </Box>
          )}

          {/* Sessions Tab */}
          {currentTab === 3 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Terminal Sessions</Typography>
                <Button startIcon={<Add />} onClick={() => setCreateSessionOpen(true)}>
                  New Session
                </Button>
              </Box>
              <SessionList
                sessions={sessions}
                onSelect={handleSelectSession}
                onDelete={(session) => setDeleteSessionDialog(session)}
              />
            </Box>
          )}

          {/* Extensions Tab */}
          {currentTab === 4 && (
            <Box>
              <InstalledExtensions extensions={extensions} onUninstall={handleUninstallExtension} />
            </Box>
          )}

          {/* Settings Tab */}
          {currentTab === 5 && (
            <Box>
              <PortList
                ports={environment.ports || []}
                onAdd={handleAddPort}
                onRemove={handleRemovePort}
              />
              <Divider sx={{ my: 3 }} />
              <VariableList
                variables={environment.variables || []}
                onAdd={handleAddVariable}
                onRemove={handleRemoveVariable}
              />
            </Box>
          )}
        </Box>
      </Paper>

      <CreateSessionDialog
        open={createSessionOpen}
        environmentId={environment.id}
        onSubmit={handleCreateSession}
        onCancel={() => setCreateSessionOpen(false)}
      />

      <ConfirmDialog
        open={deleteSessionDialog !== null}
        title="Terminate Session"
        message="Are you sure you want to terminate this session? Any unsaved work will be lost."
        confirmText="Terminate"
        confirmColor="error"
        onConfirm={() => deleteSessionDialog && handleDeleteSession(deleteSessionDialog)}
        onCancel={() => setDeleteSessionDialog(null)}
      />
    </Box>
  );
}
