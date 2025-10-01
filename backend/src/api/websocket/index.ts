/**
 * WebSocket Routes Index
 * Central export point for all WebSocket handlers with JWT authentication
 * Task: Phase 3.5 - API Layer
 */
import { FastifyInstance } from 'fastify';
import { logStreamHandler } from './logStream';
import { terminalHandler } from './terminal';
import { statusHandler } from './status';

/**
 * Register all WebSocket routes
 *
 * Registers three WebSocket endpoints for real-time communication:
 * - Log streaming: Real-time Docker container logs
 * - Terminal: Interactive terminal sessions
 * - Status: Environment status updates
 *
 * All routes require JWT authentication via query string token parameter.
 *
 * @param fastify - Fastify instance with websocket plugin registered
 *
 * @example
 * ```typescript
 * // In server.ts
 * await fastify.register(require('@fastify/websocket'));
 * await fastify.register(registerWebSocketRoutes, { prefix: '/api/v1/ws' });
 *
 * // Client usage
 * const token = 'your-jwt-token';
 * const ws = new WebSocket(`ws://localhost:3000/api/v1/ws/logs?environmentId=123&token=${token}`);
 * ```
 */
export async function registerWebSocketRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * WebSocket route for log streaming
   * Streams real-time Docker container logs for an environment
   *
   * @route GET /logs
   * @query environmentId - Environment ID (required)
   * @query token - JWT authentication token (required)
   *
   * @example ws://localhost:3000/api/v1/ws/logs?environmentId=abc123&token=eyJhbGc...
   */
  fastify.get('/logs', { websocket: true }, logStreamHandler);

  /**
   * WebSocket route for terminal sessions
   * Provides interactive terminal access to running containers
   *
   * @route GET /terminal
   * @query sessionId - Terminal session ID (required)
   * @query token - JWT authentication token (required)
   *
   * @example ws://localhost:3000/api/v1/ws/terminal?sessionId=xyz789&token=eyJhbGc...
   */
  fastify.get('/terminal', { websocket: true }, terminalHandler);

  /**
   * WebSocket route for environment status updates
   * Polls and broadcasts environment status every 5 seconds
   *
   * @route GET /status
   * @query environmentId - Environment ID (required)
   * @query token - JWT authentication token (required)
   *
   * @example ws://localhost:3000/api/v1/ws/status?environmentId=abc123&token=eyJhbGc...
   */
  fastify.get('/status', { websocket: true }, statusHandler);
}

// Export individual handlers for testing
export { logStreamHandler, terminalHandler, statusHandler };
