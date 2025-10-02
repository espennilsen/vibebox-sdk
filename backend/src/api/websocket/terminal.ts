/**
 * Terminal WebSocket Handler
 * Handles bidirectional terminal communication via WebSocket with JWT authentication
 * Task: Phase 3.5 - API Layer
 */
import { FastifyRequest } from 'fastify';
import { WebSocket } from 'ws';
import { MessageType, SessionService, WebSocketService } from '@/services';
import { logger } from '@/lib/logger';
import { verifyWebSocketToken } from '@/lib/websocket-auth';
import { ForbiddenError } from '@/lib/errors';
import { randomUUID } from 'crypto';

// Shared WebSocketService instance for all connections
const wsService = new WebSocketService();

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

    // Generate unique client ID
    const clientId = randomUUID();

    // Register client connection
    wsService.registerClient(clientId, socket, user.userId);

    // Subscribe client to session
    wsService.subscribeToSession(clientId, sessionId);

    // Handle incoming messages (terminal input)
    socket.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        logger.debug(
          { sessionId, userId: user.userId, messageType: message.type },
          'Terminal message received'
        );

        if (message.type === MessageType.TERMINAL_INPUT) {
          // Forward input to terminal process
          // TODO: Implement actual terminal process communication
          logger.debug({ sessionId, input: message.payload.data }, 'Terminal input received');

          // Echo back for now (in production, this would come from actual terminal)
          wsService.sendTerminalOutput({
            sessionId,
            data: message.payload.data,
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
        logger.error(
          { error, sessionId, userId: user.userId },
          'Error processing terminal message'
        );
      }
    });

    // Handle close
    socket.on('close', () => {
      logger.info({ sessionId, userId: user.userId, clientId }, 'Terminal WebSocket disconnected');
      wsService.unregisterClient(clientId);
    });

    // Handle errors
    socket.on('error', (error: Error) => {
      logger.error({ error, sessionId, userId: user.userId, clientId }, 'Terminal WebSocket error');
      wsService.unregisterClient(clientId);
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
