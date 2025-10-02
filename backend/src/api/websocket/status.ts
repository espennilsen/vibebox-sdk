/**
 * Environment Status WebSocket Handler
 * Handles real-time environment status updates via WebSocket with JWT authentication
 * Task: Phase 3.5 - API Layer
 */
import { FastifyRequest } from 'fastify';
import { WebSocket } from 'ws';
import { MessageType, EnvironmentService, WebSocketService } from '@/services';
import { logger } from '@/lib/logger';
import { verifyWebSocketToken } from '@/lib/websocket-auth';
import { ForbiddenError } from '@/lib/errors';
import { randomUUID } from 'crypto';

// Shared WebSocketService instance for all connections
const wsService = new WebSocketService();

/**
 * Handle environment status WebSocket connection with JWT authentication
 *
 * Provides real-time environment status updates.
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
 * fastify.get('/status', { websocket: true }, statusHandler);
 *
 * // Client connection
 * const ws = new WebSocket(`ws://localhost:3000/status?environmentId=123&token=${jwt}`);
 * ws.onmessage = (event) => {
 *   const { type, payload } = JSON.parse(event.data);
 *   if (type === 'ENV_STATUS') {
 *     console.log(payload.status, payload.message);
 *   }
 * };
 * ```
 */
export async function statusHandler(
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
    // This prevents broken access control - users can't monitor other tenants' environments
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

    logger.info({ environmentId, userId: user.userId }, 'Status WebSocket connected');

    // Generate unique client ID
    const clientId = randomUUID();

    // Register client connection
    wsService.registerClient(clientId, socket, user.userId);

    // Subscribe client to environment
    wsService.subscribeToEnvironment(clientId, environmentId);

    // Send initial status
    try {
      const status = await environmentService.getEnvironmentStatus(environmentId);
      socket.send(
        JSON.stringify({
          type: MessageType.ENV_STATUS,
          payload: {
            environmentId,
            status: status.status,
            message: status.lastError || `Container status: ${status.containerStatus}`,
          },
        })
      );
    } catch (error) {
      logger.error({ error, environmentId, userId: user.userId }, 'Error fetching initial status');
    }

    let statusInterval: NodeJS.Timeout | undefined;

    try {
      // Poll for status updates every 5 seconds
      statusInterval = setInterval(() => {
        void (async () => {
          try {
            if (socket.readyState === WebSocket.OPEN) {
              const status = await environmentService.getEnvironmentStatus(environmentId);
              wsService.broadcastEnvironmentStatus({
                environmentId,
                status: status.status,
                message: status.lastError || `Container status: ${status.containerStatus}`,
              });
            } else {
              if (statusInterval) clearInterval(statusInterval);
            }
          } catch (error) {
            logger.error(
              { error, environmentId, userId: user.userId },
              'Error broadcasting status'
            );
          }
        })();
      }, 5000);

      // Handle close
      socket.on('close', () => {
        logger.info(
          { environmentId, userId: user.userId, clientId },
          'Status WebSocket disconnected'
        );
        if (statusInterval) clearInterval(statusInterval);
        wsService.unregisterClient(clientId);
      });

      // Handle errors
      socket.on('error', (error: Error) => {
        logger.error(
          { error, environmentId, userId: user.userId, clientId },
          'Status WebSocket error'
        );
        if (statusInterval) clearInterval(statusInterval);
        wsService.unregisterClient(clientId);
      });
    } catch (error) {
      if (statusInterval) clearInterval(statusInterval);
      throw error;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error, environmentId }, 'Error setting up status stream');
    socket.send(
      JSON.stringify({
        type: MessageType.ERROR,
        payload: { message: 'Failed to setup status stream', error: errorMessage },
      })
    );
    socket.close();
  }
}
