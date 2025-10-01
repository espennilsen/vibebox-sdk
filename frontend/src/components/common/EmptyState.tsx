/**
 * Empty State Component - VibeBox Frontend
 * Display when no data is available
 */

import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { SvgIconComponent } from '@mui/icons-material';

/**
 * Props for the EmptyState component
 */
interface EmptyStateProps {
  /** Optional Material-UI icon component to display */
  icon?: SvgIconComponent;
  /** Main heading text (required) */
  title: string;
  /** Optional explanatory text below the title */
  description?: string;
  /** Text for the action button (requires onAction) */
  actionText?: string;
  /** Click handler for the action button (requires actionText) */
  onAction?: () => void;
}

/**
 * Empty state component for displaying a message when no data is available
 *
 * Shows a centered message with an optional icon and action button. Used throughout
 * the app to provide feedback when lists or collections are empty.
 *
 * @param props - Component props
 * @param props.icon - Optional Material-UI icon component to display above the title
 * @param props.title - Main heading text (required)
 * @param props.description - Optional explanatory text below the title
 * @param props.actionText - Text for the action button (requires onAction)
 * @param props.onAction - Click handler for the action button (requires actionText)
 * @returns Centered empty state UI with optional icon and action
 * @public
 *
 * @example
 * ```tsx
 * import { FolderOpen } from '@mui/icons-material';
 *
 * <EmptyState
 *   icon={FolderOpen}
 *   title="No projects yet"
 *   description="Get started by creating your first project"
 *   actionText="Create Project"
 *   onAction={() => setCreateDialogOpen(true)}
 * />
 * ```
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
}: EmptyStateProps): JSX.Element {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px',
        p: 3,
        textAlign: 'center',
      }}
    >
      {Icon && <Icon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />}
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
          {description}
        </Typography>
      )}
      {actionText && onAction && (
        <Button variant="contained" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </Box>
  );
}
