/**
 * Status WebSocket Handler
 * Handles real-time environment status updates via WebSocket
 * Task: Phase 3.5 - API Layer
 */
import { SocketStream } from '@fastify/websocket';
import { FastifyRequest } from 'fastify';
import { WebSocketService, MessageType, EnvironmentService } from '@/services';
import { logger } from '@/lib/logger';

/**
 * Handle status WebSocket connection
 *
 * @param connection - WebSocket connection stream
 * @param request - Fastify request with environmentId query param
 *
 * @example
 * ```typescript
 * fastify.get('/status', { websocket: true }, statusHandler);
 * ```
 */
export async function statusHandler(
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

    logger.info({ environmentId }, 'Status WebSocket connected');

    const wsService = new WebSocketService();
    const environmentService = new EnvironmentService();

    // Register client connection
    const connectionId = wsService.addConnection(socket, environmentId);

    // Send initial status
    try {
      const status = await environmentService.getEnvironmentStatus(environmentId);
      socket.send(
        JSON.stringify({
          type: MessageType.ENVIRONMENT_STATUS,
          payload: {
            environmentId,
            status: status.status,
            containerStatus: status.containerStatus,
            uptime: status.uptime,
            lastError: status.lastError,
          },
        })
      );
    } catch (error) {
      logger.error({ error, environmentId }, 'Error fetching initial status');
    }

    // Poll for status updates every 5 seconds
    const statusInterval = setInterval(() => {
      void (async () => {
        try {
          if (socket.readyState === socket.OPEN) {
            const status = await environmentService.getEnvironmentStatus(environmentId);
            wsService.broadcast(environmentId, {
              type: MessageType.ENVIRONMENT_STATUS,
              payload: {
                environmentId,
                status: status.status,
                containerStatus: status.containerStatus,
                uptime: status.uptime,
                lastError: status.lastError,
              },
            });
          } else {
            clearInterval(statusInterval);
          }
        } catch (error) {
          logger.error({ error, environmentId }, 'Error broadcasting status');
        }
      })();
    }, 5000);

    // Handle connection close
    socket.on('close', () => {
      logger.info({ environmentId, connectionId }, 'Status WebSocket disconnected');
      clearInterval(statusInterval);
      wsService.removeConnection(connectionId);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error({ error, environmentId, connectionId }, 'Status WebSocket error');
      clearInterval(statusInterval);
      wsService.removeConnection(connectionId);
    });
  } catch (error) {
    logger.error({ error, environmentId }, 'Error setting up status stream');
    socket.send(
      JSON.stringify({
        type: MessageType.ERROR,
        payload: { message: 'Failed to setup status stream' },
      })
    );
    socket.close();
  }
}
