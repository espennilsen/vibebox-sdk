/**
 * Dashboard Page - VibeBox Frontend
 * Main dashboard showing environment overview
 */

import { useEffect, useState } from 'react';
import { Box, Typography, Grid, Button, Card, CardContent, CardActions } from '@mui/material';
import { Add, Folder } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { projectsApi, environmentsApi } from '@/services/api';
import type { Project, Environment } from '@/types';
import { LoadingSpinner, EmptyState, StatusBadge } from '@/components/common';
import { useNotification } from '@/contexts/NotificationContext';

/**
 * Dashboard page component
 */
export function Dashboard(): JSX.Element {
  const navigate = useNavigate();
  const notification = useNotification();
  const [projects, setProjects] = useState<Project[]>([]);
  const [environments, setEnvironments] = useState<Record<string, Environment[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboardData = async () => {
    try {
      const projectsData = await projectsApi.listProjects();
      setProjects(projectsData);

      // Load environments for each project
      const envPromises = projectsData.map((project) =>
        environmentsApi.listEnvironments(project.id)
      );
      const envResults = await Promise.all(envPromises);

      const envByProject: Record<string, Environment[]> = {};
      projectsData.forEach((project, index) => {
        envByProject[project.id] = envResults[index] || [];
      });

      setEnvironments(envByProject);
    } catch (error) {
      notification.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={Folder}
        title="No projects yet"
        description="Create your first project to get started with VibeBox"
        actionText="Create Project"
        onAction={() => navigate('/projects')}
      />
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Dashboard
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/projects')}>
          New Project
        </Button>
      </Box>

      <Grid container spacing={3}>
        {projects.map((project) => {
          const projectEnvs = environments[project.id] || [];
          const runningCount = projectEnvs.filter((e) => e.status === 'RUNNING').length;

          return (
            <Grid item xs={12} md={6} lg={4} key={project.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {project.name}
                  </Typography>
                  {project.description && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {project.description}
                    </Typography>
                  )}
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {projectEnvs.length} environment{projectEnvs.length !== 1 ? 's' : ''}
                      {runningCount > 0 && ` • ${runningCount} running`}
                    </Typography>
                  </Box>
                  {projectEnvs.length > 0 && (
                    <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {projectEnvs.slice(0, 3).map((env) => (
                        <Box key={env.id}>
                          <StatusBadge status={env.status} />
                        </Box>
                      ))}
                      {projectEnvs.length > 3 && (
                        <Typography variant="caption" color="text.secondary">
                          +{projectEnvs.length - 3} more
                        </Typography>
                      )}
                    </Box>
                  )}
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => navigate(`/projects/${project.id}`)}>
                    View Details
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
