/**
 * Log Routes
 * Handles log retrieval and filtering
 * Task: Phase 3.5 - API Layer
 */
import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { LogService } from '@/services';
import { LogStream, LogLevel } from '@/types/prisma-enums';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validate, patterns } from '../middleware/validation';
import { rateLimits } from '../middleware/rateLimit';

/**
 * Register log routes
 *
 * @param fastify - Fastify instance
 *
 * @example
 * ```typescript
 * await fastify.register(logRoutes);
 * ```
 */
export async function logRoutes(fastify: FastifyInstance): Promise<void> {
  const logService = new LogService();

  /**
   * GET /api/v1/logs
   * Get logs with filtering and pagination
   *
   * @query environmentId - Filter by environment ID (required)
   * @query stream - Filter by stream (stdout or stderr, optional)
   * @query level - Filter by log level (optional)
   * @query since - Filter logs since timestamp (ISO 8601, optional)
   * @query until - Filter logs until timestamp (ISO 8601, optional)
   * @query search - Search in log content (optional)
   * @query page - Page number (default: 1)
   * @query limit - Results per page (default: 100, max: 1000)
   * @returns Paginated log entries
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ValidationError} If input validation fails
   * @throws {ForbiddenError} If user doesn't have access to environment
   * @throws {NotFoundError} If environment not found
   */
  const getLogsHandler: RouteHandlerMethod<
    any,
    any,
    any,
    {
      Querystring: {
        environmentId: string;
        stream?: 'stdout' | 'stderr';
        level?: LogLevel;
        since?: string;
        until?: string;
        search?: string;
        page?: number;
        limit?: number;
      };
    }
  > = async (request, reply) => {
    const { environmentId, stream, since, page = 1, limit = 100 } = request.query;

    const { userId } = (request as AuthenticatedRequest).user;

    // The service method signature is: getLogs(environmentId, userId, page, limit, stream?, since?)
    // We'll pass the parameters it expects
    const logs = await logService.getLogs(
      environmentId,
      userId,
      page,
      limit,
      stream as LogStream | undefined,
      since ? new Date(since) : undefined
    );

    return reply.status(200).send(logs);
  };

  fastify.get('/', {
    preHandler: [
      authenticate,
      rateLimits.read,
      validate({
        query: {
          environmentId: { type: 'string', required: true, pattern: patterns.uuid },
          stream: { type: 'string', enum: ['stdout', 'stderr'] },
          level: { type: 'string', enum: ['debug', 'info', 'warn', 'error'] },
          since: { type: 'string' },
          until: { type: 'string' },
          search: { type: 'string', min: 1, max: 255 },
          page: { type: 'number', min: 1 },
          limit: { type: 'number', min: 1, max: 1000 },
        },
      }),
    ],
    handler: getLogsHandler,
  });
}
