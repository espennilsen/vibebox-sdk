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

/**
 * Props for the MemberList component
 */
interface MemberListProps {
  /** Array of team members to display */
  members: TeamMember[];
  /** ID of the currently authenticated user */
  currentUserId: string;
  /** Callback invoked when the remove button is clicked */
  onRemove: (member: TeamMember) => void;
}

/**
 * Team members list component
 *
 * Displays a list of team members with avatars, roles, and remove actions.
 * The remove button is hidden for the current user and for members with the OWNER role.
 * Shows an empty state message when no members are present.
 *
 * @param props - Component props
 * @param props.members - Array of team members to display
 * @param props.currentUserId - ID of the currently authenticated user
 * @param props.onRemove - Callback invoked when the remove button is clicked
 * @returns Team members list UI or empty state
 * @public
 *
 * @example
 * ```tsx
 * <MemberList
 *   members={team.members}
 *   currentUserId={user.id}
 *   onRemove={handleRemoveMember}
 * />
 * ```
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
                {member.user?.displayName || member.user?.email || 'Unknown User'}
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
