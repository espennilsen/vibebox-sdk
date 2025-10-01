/**
 * Confirm Dialog Component - VibeBox Frontend
 * Confirmation dialog for destructive actions
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';

/**
 * Props for the ConfirmDialog component
 */
interface ConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Dialog title text */
  title: string;
  /** Confirmation message/question */
  message: string;
  /** Text for the confirm button (default: "Confirm") */
  confirmText?: string;
  /** Text for the cancel button (default: "Cancel") */
  cancelText?: string;
  /** Color of the confirm button (default: "primary") */
  confirmColor?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  /** Callback when user confirms */
  onConfirm: () => void;
  /** Callback when user cancels */
  onCancel: () => void;
}

/**
 * Confirmation dialog for destructive or important actions
 *
 * Presents a modal dialog asking the user to confirm an action. Typically used
 * before deleting resources or performing other irreversible operations.
 *
 * @param props - Component props
 * @param props.open - Whether the dialog is open
 * @param props.title - Dialog title text
 * @param props.message - Confirmation message/question
 * @param props.confirmText - Text for confirm button (default: "Confirm")
 * @param props.cancelText - Text for cancel button (default: "Cancel")
 * @param props.confirmColor - Color of confirm button (default: "primary")
 * @param props.onConfirm - Callback when user confirms
 * @param props.onCancel - Callback when user cancels
 * @returns Confirmation dialog modal
 * @public
 *
 * @example
 * ```tsx
 * <ConfirmDialog
 *   open={deleteDialogOpen}
 *   title="Delete Project"
 *   message="Are you sure you want to delete this project? This action cannot be undone."
 *   confirmText="Delete"
 *   confirmColor="error"
 *   onConfirm={handleDelete}
 *   onCancel={() => setDeleteDialogOpen(false)}
 * />
 * ```
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps): JSX.Element {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>{cancelText}</Button>
        <Button
          onClick={onConfirm}
          color={confirmColor}
          variant="contained"
          autoFocus={confirmColor !== 'error' && confirmColor !== 'warning'}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
