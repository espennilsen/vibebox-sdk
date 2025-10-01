/**
 * Project Card Component - VibeBox Frontend
 * Display project information in a card
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
import { MoreVert, Edit, Delete, Computer } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { Project } from '@/types';

interface ProjectCardProps {
  project: Project;
  environmentCount?: number;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

/**
 * Project card component with actions
 */
export function ProjectCard({
  project,
  environmentCount = 0,
  onEdit,
  onDelete,
}: ProjectCardProps): JSX.Element {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleMenuClose();
    onEdit(project);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleMenuClose();
    onDelete(project);
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" gutterBottom>
              {project.name}
            </Typography>
            {project.description && (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {project.description}
              </Typography>
            )}
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Computer fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {environmentCount} environment{environmentCount !== 1 ? 's' : ''}
                </Typography>
              </Box>
            </Box>
          </Box>
          <IconButton size="small" onClick={handleMenuOpen}>
            <MoreVert />
          </IconButton>
        </Box>
      </CardContent>
      <CardActions>
        <Button size="small" onClick={() => navigate(`/projects/${project.id}`)}>
          View Details
        </Button>
      </CardActions>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <ListItemIcon>
            <Delete fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Card>
  );
}
