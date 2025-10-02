/**
 * Teams Page - VibeBox Frontend
 * List and manage teams
 */

import { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Button, Grid } from '@mui/material';
import { Add } from '@mui/icons-material';
import { teamsApi } from '@/services/api';
import type { Team, CreateTeamRequest, UpdateTeamRequest } from '@/types';
import { LoadingSpinner, EmptyState, ConfirmDialog } from '@/components/common';
import { TeamCard, TeamForm } from '@/components/teams';
import { useNotification } from '@/contexts/NotificationContext';

/**
 * Teams list page component
 */
export function Teams(): JSX.Element {
  const notification = useNotification();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);

  const loadTeams = useCallback(async () => {
    try {
      setLoading(true);
      // Note: This would need a listTeams endpoint in the API
      // For now, we'll show empty state
      setTeams([]);
    } catch (error) {
      notification.error('Failed to load teams');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [notification]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const handleCreate = async (data: CreateTeamRequest) => {
    try {
      await teamsApi.createTeam(data);
      notification.success('Team created successfully');
      await loadTeams();
    } catch (error) {
      notification.error('Failed to create team');
      throw error;
    }
  };

  const handleUpdate = async (data: UpdateTeamRequest) => {
    if (!editingTeam) return;

    try {
      await teamsApi.updateTeam(editingTeam.id, data);
      notification.success('Team updated successfully');
      await loadTeams();
    } catch (error) {
      notification.error('Failed to update team');
      throw error;
    }
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setFormOpen(true);
  };

  const handleDeleteClick = (team: Team) => {
    setTeamToDelete(team);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!teamToDelete) return;

    try {
      await teamsApi.deleteTeam(teamToDelete.id);
      notification.success('Team deleted successfully');
      setDeleteDialogOpen(false);
      setTeamToDelete(null);
      await loadTeams();
    } catch (error) {
      notification.error('Failed to delete team');
      console.error(error);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading teams..." />;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Teams
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setEditingTeam(null);
            setFormOpen(true);
          }}
        >
          New Team
        </Button>
      </Box>

      {teams.length === 0 ? (
        <EmptyState
          icon={Add}
          title="No teams yet"
          description="Create a team to collaborate with others on projects"
          actionText="Create Team"
          onAction={() => setFormOpen(true)}
        />
      ) : (
        <Grid container spacing={3}>
          {teams.map((team) => (
            <Grid item xs={12} md={6} lg={4} key={team.id}>
              <TeamCard
                team={team}
                memberCount={0}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <TeamForm
        open={formOpen}
        team={editingTeam}
        onSubmit={
          editingTeam
            ? (handleUpdate as (data: unknown) => Promise<void>)
            : (handleCreate as (data: unknown) => Promise<void>)
        }
        onCancel={() => {
          setFormOpen(false);
          setEditingTeam(null);
        }}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Team"
        message={`Are you sure you want to delete "${teamToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmColor="error"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setTeamToDelete(null);
        }}
      />
    </Box>
  );
}
