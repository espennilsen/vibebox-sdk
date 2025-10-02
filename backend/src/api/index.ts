/**
 * API Routes Index
 * Central registration point for all REST and WebSocket routes
 * Task: Phase 3.5 - API Layer
 */
import { FastifyInstance } from 'fastify';
import { authRoutes } from './routes/auth.routes';
import { userRoutes } from './routes/user.routes';
import { teamRoutes } from './routes/team.routes';
import { projectRoutes } from './routes/project.routes';
import { environmentRoutes } from './routes/environment.routes';
import { sessionRoutes } from './routes/session.routes';
import { extensionRoutes } from './routes/extension.routes';
import { logRoutes } from './routes/log.routes';
import { healthRoutes } from './routes/health.routes';
import { metricsRoutes } from './routes/metrics.routes';
import { registerWebSocketRoutes } from './websocket';
import { metricsPlugin } from '../lib/metrics';

/**
 * Register all API routes (REST and WebSocket)
 *
 * @param fastify - Fastify instance
 *
 * @example
 * ```typescript
 * import { registerRoutes } from './api';
 * await fastify.register(registerRoutes);
 * ```
 */
export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  // Register metrics plugin for automatic HTTP metrics collection
  await fastify.register(metricsPlugin);

  // Health check routes (no authentication required)
  await fastify.register(healthRoutes, { prefix: '/health' });

  // API v1 routes
  await fastify.register(
    async (api) => {
      // Authentication routes
      await api.register(authRoutes, { prefix: '/auth' });

      // User routes
      await api.register(userRoutes, { prefix: '/users' });

      // Team routes
      await api.register(teamRoutes, { prefix: '/teams' });

      // Project routes
      await api.register(projectRoutes, { prefix: '/projects' });

      // Environment routes
      await api.register(environmentRoutes, { prefix: '/environments' });

      // Session routes
      await api.register(sessionRoutes, { prefix: '/sessions' });

      // Extension routes
      await api.register(extensionRoutes, { prefix: '/extensions' });

      // Log routes
      await api.register(logRoutes, { prefix: '/logs' });

      // Metrics routes (protected)
      await api.register(metricsRoutes, { prefix: '/metrics' });
    },
    { prefix: '/api/v1' }
  );

  // WebSocket routes
  await fastify.register(registerWebSocketRoutes, { prefix: '/api/v1/ws' });
}

// Export route modules for testing
export {
  authRoutes,
  userRoutes,
  teamRoutes,
  projectRoutes,
  environmentRoutes,
  sessionRoutes,
  extensionRoutes,
  logRoutes,
  healthRoutes,
  metricsRoutes,
  registerWebSocketRoutes,
};
