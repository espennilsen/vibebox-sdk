/**
 * Terminal WebSocket Handler
 * Handles real-time terminal interaction via WebSocket
 * Task: Phase 3.5 - API Layer
 */
import { SocketStream } from '@fastify/websocket';
import { FastifyRequest } from 'fastify';
import { WebSocketService, MessageType } from '@/services';
import { logger } from '@/lib/logger';

/**
 * Handle terminal WebSocket connection
 *
 * @param connection - WebSocket connection stream
 * @param request - Fastify request with sessionId query param
 *
 * @example
 * ```typescript
 * fastify.get('/terminal', { websocket: true }, terminalHandler);
 * ```
 */
export function terminalHandler(
  connection: SocketStream,
  request: FastifyRequest<{
    Querystring: { sessionId: string; token?: string };
  }>
): void {
  const { socket } = connection;
  const { sessionId } = request.query;

  try {
    // Validate required parameters
    if (!sessionId) {
      socket.send(
        JSON.stringify({
          type: MessageType.ERROR,
          payload: { message: 'sessionId is required' },
        })
      );
      socket.close();
      return;
    }

    // TODO: Verify JWT token from query param
    // For now, we'll skip authentication to allow WebSocket connections
    // In production, you should verify the token here

    logger.info({ sessionId }, 'Terminal WebSocket connected');

    const wsService = new WebSocketService();

    // Register client connection
    const connectionId = wsService.addConnection(socket, sessionId);

    // Handle incoming messages (terminal input)
    socket.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === MessageType.TERMINAL_INPUT) {
          // Forward input to terminal process
          // TODO: Implement actual terminal process communication
          logger.debug({ sessionId, input: message.payload.data }, 'Terminal input received');

          // Echo back for now (in production, this would come from actual terminal)
          wsService.broadcast(sessionId, {
            type: MessageType.TERMINAL_OUTPUT,
            payload: {
              sessionId,
              data: message.payload.data,
            },
          });
        } else if (message.type === MessageType.TERMINAL_RESIZE) {
          // Handle terminal resize
          logger.debug(
            { sessionId, cols: message.payload.cols, rows: message.payload.rows },
            'Terminal resize'
          );
          // TODO: Implement actual terminal resize
        }
      } catch (error) {
        logger.error({ error, sessionId }, 'Error processing terminal message');
      }
    });

    // Handle connection close
    socket.on('close', () => {
      logger.info({ sessionId, connectionId }, 'Terminal WebSocket disconnected');
      wsService.removeConnection(connectionId);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error({ error, sessionId, connectionId }, 'Terminal WebSocket error');
      wsService.removeConnection(connectionId);
    });

    // Send initial connection success message
    socket.send(
      JSON.stringify({
        type: MessageType.TERMINAL_OUTPUT,
        payload: {
          sessionId,
          data: 'Terminal connected\r\n',
        },
      })
    );
  } catch (error) {
    logger.error({ error, sessionId }, 'Error setting up terminal');
    socket.send(
      JSON.stringify({
        type: MessageType.ERROR,
        payload: { message: 'Failed to setup terminal' },
      })
    );
    socket.close();
  }
}
