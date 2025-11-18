/**
 * Execution Routes
 * Handles code execution within sandbox environments
 * Mounted under /api/v1/environments/:environmentId/execute
 */

import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { ExecutionService } from '@/services';
import { authenticateFlexible } from '../middleware/api-key-auth';
import { requireScope } from '../middleware/api-key-auth';
import { AuthenticatedRequest } from '../middleware/auth';
import { validate, patterns } from '../middleware/validation';
import { rateLimits } from '../middleware/rateLimit';
import { NotFoundError, ForbiddenError, BadRequestError } from '@/lib/errors';
import {
  ExecuteCodeRequest,
  ExecuteCodeResponse,
  Execution as ExecutionDTO,
} from '@vibebox/types';
import { PrismaClient } from '@prisma/client';
import { WebSocketService } from '@/services';

const prisma = new PrismaClient();
const wsService = new WebSocketService();

/**
 * Verifies user has access to the environment
 *
 * @param environmentId - Environment ID
 * @param userId - User ID
 * @throws {NotFoundError} If environment not found
 * @throws {ForbiddenError} If user doesn't have access
 */
async function verifyEnvironmentAccess(
  environmentId: string,
  userId: string
): Promise<void> {
  const environment = await prisma.environment.findUnique({
    where: { id: environmentId },
    include: {
      project: {
        include: {
          team: {
            include: {
              userTeams: true,
            },
          },
        },
      },
    },
  });

  if (!environment) {
    throw new NotFoundError('Environment not found');
  }

  const isCreator = environment.creatorId === userId;
  const isTeamMember = environment.project.team?.userTeams.some(
    ut => ut.userId === userId
  );
  const isOwner = environment.project.ownerId === userId;

  if (!isCreator && !isTeamMember && !isOwner) {
    throw new ForbiddenError('You do not have access to this environment');
  }
}

/**
 * Converts Prisma Execution to DTO
 *
 * @param execution - Prisma Execution object
 * @returns Execution DTO
 */
function toExecutionDTO(execution: any): ExecutionDTO {
  return {
    id: execution.id,
    environmentId: execution.environmentId,
    userId: execution.userId,
    code: execution.code,
    language: execution.language,
    status: execution.status,
    stdout: execution.stdout || undefined,
    stderr: execution.stderr || undefined,
    exitCode: execution.exitCode || undefined,
    duration: execution.duration || undefined,
    timeout: execution.timeout,
    env: execution.env || undefined,
    startedAt: execution.startedAt?.toISOString(),
    completedAt: execution.completedAt?.toISOString(),
    createdAt: execution.createdAt.toISOString(),
  };
}

/**
 * Register execution routes
 * These routes are nested under environment routes
 *
 * @param fastify - Fastify instance
 */
export async function executionRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/environments/:environmentId/execute
   * Execute code in the sandbox
   *
   * @param environmentId - Environment ID
   * @body code - Code to execute
   * @body language - Programming language
   * @body timeout - Timeout in milliseconds (default: 30000)
   * @body env - Environment variables (optional)
   * @query stream - Whether to use WebSocket streaming (default: false)
   * @returns Execution result
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ForbiddenError} If user doesn't have access or missing execute scope
   * @throws {ValidationError} If input validation fails
   * @throws {BadRequestError} If language is not supported
   */
  const executeHandler: RouteHandlerMethod<
    any,
    any,
    any,
    {
      Params: { environmentId: string };
      Body: ExecuteCodeRequest;
      Querystring: { stream?: string };
    }
  > = async (request, reply) => {
    const { environmentId } = request.params;
    const currentUser = (request as AuthenticatedRequest).user;
    const useStreaming = request.query.stream === 'true';

    await verifyEnvironmentAccess(environmentId, currentUser.userId);

    // Validate language
    const supportedLanguages = ExecutionService.getSupportedLanguages();
    if (!supportedLanguages.includes(request.body.language.toLowerCase())) {
      throw new BadRequestError(
        `Unsupported language: ${request.body.language}. Supported: ${supportedLanguages.join(', ')}`
      );
    }

    if (useStreaming) {
      // Start streaming execution
      const executionId = await ExecutionService.executeCodeStreaming(
        environmentId,
        currentUser.userId,
        request.body,
        wsService
      );

      return reply.status(202).send({
        executionId,
        message: 'Execution started. Connect to WebSocket for real-time output.',
      });
    } else {
      // Synchronous execution
      const result = await ExecutionService.executeCode(
        environmentId,
        currentUser.userId,
        request.body
      );

      return reply.status(200).send(result);
    }
  };

  fastify.post('/', {
    preHandler: [
      authenticateFlexible,
      requireScope('execute'),
      rateLimits.intensive,
      validate({
        params: {
          environmentId: { type: 'string', required: true, pattern: patterns.uuid },
        },
        body: {
          code: { type: 'string', required: true, minLength: 1 },
          language: { type: 'string', required: true, minLength: 1 },
          timeout: { type: 'number', required: false, min: 1000, max: 300000 },
          env: { type: 'object', required: false },
        },
        query: {
          stream: { type: 'string', required: false },
        },
      }),
    ],
    handler: executeHandler,
  });

  /**
   * GET /api/v1/environments/:environmentId/execute/:executionId
   * Get execution details by ID
   *
   * @param environmentId - Environment ID
   * @param executionId - Execution ID
   * @returns Execution details
   */
  const getExecutionHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Params: { environmentId: string; executionId: string } }
  > = async (request, reply) => {
    const { environmentId, executionId } = request.params;
    const currentUser = (request as AuthenticatedRequest).user;

    await verifyEnvironmentAccess(environmentId, currentUser.userId);

    const execution = await ExecutionService.getExecution(executionId);

    if (!execution || execution.environmentId !== environmentId) {
      return reply.status(404).send({ error: 'Execution not found' });
    }

    return reply.status(200).send(toExecutionDTO(execution));
  };

  fastify.get('/:executionId', {
    preHandler: [
      authenticateFlexible,
      requireScope('read'),
      rateLimits.read,
      validate({
        params: {
          environmentId: { type: 'string', required: true, pattern: patterns.uuid },
          executionId: { type: 'string', required: true, pattern: patterns.uuid },
        },
      }),
    ],
    handler: getExecutionHandler,
  });

  /**
   * GET /api/v1/environments/:environmentId/execute
   * List executions for an environment
   *
   * @param environmentId - Environment ID
   * @query limit - Maximum number of results (default: 50)
   * @returns Array of executions
   */
  const listExecutionsHandler: RouteHandlerMethod<
    any,
    any,
    any,
    {
      Params: { environmentId: string };
      Querystring: { limit?: string };
    }
  > = async (request, reply) => {
    const { environmentId } = request.params;
    const currentUser = (request as AuthenticatedRequest).user;
    const limit = request.query.limit ? parseInt(request.query.limit, 10) : 50;

    await verifyEnvironmentAccess(environmentId, currentUser.userId);

    const executions = await ExecutionService.listExecutions(environmentId, limit);
    const dtoExecutions = executions.map(toExecutionDTO);

    return reply.status(200).send(dtoExecutions);
  };

  fastify.get('/', {
    preHandler: [
      authenticateFlexible,
      requireScope('read'),
      rateLimits.read,
      validate({
        params: {
          environmentId: { type: 'string', required: true, pattern: patterns.uuid },
        },
        query: {
          limit: { type: 'string', required: false },
        },
      }),
    ],
    handler: listExecutionsHandler,
  });

  /**
   * DELETE /api/v1/environments/:environmentId/execute/:executionId
   * Cancel a running execution
   *
   * @param environmentId - Environment ID
   * @param executionId - Execution ID
   * @returns Success message
   */
  const cancelExecutionHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Params: { environmentId: string; executionId: string } }
  > = async (request, reply) => {
    const { environmentId, executionId } = request.params;
    const currentUser = (request as AuthenticatedRequest).user;

    await verifyEnvironmentAccess(environmentId, currentUser.userId);

    const cancelled = await ExecutionService.cancelExecution(executionId);

    if (!cancelled) {
      return reply.status(404).send({
        error: 'Execution not found or not in running state',
      });
    }

    return reply.status(200).send({
      success: true,
      message: 'Execution cancelled',
    });
  };

  fastify.delete('/:executionId', {
    preHandler: [
      authenticateFlexible,
      requireScope('execute'),
      rateLimits.write,
      validate({
        params: {
          environmentId: { type: 'string', required: true, pattern: patterns.uuid },
          executionId: { type: 'string', required: true, pattern: patterns.uuid },
        },
      }),
    ],
    handler: cancelExecutionHandler,
  });

  /**
   * GET /api/v1/environments/:environmentId/execute/languages
   * Get supported programming languages
   *
   * @param environmentId - Environment ID
   * @returns Array of supported languages
   */
  const languagesHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Params: { environmentId: string } }
  > = async (request, reply) => {
    const { environmentId } = request.params;
    const currentUser = (request as AuthenticatedRequest).user;

    await verifyEnvironmentAccess(environmentId, currentUser.userId);

    const languages = ExecutionService.getSupportedLanguages();

    return reply.status(200).send({ languages });
  };

  fastify.get('/languages', {
    preHandler: [
      authenticateFlexible,
      requireScope('read'),
      rateLimits.read,
      validate({
        params: {
          environmentId: { type: 'string', required: true, pattern: patterns.uuid },
        },
      }),
    ],
    handler: languagesHandler,
  });
}
