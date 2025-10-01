/**
 * Notification Context - VibeBox Frontend
 * Provides toast notification functionality throughout the app
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';

interface Notification {
  id: string;
  message: string;
  severity: AlertColor;
  autoHideDuration?: number;
}

interface NotificationContextValue {
  showNotification: (message: string, severity?: AlertColor, autoHideDuration?: number) => void;
  success: (message: string, autoHideDuration?: number) => void;
  error: (message: string, autoHideDuration?: number) => void;
  warning: (message: string, autoHideDuration?: number) => void;
  info: (message: string, autoHideDuration?: number) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

/**
 * Notification provider component
 */
export function NotificationProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [notification, setNotification] = useState<Notification | null>(null);

  /**
   * Show a notification
   */
  const showNotification = useCallback(
    (message: string, severity: AlertColor = 'info', autoHideDuration: number = 6000): void => {
      setNotification({
        id: Date.now().toString(),
        message,
        severity,
        autoHideDuration,
      });
    },
    []
  );

  /**
   * Show success notification
   */
  const success = useCallback(
    (message: string, autoHideDuration?: number): void => {
      showNotification(message, 'success', autoHideDuration);
    },
    [showNotification]
  );

  /**
   * Show error notification
   */
  const error = useCallback(
    (message: string, autoHideDuration?: number): void => {
      showNotification(message, 'error', autoHideDuration);
    },
    [showNotification]
  );

  /**
   * Show warning notification
   */
  const warning = useCallback(
    (message: string, autoHideDuration?: number): void => {
      showNotification(message, 'warning', autoHideDuration);
    },
    [showNotification]
  );

  /**
   * Show info notification
   */
  const info = useCallback(
    (message: string, autoHideDuration?: number): void => {
      showNotification(message, 'info', autoHideDuration);
    },
    [showNotification]
  );

  /**
   * Handle notification close
   */
  const handleClose = useCallback(() => {
    setNotification(null);
  }, []);

  const value: NotificationContextValue = {
    showNotification,
    success,
    error,
    warning,
    info,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {notification && (
        <Snackbar
          open={true}
          autoHideDuration={notification.autoHideDuration}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert onClose={handleClose} severity={notification.severity} sx={{ width: '100%' }}>
            {notification.message}
          </Alert>
        </Snackbar>
      )}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to access notification context
 */
export function useNotification(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
