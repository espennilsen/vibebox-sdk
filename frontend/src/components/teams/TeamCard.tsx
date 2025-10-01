/**
 * Team Card Component - VibeBox Frontend
 * Display team information
 */

import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { MoreVert, Edit, Delete, People } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { Team } from '@/types';

interface TeamCardProps {
  team: Team;
  memberCount?: number;
  onEdit: (team: Team) => void;
  onDelete: (team: Team) => void;
}

/**
 * Team card component
 */
export function TeamCard({ team, memberCount = 0, onEdit, onDelete }: TeamCardProps): JSX.Element {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" gutterBottom>
              {team.name}
            </Typography>
            {team.description && (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {team.description}
              </Typography>
            )}
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <People fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {memberCount} member{memberCount !== 1 ? 's' : ''}
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={handleMenuOpen}>
            <MoreVert />
          </IconButton>
        </Box>
      </CardContent>
      <CardActions>
        <Button size="small" onClick={() => navigate(`/teams/${team.id}`)}>
          View Details
        </Button>
      </CardActions>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            handleMenuClose();
            onEdit(team);
          }}
        >
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            handleMenuClose();
            onDelete(team);
          }}
        >
          <ListItemIcon>
            <Delete fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Card>
  );
}
