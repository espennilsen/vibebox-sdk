/**
 * Metrics Routes
 * Protected endpoint for Prometheus metrics export
 * Task: GitHub Issue #7 - Performance Monitoring
 */
import { FastifyInstance } from 'fastify';
import { getMetrics, getContentType } from '../../lib/metrics';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

/**
 * Register metrics routes
 *
 * @param fastify - Fastify instance
 *
 * @example
 * ```typescript
 * import { metricsRoutes } from './routes/metrics.routes';
 * await fastify.register(metricsRoutes, { prefix: '/metrics' });
 * ```
 */
export function metricsRoutes(fastify: FastifyInstance): void {
  /**
   * Get Prometheus metrics
   * Protected endpoint that requires authentication
   * Returns metrics in Prometheus text format
   *
   * @route GET /metrics
   * @security JWT
   * @returns {string} Prometheus metrics in text format
   *
   * @example
   * ```bash
   * curl -H "Authorization: Bearer <token>" http://localhost:3000/api/v1/metrics
   * ```
   */
  fastify.get(
    '/',
    {
      preHandler: [authenticate, authorize(['admin', 'developer'])],
      schema: {
        description: 'Get Prometheus metrics',
        tags: ['metrics'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Prometheus metrics in text format',
            type: 'string',
          },
          401: {
            description: 'Unauthorized - Missing or invalid token',
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          403: {
            description: 'Forbidden - Insufficient permissions',
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      const metrics = await getMetrics();
      return reply.type(getContentType()).send(metrics);
    }
  );
}
