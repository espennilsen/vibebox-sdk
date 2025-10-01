/**
 * Projects Page - VibeBox Frontend
 * List and manage projects
 */

import { useEffect, useState } from 'react';
import { Box, Typography, Button, Grid, TextField, InputAdornment } from '@mui/material';
import { Add, Search } from '@mui/icons-material';
import { projectsApi, environmentsApi } from '@/services/api';
import type { Project, CreateProjectRequest, UpdateProjectRequest } from '@/types';
import { LoadingSpinner, EmptyState, ConfirmDialog } from '@/components/common';
import { ProjectCard, ProjectForm } from '@/components/projects';
import { useNotification } from '@/contexts/NotificationContext';
import { useDebounce } from '@/hooks';

/**
 * Projects list page component
 */
export function Projects(): JSX.Element {
  const notification = useNotification();
  const [projects, setProjects] = useState<Project[]>([]);
  const [environmentCounts, setEnvironmentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await projectsApi.listProjects();
      setProjects(data);

      // Load environment counts for each project
      const counts: Record<string, number> = {};
      await Promise.all(
        data.map(async (project) => {
          const envs = await environmentsApi.listEnvironments(project.id);
          counts[project.id] = envs.length;
        })
      );
      setEnvironmentCounts(counts);
    } catch (error) {
      notification.error('Failed to load projects');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: CreateProjectRequest) => {
    try {
      await projectsApi.createProject(data);
      notification.success('Project created successfully');
      await loadProjects();
    } catch (error) {
      notification.error('Failed to create project');
      throw error;
    }
  };

  const handleUpdate = async (data: UpdateProjectRequest) => {
    if (!editingProject) return;

    try {
      await projectsApi.updateProject(editingProject.id, data);
      notification.success('Project updated successfully');
      await loadProjects();
    } catch (error) {
      notification.error('Failed to update project');
      throw error;
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormOpen(true);
  };

  const handleDeleteClick = (project: Project) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;

    try {
      await projectsApi.deleteProject(projectToDelete.id);
      notification.success('Project deleted successfully');
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
      await loadProjects();
    } catch (error) {
      notification.error('Failed to delete project');
      console.error(error);
    }
  };

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (project.description?.toLowerCase() || '').includes(debouncedSearch.toLowerCase())
  );

  if (loading) {
    return <LoadingSpinner message="Loading projects..." />;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Projects
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setEditingProject(null);
            setFormOpen(true);
          }}
        >
          New Project
        </Button>
      </Box>

      {projects.length > 0 && (
        <TextField
          fullWidth
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ mb: 3 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      )}

      {filteredProjects.length === 0 && projects.length === 0 ? (
        <EmptyState
          icon={Add}
          title="No projects yet"
          description="Create your first project to organize your development environments"
          actionText="Create Project"
          onAction={() => setFormOpen(true)}
        />
      ) : filteredProjects.length === 0 ? (
        <EmptyState title="No projects found" description="Try adjusting your search query" />
      ) : (
        <Grid container spacing={3}>
          {filteredProjects.map((project) => (
            <Grid item xs={12} md={6} lg={4} key={project.id}>
              <ProjectCard
                project={project}
                environmentCount={environmentCounts[project.id] || 0}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <ProjectForm
        open={formOpen}
        project={editingProject}
        onSubmit={
          editingProject
            ? (handleUpdate as (data: unknown) => Promise<void>)
            : (handleCreate as (data: unknown) => Promise<void>)
        }
        onCancel={() => {
          setFormOpen(false);
          setEditingProject(null);
        }}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Project"
        message={`Are you sure you want to delete "${projectToDelete?.name}"? This will also delete all associated environments.`}
        confirmText="Delete"
        confirmColor="error"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setProjectToDelete(null);
        }}
      />
    </Box>
  );
}
