/**
 * Log Stream WebSocket Handler
 * Handles real-time log streaming via WebSocket
 * Task: Phase 3.5 - API Layer
 */
import { SocketStream } from '@fastify/websocket';
import { FastifyRequest } from 'fastify';
import { LogService, WebSocketService, MessageType } from '@/services';
import { logger } from '@/lib/logger';

/**
 * Handle log stream WebSocket connection
 *
 * @param connection - WebSocket connection stream
 * @param request - Fastify request with environmentId query param
 *
 * @example
 * ```typescript
 * fastify.get('/logs/stream', { websocket: true }, logStreamHandler);
 * ```
 */
export async function logStreamHandler(
  connection: SocketStream,
  request: FastifyRequest<{
    Querystring: { environmentId: string; token?: string };
  }>
): Promise<void> {
  const { socket } = connection;
  const { environmentId } = request.query;

  try {
    // Validate required parameters
    if (!environmentId) {
      socket.send(
        JSON.stringify({
          type: MessageType.ERROR,
          payload: { message: 'environmentId is required' },
        })
      );
      socket.close();
      return;
    }

    // TODO: Verify JWT token from query param
    // For now, we'll skip authentication to allow WebSocket connections
    // In production, you should verify the token here

    logger.info({ environmentId }, 'Log stream WebSocket connected');

    const logService = new LogService();
    const wsService = new WebSocketService();

    // Register client connection
    const connectionId = wsService.addConnection(socket, environmentId);

    // Start streaming logs
    const unsubscribe = await logService.streamLogs(environmentId, (logEntry) => {
      try {
        if (socket.readyState === socket.OPEN) {
          wsService.broadcast(environmentId, {
            type: MessageType.LOG,
            payload: {
              environmentId,
              stream: logEntry.stream,
              content: logEntry.content,
              timestamp: logEntry.timestamp,
              level: logEntry.level,
            },
          });
        }
      } catch (error) {
        logger.error({ error, environmentId }, 'Error broadcasting log');
      }
    });

    // Handle connection close
    socket.on('close', () => {
      logger.info({ environmentId, connectionId }, 'Log stream WebSocket disconnected');
      wsService.removeConnection(connectionId);
      unsubscribe();
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error({ error, environmentId, connectionId }, 'Log stream WebSocket error');
      wsService.removeConnection(connectionId);
      unsubscribe();
    });

    // Send initial connection success message
    socket.send(
      JSON.stringify({
        type: MessageType.LOG,
        payload: {
          environmentId,
          stream: 'stdout',
          content: 'Log stream connected',
          timestamp: new Date(),
          level: 'info',
        },
      })
    );
  } catch (error) {
    logger.error({ error, environmentId }, 'Error setting up log stream');
    socket.send(
      JSON.stringify({
        type: MessageType.ERROR,
        payload: { message: 'Failed to setup log stream' },
      })
    );
    socket.close();
  }
}
