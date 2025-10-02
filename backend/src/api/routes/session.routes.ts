/**
 * Session Routes
 * Handles terminal session CRUD operations
 * Task: Phase 3.5 - API Layer
 */
import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { SessionService } from '@/services';
import { SessionType } from '@/types/prisma-enums';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { requireEnvironmentAccess } from '../middleware/authorize';
import { validate, patterns } from '../middleware/validation';
import { rateLimits } from '../middleware/rateLimit';

/**
 * Register session routes
 *
 * @param fastify - Fastify instance
 *
 * @example
 * ```typescript
 * await fastify.register(sessionRoutes);
 * ```
 */
export async function sessionRoutes(fastify: FastifyInstance): Promise<void> {
  const sessionService = new SessionService();

  /**
   * POST /api/v1/sessions
   * Create a new terminal session
   *
   * @body environmentId - Environment ID
   * @body type - Session type (bash, zsh, or tmux)
   * @body tmuxSessionName - tmux session name (required if type is tmux)
   * @returns Created session data
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ValidationError} If input validation fails
   * @throws {ForbiddenError} If user doesn't have access to environment
   * @throws {NotFoundError} If environment not found
   */
  const createSessionHandler: RouteHandlerMethod<
    any,
    any,
    any,
    {
      Body: {
        environmentId: string;
        type: SessionType;
        tmuxSessionName?: string;
      };
    }
  > = async (request, reply) => {
    const { userId } = (request as AuthenticatedRequest).user;
    const { environmentId, type, tmuxSessionName } = request.body;

    // Validate tmux session name is provided for tmux type
    if (type === SessionType.tmux && !tmuxSessionName) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tmuxSessionName is required for tmux session type',
          statusCode: 400,
        },
      });
    }

    const session = await sessionService.createSession(
      {
        environmentId,
        sessionType: type,
        sessionName: tmuxSessionName || `${type}-session`,
      },
      userId
    );

    return reply.status(201).send(session);
  };

  fastify.post('/', {
    preHandler: [
      authenticate,
      rateLimits.write,
      validate({
        body: {
          environmentId: { type: 'string', required: true, pattern: patterns.uuid },
          type: { type: 'string', required: true, enum: ['bash', 'zsh', 'tmux'] },
          tmuxSessionName: { type: 'string', min: 1, max: 100 },
        },
      }),
    ],
    handler: createSessionHandler,
  });

  /**
   * GET /api/v1/sessions/:sessionId
   * Get session details by ID
   *
   * @param sessionId - Session ID
   * @returns Session data
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ForbiddenError} If user doesn't have access to session's environment
   * @throws {NotFoundError} If session not found
   */
  const getSessionHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Params: { sessionId: string } }
  > = async (request, reply) => {
    const { sessionId } = request.params;
    const { userId } = (request as AuthenticatedRequest).user;
    const session = await sessionService.getSessionById(sessionId, userId);
    return reply.status(200).send(session);
  };

  fastify.get('/:sessionId', {
    preHandler: [
      authenticate,
      rateLimits.read,
      validate({
        params: {
          sessionId: { type: 'string', required: true, pattern: patterns.uuid },
        },
      }),
    ],
    handler: getSessionHandler,
  });

  /**
   * DELETE /api/v1/sessions/:sessionId
   * Terminate a session
   *
   * @param sessionId - Session ID
   * @returns Success message
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ForbiddenError} If user doesn't have access to session's environment
   * @throws {NotFoundError} If session not found
   */
  const terminateSessionHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Params: { sessionId: string } }
  > = async (request, reply) => {
    const { sessionId } = request.params;
    const { userId } = (request as AuthenticatedRequest).user;
    await sessionService.terminateSession(sessionId, userId);
    return reply.status(200).send({ message: 'Session terminated successfully' });
  };

  fastify.delete('/:sessionId', {
    preHandler: [
      authenticate,
      rateLimits.write,
      validate({
        params: {
          sessionId: { type: 'string', required: true, pattern: patterns.uuid },
        },
      }),
    ],
    handler: terminateSessionHandler,
  });

  /**
   * GET /api/v1/environments/:envId/sessions
   * List all sessions in an environment
   *
   * @param envId - Environment ID
   * @query active - Filter by active status (optional)
   * @returns Array of sessions
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ForbiddenError} If user doesn't have access to environment
   * @throws {NotFoundError} If environment not found
   */
  const listSessionsHandler: RouteHandlerMethod<
    any,
    any,
    any,
    {
      Params: { envId: string };
      Querystring: { active?: boolean };
    }
  > = async (request, reply) => {
    const { envId } = request.params;
    const { userId } = (request as AuthenticatedRequest).user;
    const sessions = await sessionService.listSessions(envId, userId);
    return reply.status(200).send(sessions);
  };

  fastify.get('/environments/:envId/sessions', {
    preHandler: [
      authenticate,
      rateLimits.read,
      validate({
        params: {
          envId: { type: 'string', required: true, pattern: patterns.uuid },
        },
        query: {
          active: { type: 'boolean' },
        },
      }),
      requireEnvironmentAccess,
    ],
    handler: listSessionsHandler,
  });
}
