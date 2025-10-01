/**
 * Terminal WebSocket Handler
 * Handles bidirectional terminal communication via WebSocket with JWT authentication
 * Task: Phase 3.5 - API Layer
 */
import { FastifyRequest } from 'fastify';
import { WebSocket } from 'ws';
import { MessageType, SessionService } from '@/services';
import { logger } from '@/lib/logger';
import { verifyWebSocketToken } from '@/lib/websocket-auth';
import { ForbiddenError } from '@/lib/errors';

/**
 * Handle terminal WebSocket connection with JWT authentication
 *
 * Provides bidirectional terminal session communication.
 * Requires valid JWT token in query string for authentication.
 *
 * @param socket - WebSocket connection
 * @param request - Fastify request with sessionId and token query params
 *
 * @throws {UnauthorizedError} If token is missing or invalid
 *
 * @example
 * ```typescript
 * // Register WebSocket route
 * fastify.get('/terminal', { websocket: true }, terminalHandler);
 *
 * // Client connection
 * const ws = new WebSocket(`ws://localhost:3000/terminal?sessionId=abc123&token=${jwt}`);
 *
 * // Send input to terminal
 * ws.send(JSON.stringify({
 *   type: 'TERMINAL_INPUT',
 *   payload: { sessionId: 'abc123', data: 'ls\n' }
 * }));
 *
 * // Receive output from terminal
 * ws.onmessage = (event) => {
 *   const { type, payload } = JSON.parse(event.data);
 *   if (type === 'TERMINAL_OUTPUT') {
 *     console.log(payload.data);
 *   }
 * };
 * ```
 */
export async function terminalHandler(
  socket: WebSocket,
  request: FastifyRequest<{
    Querystring: { sessionId: string; token?: string };
  }>
): Promise<void> {
  const { sessionId, token } = request.query;

  try {
    // Verify JWT token for authentication (before parameter validation to prevent probing)
    const user = verifyWebSocketToken(request.server, token);

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

    // Authorization: Verify user has access to this session
    // This prevents broken access control - users can't hijack other tenants' terminals
    const sessionService = new SessionService();
    try {
      await sessionService.getSessionById(sessionId, user.userId);
    } catch (error) {
      if (error instanceof ForbiddenError) {
        logger.warn({ sessionId, userId: user.userId }, 'Forbidden: User lacks access to session');
        socket.send(
          JSON.stringify({
            type: MessageType.ERROR,
            payload: { message: 'Forbidden: Access denied to this session' },
          })
        );
        socket.close();
        return;
      }
      // Re-throw other errors (NotFoundError, etc.)
      throw error;
    }

    logger.info({ sessionId, userId: user.userId }, 'Terminal WebSocket connected');

    // Handle incoming messages
    socket.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        logger.debug(
          { sessionId, userId: user.userId, messageType: message.type },
          'Terminal message received'
        );

        // Echo back for now (actual terminal integration would go here)
        socket.send(
          JSON.stringify({
            type: MessageType.TERMINAL_OUTPUT,
            payload: {
              sessionId,
              data: `Received: ${message.payload?.data || 'unknown'}`,
            },
          })
        );
      } catch (error) {
        logger.error(
          { error, sessionId, userId: user.userId },
          'Error processing terminal message'
        );
      }
    });

    // Handle close
    socket.on('close', () => {
      logger.info({ sessionId, userId: user.userId }, 'Terminal WebSocket disconnected');
    });

    // Handle errors
    socket.on('error', (error: Error) => {
      logger.error({ error, sessionId, userId: user.userId }, 'Terminal WebSocket error');
    });

    // Send initial connection success message
    socket.send(
      JSON.stringify({
        type: MessageType.TERMINAL_OUTPUT,
        payload: {
          sessionId,
          data: 'Terminal session connected\r\n',
        },
      })
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error, sessionId }, 'Error setting up terminal');
    socket.send(
      JSON.stringify({
        type: MessageType.ERROR,
        payload: { message: 'Failed to setup terminal', error: errorMessage },
      })
    );
    socket.close();
  }
}
