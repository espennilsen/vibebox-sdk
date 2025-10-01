/**
 * Session List Component - VibeBox Frontend
 * List of terminal sessions
 */

import React from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Box,
  Typography,
  Chip,
} from '@mui/material';
import { Delete, Terminal as TerminalIcon } from '@mui/icons-material';
import type { TerminalSession } from '@/types';

interface SessionListProps {
  sessions: TerminalSession[];
  onSelect: (session: TerminalSession) => void;
  onDelete: (session: TerminalSession) => void;
}

/**
 * List of terminal sessions
 */
export function SessionList({ sessions, onSelect, onDelete }: SessionListProps): JSX.Element {
  if (sessions.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No active sessions
        </Typography>
      </Box>
    );
  }

  return (
    <List>
      {sessions.map((session) => (
        <ListItem key={session.id} button onClick={() => onSelect(session)}>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TerminalIcon fontSize="small" />
                {session.name}
                {session.status === 'ACTIVE' && (
                  <Chip label="Active" color="success" size="small" />
                )}
              </Box>
            }
            secondary={`${session.shell} • ${session.cols}x${session.rows} • PID: ${session.pid || 'N/A'}`}
          />
          <ListItemSecondaryAction>
            <IconButton
              edge="end"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(session);
              }}
            >
              <Delete />
            </IconButton>
          </ListItemSecondaryAction>
        </ListItem>
      ))}
    </List>
  );
}
