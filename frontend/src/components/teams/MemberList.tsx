/**
 * Member List Component - VibeBox Frontend
 * List of team members
 */
import {
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  Chip,
  Box,
  Typography,
} from '@mui/material';
import { Delete } from '@mui/icons-material';
import type { TeamMember } from '@/types';

interface MemberListProps {
  members: TeamMember[];
  currentUserId: string;
  onRemove: (member: TeamMember) => void;
}

/**
 * Team members list component
 */
export function MemberList({ members, currentUserId, onRemove }: MemberListProps): JSX.Element {
  if (members.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No team members
        </Typography>
      </Box>
    );
  }

  return (
    <List>
      {members.map((member) => (
        <ListItem key={member.id}>
          <ListItemAvatar>
            <Avatar src={member.user?.avatarUrl || undefined}>
              {member.user?.displayName?.[0] || member.user?.email[0]}
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {member.user?.displayName || member.user?.email}
                <Chip
                  label={member.role}
                  size="small"
                  color={member.role === 'OWNER' ? 'primary' : 'default'}
                />
              </Box>
            }
            secondary={member.user?.email}
          />
          {member.userId !== currentUserId && member.role !== 'OWNER' && (
            <ListItemSecondaryAction>
              <IconButton edge="end" onClick={() => onRemove(member)}>
                <Delete />
              </IconButton>
            </ListItemSecondaryAction>
          )}
        </ListItem>
      ))}
    </List>
  );
}
