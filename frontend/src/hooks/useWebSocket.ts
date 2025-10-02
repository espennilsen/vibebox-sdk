/**
 * useWebSocket Hook - VibeBox Frontend
 * Custom hook for WebSocket event subscriptions
 */

import { useEffect, useRef, useMemo } from 'react';
import { getWebSocketClient } from '@/services/websocket';

/**
 * Hook to subscribe to WebSocket events
 *
 * Automatically manages subscription lifecycle, subscribing on mount and
 * unsubscribing on unmount or when dependencies change.
 *
 * @template T - The type of the event payload
 * @param eventType - The WebSocket event type to subscribe to (e.g., 'log:data', 'terminal:data')
 * @param handler - Callback function invoked when the event is received
 * @param dependencies - Optional array of dependencies that trigger re-subscription when changed
 * @public
 *
 * @example
 * ```tsx
 * useWebSocket<LogEntry>(
 *   'log:data',
 *   (log) => setLogs(prev => [...prev, log]),
 *   [environmentId]
 * );
 * ```
 */
export function useWebSocket<T>(
  eventType: string,
  handler: (payload: T) => void,
  dependencies: unknown[] = []
): void {
  const handlerRef = useRef(handler);

  // Update handler ref when it changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  // Stabilize dependencies array using useMemo
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableDeps = useMemo(() => dependencies, dependencies);

  useEffect(() => {
    const ws = getWebSocketClient();

    // Subscribe with a stable handler
    const unsubscribe = ws.on<T>(eventType, (payload) => {
      handlerRef.current(payload);
    });

    // Cleanup subscription on unmount or when dependencies change
    return () => {
      unsubscribe();
    };
  }, [eventType, stableDeps]);
}
