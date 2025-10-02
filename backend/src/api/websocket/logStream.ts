/**
 * Log Stream WebSocket Handler
 * Handles real-time log streaming via WebSocket with JWT authentication
 * Task: Phase 3.5 - API Layer
 */
import { FastifyRequest } from 'fastify';
import { WebSocket } from 'ws';
import { MessageType, EnvironmentService, LogService, WebSocketService } from '@/services';
import { logger } from '@/lib/logger';
import { verifyWebSocketToken } from '@/lib/websocket-auth';
import { ForbiddenError } from '@/lib/errors';
import { randomUUID } from 'crypto';

// Shared WebSocketService instance for all connections
const wsService = new WebSocketService();

/**
 * Handle log stream WebSocket connection with JWT authentication
 *
 * Streams real-time Docker container logs for a specific environment.
 * Requires valid JWT token in query string for authentication.
 *
 * @param socket - WebSocket connection
 * @param request - Fastify request with environmentId and token query params
 *
 * @throws {UnauthorizedError} If token is missing or invalid
 *
 * @example
 * ```typescript
 * // Register WebSocket route
 * fastify.get('/logs/stream', { websocket: true }, logStreamHandler);
 *
 * // Client connection
 * const ws = new WebSocket(`ws://localhost:3000/logs/stream?environmentId=123&token=${jwt}`);
 * ws.onmessage = (event) => {
 *   const { type, payload } = JSON.parse(event.data);
 *   if (type === 'LOG') {
 *     console.log(payload.content);
 *   }
 * };
 * ```
 */
export async function logStreamHandler(
  socket: WebSocket,
  request: FastifyRequest<{
    Querystring: { environmentId: string; token?: string };
  }>
): Promise<void> {
  const { environmentId, token } = request.query;

  try {
    // Verify JWT token for authentication (before parameter validation to prevent probing)
    const user = verifyWebSocketToken(request.server, token);

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

    // Authorization: Verify user has access to this environment
    // This prevents broken access control - users can't access other tenants' logs
    const environmentService = new EnvironmentService();
    try {
      await environmentService.getEnvironmentById(environmentId, user.userId);
    } catch (error) {
      if (error instanceof ForbiddenError) {
        logger.warn(
          { environmentId, userId: user.userId },
          'Forbidden: User lacks access to environment'
        );
        socket.send(
          JSON.stringify({
            type: MessageType.ERROR,
            payload: { message: 'Forbidden: Access denied to this environment' },
          })
        );
        socket.close();
        return;
      }
      // Re-throw other errors (NotFoundError, etc.)
      throw error;
    }

    logger.info({ environmentId, userId: user.userId }, 'Log stream WebSocket connected');

    const logService = new LogService();

    // Generate unique client ID
    const clientId = randomUUID();

    // Register client connection
    wsService.registerClient(clientId, socket, user.userId);

    // Subscribe client to environment
    wsService.subscribeToEnvironment(clientId, environmentId);

    // Start streaming logs
    const unsubscribe = await logService.streamLogs(environmentId, (logEntry) => {
      try {
        if (socket.readyState === WebSocket.OPEN) {
          wsService.broadcastLog({
            environmentId,
            stream: logEntry.stream,
            message: logEntry.content,
            timestamp: logEntry.timestamp,
          });
        }
      } catch (error) {
        logger.error({ error, environmentId, userId: user.userId }, 'Error broadcasting log');
      }
    });

    // Send initial connection success message
    socket.send(
      JSON.stringify({
        type: MessageType.LOG,
        payload: {
          environmentId,
          stream: 'stdout',
          message: 'Log stream connected',
          timestamp: new Date(),
        },
      })
    );

    // Handle connection close
    socket.on('close', () => {
      logger.info(
        { environmentId, userId: user.userId, clientId },
        'Log stream WebSocket disconnected'
      );
      wsService.unregisterClient(clientId);
      unsubscribe();
    });

    // Handle errors
    socket.on('error', (error: Error) => {
      logger.error(
        { error, environmentId, userId: user.userId, clientId },
        'Log stream WebSocket error'
      );
      wsService.unregisterClient(clientId);
      unsubscribe();
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error, environmentId }, 'Error setting up log stream');
    socket.send(
      JSON.stringify({
        type: MessageType.ERROR,
        payload: { message: 'Failed to setup log stream', error: errorMessage },
      })
    );
    socket.close();
  }
}
