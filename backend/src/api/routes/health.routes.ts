/**
 * Health Check Routes
 * Kubernetes-ready health check endpoints for production monitoring
 */
import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { PrismaClient } from '@prisma/client';
import Docker from 'dockerode';
import { getMetrics, getContentType } from '../../lib/metrics';

const prisma = new PrismaClient();
const docker = new Docker();

/**
 * Health check response interface
 */
interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks?: {
    database?: { status: 'up' | 'down'; latency?: number; error?: string };
    docker?: { status: 'up' | 'down'; error?: string };
  };
}

type HealthHandler = RouteHandlerMethod<any, any, any, { Reply: HealthCheckResponse }>;

/**
 * Register health check routes
 *
 * @param fastify - Fastify instance
 *
 * @example
 * ```typescript
 * import { healthRoutes } from './routes/health.routes';
 * await fastify.register(healthRoutes);
 * ```
 */
export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Basic health check endpoint
   * Returns 200 if the server is running
   * Used for basic uptime monitoring
   *
   * @route GET /health
   */
  const healthHandler: HealthHandler = async (_request, reply) => {
    return reply.send({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  };

  fastify.get('/', { handler: healthHandler });

  /**
   * Readiness probe endpoint
   * Checks if the server is ready to accept traffic
   * Validates database and Docker connectivity
   *
   * @route GET /health/ready
   */
  const readyHandler: HealthHandler = async (_request, reply) => {
    const checks: HealthCheckResponse['checks'] = {};
    let isHealthy = true;

    // Check database connectivity
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const dbLatency = Date.now() - dbStart;
      checks.database = { status: 'up', latency: dbLatency };
    } catch (error) {
      isHealthy = false;
      checks.database = {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Check Docker connectivity
    try {
      await docker.ping();
      checks.docker = { status: 'up' };
    } catch (error) {
      isHealthy = false;
      checks.docker = {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    const response: HealthCheckResponse = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    };

    return reply.status(isHealthy ? 200 : 503).send(response);
  };

  fastify.get('/ready', { handler: readyHandler });

  /**
   * Liveness probe endpoint
   * Checks if the server process is alive and not deadlocked
   * Performs minimal checks for fast response
   *
   * @route GET /health/live
   */
  const liveHandler: HealthHandler = async (_request, reply) => {
    // Basic liveness check - if we can respond, we're alive
    return reply.send({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  };

  fastify.get('/live', { handler: liveHandler });

  /**
   * Prometheus metrics endpoint
   * Exposes metrics in Prometheus format
   *
   * @route GET /health/metrics
   */
  const metricsHandler = async (_request: any, reply: any) => {
    const metrics = await getMetrics();
    return reply.type(getContentType()).send(metrics);
  };

  fastify.get('/metrics', { handler: metricsHandler });
}
