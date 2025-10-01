/**
 * Project Detail Page - VibeBox Frontend
 * View and manage single project with environments
 */

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from '@mui/material';
import { ArrowBack, Add, Edit } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { projectsApi, environmentsApi } from '@/services/api';
import type { Project, Environment, CreateEnvironmentRequest } from '@/types';
import { LoadingSpinner, EmptyState } from '@/components/common';
import { EnvironmentList, ProjectForm } from '@/components/projects';
import { useNotification } from '@/contexts/NotificationContext';

/**
 * Project detail page component
 */
export function ProjectDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const notification = useNotification();

  const [project, setProject] = useState<Project | null>(null);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [createEnvOpen, setCreateEnvOpen] = useState(false);
  const [envFormData, setEnvFormData] = useState({
    name: '',
    description: '',
    baseImage: 'node:20-alpine',
    cpuLimit: 2,
    memoryLimit: 2048,
    diskLimit: 10240,
  });

  useEffect(() => {
    if (id) {
      loadProjectData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadProjectData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const [projectData, envsData] = await Promise.all([
        projectsApi.getProject(id),
        environmentsApi.listEnvironments(id),
      ]);
      setProject(projectData);
      setEnvironments(envsData);
    } catch (error) {
      notification.error('Failed to load project');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEnvironment = async () => {
    if (!id) return;

    try {
      const data: CreateEnvironmentRequest = {
        ...envFormData,
        projectId: id,
      };
      await environmentsApi.createEnvironment(data);
      notification.success('Environment created successfully');
      setCreateEnvOpen(false);
      setEnvFormData({
        name: '',
        description: '',
        baseImage: 'node:20-alpine',
        cpuLimit: 2,
        memoryLimit: 2048,
        diskLimit: 10240,
      });
      await loadProjectData();
    } catch (error) {
      notification.error('Failed to create environment');
      console.error(error);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading project..." />;
  }

  if (!project) {
    return (
      <EmptyState
        title="Project not found"
        description="The project you're looking for doesn't exist or you don't have access to it."
        actionText="Back to Projects"
        onAction={() => navigate('/projects')}
      />
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/projects')} sx={{ mb: 2 }}>
          Back to Projects
        </Button>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1">
            {project.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button startIcon={<Edit />} onClick={() => setEditFormOpen(true)}>
              Edit
            </Button>
            <Button variant="contained" startIcon={<Add />} onClick={() => setCreateEnvOpen(true)}>
              New Environment
            </Button>
          </Box>
        </Box>
        {project.description && (
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            {project.description}
          </Typography>
        )}
      </Box>

      <Paper sx={{ mt: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={0}>
            <Tab label={`Environments (${environments.length})`} />
          </Tabs>
        </Box>
        <EnvironmentList environments={environments} />
      </Paper>

      <ProjectForm
        open={editFormOpen}
        project={project}
        onSubmit={async (data) => {
          await projectsApi.updateProject(project.id, data);
          notification.success('Project updated successfully');
          await loadProjectData();
        }}
        onCancel={() => setEditFormOpen(false)}
      />

      <Dialog open={createEnvOpen} onClose={() => setCreateEnvOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Environment</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Name"
              value={envFormData.name}
              onChange={(e) => setEnvFormData({ ...envFormData, name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Description"
              value={envFormData.description}
              onChange={(e) => setEnvFormData({ ...envFormData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Base Image"
              value={envFormData.baseImage}
              onChange={(e) => setEnvFormData({ ...envFormData, baseImage: e.target.value })}
              required
              fullWidth
              select
            >
              <MenuItem value="node:20-alpine">Node.js 20 (Alpine)</MenuItem>
              <MenuItem value="python:3.11-slim">Python 3.11 (Slim)</MenuItem>
              <MenuItem value="ubuntu:22.04">Ubuntu 22.04</MenuItem>
              <MenuItem value="golang:1.21-alpine">Go 1.21 (Alpine)</MenuItem>
            </TextField>
            <TextField
              label="CPU Limit (cores)"
              type="number"
              value={envFormData.cpuLimit}
              onChange={(e) => setEnvFormData({ ...envFormData, cpuLimit: Number(e.target.value) })}
              fullWidth
              inputProps={{ min: 1, max: 16 }}
            />
            <TextField
              label="Memory Limit (MB)"
              type="number"
              value={envFormData.memoryLimit}
              onChange={(e) =>
                setEnvFormData({ ...envFormData, memoryLimit: Number(e.target.value) })
              }
              fullWidth
              inputProps={{ min: 512, max: 32768 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateEnvOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateEnvironment}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
