/**
 * WebSocket Routes Index
 * Central export point for all WebSocket handlers
 * Task: Phase 3.5 - API Layer
 *
 * TODO: WebSocket handlers are currently disabled due to incomplete implementation.
 * The following methods need to be implemented in services:
 * - WebSocketService: addConnection, removeConnection, broadcast
 * - LogService: streamLogs
 * - EnvironmentService: getEnvironmentStatus
 *
 * Uncomment the imports and routes below once the service methods are implemented.
 */
import { FastifyInstance } from 'fastify';
// import { logStreamHandler } from './logStream';
// import { terminalHandler } from './terminal';
// import { statusHandler } from './status';

/**
 * Register all WebSocket routes
 *
 * @param fastify - Fastify instance with websocket plugin registered
 *
 * @example
 * ```typescript
 * await fastify.register(require('@fastify/websocket'));
 * await fastify.register(registerWebSocketRoutes);
 * ```
 */
export async function registerWebSocketRoutes(_fastify: FastifyInstance): Promise<void> {
  // TODO: Uncomment these routes once WebSocket handlers are fully implemented
  /**
   * WebSocket route for log streaming
   * URL: ws://localhost:3001/api/v1/ws/logs?environmentId=xxx&token=yyy
   */
  // fastify.get('/logs', { websocket: true }, logStreamHandler);
  /**
   * WebSocket route for terminal sessions
   * URL: ws://localhost:3001/api/v1/ws/terminal?sessionId=xxx&token=yyy
   */
  // fastify.get('/terminal', { websocket: true }, terminalHandler);
  /**
   * WebSocket route for environment status updates
   * URL: ws://localhost:3001/api/v1/ws/status?environmentId=xxx&token=yyy
   */
  // fastify.get('/status', { websocket: true }, statusHandler);
}

// Export individual handlers for testing (currently disabled)
// export { logStreamHandler, terminalHandler, statusHandler };
