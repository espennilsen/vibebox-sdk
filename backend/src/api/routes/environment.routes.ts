/**
 * Environment Routes
 * Handles environment CRUD operations, lifecycle management, and configuration
 * Task: Phase 3.5 - API Layer
 */
import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { EnvironmentService } from '@/services';
import { Protocol } from '@/types/prisma-enums';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { requireEnvironmentAccess, requireProjectAccess } from '../middleware/authorize';
import { validate, patterns } from '../middleware/validation';
import { rateLimits } from '../middleware/rateLimit';

/**
 * Register environment routes
 *
 * @param fastify - Fastify instance
 *
 * @example
 * ```typescript
 * await fastify.register(environmentRoutes);
 * ```
 */
export async function environmentRoutes(fastify: FastifyInstance): Promise<void> {
  const environmentService = new EnvironmentService();

  /**
   * POST /api/v1/environments
   * Create a new environment
   *
   * @body name - Environment name
   * @body slug - Environment slug (unique identifier within project)
   * @body description - Environment description (optional)
   * @body projectId - Project ID
   * @body baseImage - Docker base image
   * @body cpuLimit - CPU limit (optional)
   * @body memoryLimit - Memory limit in MB (optional)
   * @body storageLimit - Storage limit in MB (optional)
   * @returns Created environment data
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ValidationError} If input validation fails
   * @throws {ConflictError} If slug already exists in project
   * @throws {ForbiddenError} If user doesn't have access to project
   */
  const createEnvironmentHandler: RouteHandlerMethod<
    any,
    any,
    any,
    {
      Body: {
        name: string;
        slug: string;
        description?: string;
        projectId: string;
        baseImage: string;
        cpuLimit?: number;
        memoryLimit?: number;
        storageLimit?: number;
      };
    }
  > = async (request, reply) => {
    const { userId } = (request as AuthenticatedRequest).user;

    const environment = await environmentService.createEnvironment(request.body, userId);

    return reply.status(201).send(environment);
  };

  fastify.post('/', {
    preHandler: [
      authenticate,
      rateLimits.intensive,
      validate({
        body: {
          name: { type: 'string', required: true, min: 1, max: 100 },
          slug: { type: 'string', required: true, pattern: patterns.slug },
          description: { type: 'string', max: 1000 },
          projectId: { type: 'string', required: true, pattern: patterns.uuid },
          baseImage: { type: 'string', required: true, min: 1, max: 255 },
          cpuLimit: { type: 'number', min: 0.1, max: 16 },
          memoryLimit: { type: 'number', min: 128, max: 32768 },
          storageLimit: { type: 'number', min: 1024, max: 102400 },
        },
      }),
    ],
    handler: createEnvironmentHandler,
  });

  /**
   * GET /api/v1/environments/:envId
   * Get environment details by ID
   *
   * @param envId - Environment ID
   * @returns Environment data
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ForbiddenError} If user doesn't have access to environment
   * @throws {NotFoundError} If environment not found
   */
  const getEnvironmentHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Params: { envId: string } }
  > = async (request, reply) => {
    const { envId } = request.params;
    const { userId } = (request as AuthenticatedRequest).user;

    const environment = await environmentService.getEnvironmentById(envId, userId);

    return reply.status(200).send(environment);
  };

  fastify.get('/:envId', {
    preHandler: [
      authenticate,
      rateLimits.read,
      validate({
        params: {
          envId: { type: 'string', required: true, pattern: patterns.uuid },
        },
      }),
      requireEnvironmentAccess,
    ],
    handler: getEnvironmentHandler,
  });

  /**
   * PATCH /api/v1/environments/:envId
   * Update environment details
   *
   * @param envId - Environment ID
   * @body name - Updated environment name (optional)
   * @body slug - Updated environment slug (optional)
   * @body description - Updated environment description (optional)
   * @body cpuLimit - Updated CPU limit (optional)
   * @body memoryLimit - Updated memory limit (optional)
   * @body storageLimit - Updated storage limit (optional)
   * @returns Updated environment data
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ForbiddenError} If user doesn't have access to environment
   * @throws {NotFoundError} If environment not found
   * @throws {ValidationError} If input validation fails
   */
  const updateEnvironmentHandler: RouteHandlerMethod<
    any,
    any,
    any,
    {
      Params: { envId: string };
      Body: {
        name?: string;
        slug?: string;
        description?: string | null;
        cpuLimit?: number;
        memoryLimit?: number;
        storageLimit?: number;
      };
    }
  > = async (request, reply) => {
    const { envId } = request.params;
    const { userId } = (request as AuthenticatedRequest).user;

    const environment = await environmentService.updateEnvironment(envId, request.body, userId);

    return reply.status(200).send(environment);
  };

  fastify.patch('/:envId', {
    preHandler: [
      authenticate,
      rateLimits.write,
      validate({
        params: {
          envId: { type: 'string', required: true, pattern: patterns.uuid },
        },
        body: {
          name: { type: 'string', min: 1, max: 100 },
          slug: { type: 'string', pattern: patterns.slug },
          description: { type: 'string', max: 1000 },
          cpuLimit: { type: 'number', min: 0.1, max: 16 },
          memoryLimit: { type: 'number', min: 128, max: 32768 },
          storageLimit: { type: 'number', min: 1024, max: 102400 },
        },
      }),
      requireEnvironmentAccess,
    ],
    handler: updateEnvironmentHandler,
  });

  /**
   * DELETE /api/v1/environments/:envId
   * Delete an environment
   *
   * @param envId - Environment ID
   * @returns Success message
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ForbiddenError} If user doesn't have access to environment
   * @throws {NotFoundError} If environment not found
   */
  const deleteEnvironmentHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Params: { envId: string } }
  > = async (request, reply) => {
    const { envId } = request.params;
    const { userId } = (request as AuthenticatedRequest).user;

    await environmentService.deleteEnvironment(envId, userId);

    return reply.status(200).send({ message: 'Environment deleted successfully' });
  };

  fastify.delete('/:envId', {
    preHandler: [
      authenticate,
      rateLimits.write,
      validate({
        params: {
          envId: { type: 'string', required: true, pattern: patterns.uuid },
        },
      }),
      requireEnvironmentAccess,
    ],
    handler: deleteEnvironmentHandler,
  });

  /**
   * POST /api/v1/environments/:envId/start
   * Start an environment
   *
   * @param envId - Environment ID
   * @returns Updated environment data with running status
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ForbiddenError} If user doesn't have access to environment
   * @throws {NotFoundError} If environment not found
   * @throws {BadRequestError} If environment is already running
   */
  const startEnvironmentHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Params: { envId: string } }
  > = async (request, reply) => {
    const { envId } = request.params;
    const { userId } = (request as AuthenticatedRequest).user;

    const environment = await environmentService.startEnvironment(envId, userId);

    return reply.status(200).send(environment);
  };

  fastify.post('/:envId/start', {
    preHandler: [
      authenticate,
      rateLimits.intensive,
      validate({
        params: {
          envId: { type: 'string', required: true, pattern: patterns.uuid },
        },
      }),
      requireEnvironmentAccess,
    ],
    handler: startEnvironmentHandler,
  });

  /**
   * POST /api/v1/environments/:envId/stop
   * Stop an environment
   *
   * @param envId - Environment ID
   * @returns Updated environment data with stopped status
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ForbiddenError} If user doesn't have access to environment
   * @throws {NotFoundError} If environment not found
   * @throws {BadRequestError} If environment is not running
   */
  const stopEnvironmentHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Params: { envId: string } }
  > = async (request, reply) => {
    const { envId } = request.params;
    const { userId } = (request as AuthenticatedRequest).user;

    const environment = await environmentService.stopEnvironment(envId, userId);

    return reply.status(200).send(environment);
  };

  fastify.post('/:envId/stop', {
    preHandler: [
      authenticate,
      rateLimits.intensive,
      validate({
        params: {
          envId: { type: 'string', required: true, pattern: patterns.uuid },
        },
      }),
      requireEnvironmentAccess,
    ],
    handler: stopEnvironmentHandler,
  });

  /**
   * POST /api/v1/environments/:envId/restart
   * Restart an environment
   *
   * @param envId - Environment ID
   * @returns Updated environment data with running status
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ForbiddenError} If user doesn't have access to environment
   * @throws {NotFoundError} If environment not found
   */
  const restartEnvironmentHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Params: { envId: string } }
  > = async (request, reply) => {
    const { envId } = request.params;
    const { userId } = (request as AuthenticatedRequest).user;

    const environment = await environmentService.restartEnvironment(envId, userId);

    return reply.status(200).send(environment);
  };

  fastify.post('/:envId/restart', {
    preHandler: [
      authenticate,
      rateLimits.intensive,
      validate({
        params: {
          envId: { type: 'string', required: true, pattern: patterns.uuid },
        },
      }),
      requireEnvironmentAccess,
    ],
    handler: restartEnvironmentHandler,
  });

  /**
   * GET /api/v1/environments/:envId/status
   * Get environment status
   *
   * @param envId - Environment ID
   * @returns Environment status including container state and uptime
   * @throws {NotFoundError} If environment not found
   */
  const getEnvironmentStatusHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Params: { envId: string } }
  > = async (request, reply) => {
    const { envId } = request.params;
    const status = await environmentService.getEnvironmentStatus(envId);
    return reply.status(200).send(status);
  };

  fastify.get('/:envId/status', {
    preHandler: [
      authenticate,
      rateLimits.read,
      validate({
        params: {
          envId: { type: 'string', required: true, pattern: patterns.uuid },
        },
      }),
      requireEnvironmentAccess,
    ],
    handler: getEnvironmentStatusHandler,
  });

  /**
   * GET /api/v1/environments/:envId/stats
   * Get environment statistics
   *
   * @param envId - Environment ID
   * @returns Environment resource usage statistics
   * @throws {NotFoundError} If environment not found
   * @throws {ForbiddenError} If user lacks access
   */
  const getEnvironmentStatsHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Params: { envId: string } }
  > = async (request, reply) => {
    const { envId } = request.params;
    const { userId } = (request as AuthenticatedRequest).user;
    const stats = await environmentService.getEnvironmentStats(envId, userId);
    return reply.status(200).send(stats);
  };

  fastify.get('/:envId/stats', {
    preHandler: [
      authenticate,
      rateLimits.read,
      validate({
        params: {
          envId: { type: 'string', required: true, pattern: patterns.uuid },
        },
      }),
      requireEnvironmentAccess,
    ],
    handler: getEnvironmentStatsHandler,
  });

  /**
   * GET /api/v1/projects/:projectId/environments
   * List all environments in a project
   *
   * @param projectId - Project ID
   * @returns Array of environments
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ForbiddenError} If user doesn't have access to project
   * @throws {NotFoundError} If project not found
   */
  const listEnvironmentsHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Params: { projectId: string } }
  > = async (request, reply) => {
    const { projectId } = request.params;
    const { userId } = (request as AuthenticatedRequest).user;

    const environments = await environmentService.listEnvironments(projectId, userId);

    return reply.status(200).send(environments);
  };

  fastify.get('/projects/:projectId/environments', {
    preHandler: [
      authenticate,
      rateLimits.read,
      validate({
        params: {
          projectId: { type: 'string', required: true, pattern: patterns.uuid },
        },
      }),
      requireProjectAccess,
    ],
    handler: listEnvironmentsHandler,
  });

  /**
   * POST /api/v1/environments/:envId/ports
   * Add a port mapping to an environment
   *
   * @param envId - Environment ID
   * @body containerPort - Container port number
   * @body hostPort - Host port number (optional)
   * @body protocol - Protocol (tcp or udp, default: tcp)
   * @body description - Port description (optional)
   * @returns Success message with port mapping
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ForbiddenError} If user doesn't have access to environment
   * @throws {NotFoundError} If environment not found
   * @throws {ConflictError} If port mapping already exists
   */
  const addPortHandler: RouteHandlerMethod<
    any,
    any,
    any,
    {
      Params: { envId: string };
      Body: {
        containerPort: number;
        hostPort?: number;
        protocol?: Protocol;
        description?: string;
      };
    }
  > = async (request, reply) => {
    const { envId } = request.params;
    const { userId } = (request as AuthenticatedRequest).user;
    const portMapping = request.body;

    await environmentService.addPort(envId, portMapping, userId);

    return reply.status(201).send({ message: 'Port mapping added successfully', portMapping });
  };

  fastify.post('/:envId/ports', {
    preHandler: [
      authenticate,
      rateLimits.write,
      validate({
        params: {
          envId: { type: 'string', required: true, pattern: patterns.uuid },
        },
        body: {
          containerPort: { type: 'number', required: true, min: 1, max: 65535 },
          hostPort: { type: 'number', min: 1, max: 65535 },
          protocol: { type: 'string', enum: ['tcp', 'udp'] },
          description: { type: 'string', max: 255 },
        },
      }),
      requireEnvironmentAccess,
    ],
    handler: addPortHandler,
  });

  /**
   * DELETE /api/v1/environments/:envId/ports/:port
   * Remove a port mapping from an environment
   *
   * @param envId - Environment ID
   * @param port - Container port number to remove
   * @returns Success message
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ForbiddenError} If user doesn't have access to environment
   * @throws {NotFoundError} If environment or port mapping not found
   */
  const removePortHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Params: { envId: string; port: string } }
  > = async (request, reply) => {
    const { envId, port } = request.params;
    const { userId } = (request as AuthenticatedRequest).user;
    const containerPort = parseInt(port, 10);

    await environmentService.removePort(envId, containerPort, userId);
    return reply.status(200).send({ message: 'Port mapping removed successfully' });
  };

  fastify.delete('/:envId/ports/:port', {
    preHandler: [
      authenticate,
      rateLimits.write,
      validate({
        params: {
          envId: { type: 'string', required: true, pattern: patterns.uuid },
          port: { type: 'number', required: true, min: 1, max: 65535 },
        },
      }),
      requireEnvironmentAccess,
    ],
    handler: removePortHandler,
  });

  /**
   * POST /api/v1/environments/:envId/variables
   * Add an environment variable
   *
   * @param envId - Environment ID
   * @body key - Variable key
   * @body value - Variable value
   * @body isEncrypted - Whether to encrypt the value (optional)
   * @returns Success message
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ForbiddenError} If user doesn't have access to environment
   * @throws {NotFoundError} If environment not found
   * @throws {ConflictError} If variable key already exists
   */
  const setVariableHandler: RouteHandlerMethod<
    any,
    any,
    any,
    {
      Params: { envId: string };
      Body: {
        key: string;
        value: string;
        isEncrypted?: boolean;
      };
    }
  > = async (request, reply) => {
    const { envId } = request.params;
    const { userId } = (request as AuthenticatedRequest).user;
    const variable = request.body;

    await environmentService.setVariable(envId, variable, userId);

    return reply.status(201).send({ message: 'Environment variable added successfully' });
  };

  fastify.post('/:envId/variables', {
    preHandler: [
      authenticate,
      rateLimits.write,
      validate({
        params: {
          envId: { type: 'string', required: true, pattern: patterns.uuid },
        },
        body: {
          key: { type: 'string', required: true, min: 1, max: 255 },
          value: { type: 'string', required: true, max: 4096 },
          isEncrypted: { type: 'boolean' },
        },
      }),
      requireEnvironmentAccess,
    ],
    handler: setVariableHandler,
  });

  /**
   * DELETE /api/v1/environments/:envId/variables/:key
   * Remove an environment variable
   *
   * @param envId - Environment ID
   * @param key - Variable key to remove
   * @returns Success message
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ForbiddenError} If user doesn't have access to environment
   * @throws {NotFoundError} If environment or variable not found
   */
  const removeVariableHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Params: { envId: string; key: string } }
  > = async (request, reply) => {
    const { envId, key } = request.params;
    const { userId } = (request as AuthenticatedRequest).user;

    await environmentService.removeEnvironmentVariable(envId, key, userId);
    return reply.status(200).send({ message: 'Environment variable removed successfully' });
  };

  fastify.delete('/:envId/variables/:key', {
    preHandler: [
      authenticate,
      rateLimits.write,
      validate({
        params: {
          envId: { type: 'string', required: true, pattern: patterns.uuid },
          key: { type: 'string', required: true, min: 1, max: 255 },
        },
      }),
      requireEnvironmentAccess,
    ],
    handler: removeVariableHandler,
  });
}
