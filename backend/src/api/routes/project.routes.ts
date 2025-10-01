/**
 * Project Routes
 * Handles project CRUD operations
 * Task: Phase 3.5 - API Layer
 */
import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { ProjectService } from '@/services';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { requireProjectAccess, requireProjectOwner } from '../middleware/authorize';
import { validate, patterns } from '../middleware/validation';
import { rateLimits } from '../middleware/rateLimit';

/**
 * Register project routes
 *
 * @param fastify - Fastify instance
 *
 * @example
 * ```typescript
 * await fastify.register(projectRoutes);
 * ```
 */
export async function projectRoutes(fastify: FastifyInstance): Promise<void> {
  const projectService = new ProjectService();

  /**
   * POST /api/v1/projects
   * Create a new project
   *
   * @body name - Project name
   * @body slug - Project slug (unique identifier)
   * @body description - Project description (optional)
   * @body repositoryUrl - Git repository URL (optional)
   * @body teamId - Team ID (optional)
   * @returns Created project data
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ValidationError} If input validation fails
   * @throws {ConflictError} If slug already exists
   * @throws {ForbiddenError} If user doesn't have access to specified team
   */
  const createProjectHandler: RouteHandlerMethod<
    any,
    any,
    any,
    {
      Body: {
        name: string;
        slug: string;
        description?: string;
        repositoryUrl?: string;
        teamId?: string;
      };
    }
  > = async (request, reply) => {
    const { userId } = (request as AuthenticatedRequest).user;

    const project = await projectService.createProject(request.body, userId);

    return reply.status(201).send(project);
  };

  fastify.post('/', {
    preHandler: [
      authenticate,
      rateLimits.write,
      validate({
        body: {
          name: { type: 'string', required: true, min: 1, max: 100 },
          slug: { type: 'string', required: true, pattern: patterns.slug },
          description: { type: 'string', max: 1000 },
          repositoryUrl: { type: 'string', pattern: patterns.url },
          teamId: { type: 'string', pattern: patterns.uuid },
        },
      }),
    ],
    handler: createProjectHandler,
  });

  /**
   * GET /api/v1/projects/:projectId
   * Get project details by ID
   *
   * @param projectId - Project ID
   * @returns Project data
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ForbiddenError} If user doesn't have access to project
   * @throws {NotFoundError} If project not found
   */
  const getProjectHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Params: { projectId: string } }
  > = async (request, reply) => {
    const { projectId } = request.params;
    const { userId } = (request as AuthenticatedRequest).user;

    const project = await projectService.getProjectById(projectId, userId);

    return reply.status(200).send(project);
  };

  fastify.get('/:projectId', {
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
    handler: getProjectHandler,
  });

  /**
   * PATCH /api/v1/projects/:projectId
   * Update project details
   *
   * @param projectId - Project ID
   * @body name - Updated project name (optional)
   * @body slug - Updated project slug (optional)
   * @body description - Updated project description (optional)
   * @body repositoryUrl - Updated repository URL (optional)
   * @returns Updated project data
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ForbiddenError} If user is not project owner
   * @throws {NotFoundError} If project not found
   * @throws {ValidationError} If input validation fails
   */
  const updateProjectHandler: RouteHandlerMethod<
    any,
    any,
    any,
    {
      Params: { projectId: string };
      Body: {
        name?: string;
        slug?: string;
        description?: string | null;
        repositoryUrl?: string | null;
      };
    }
  > = async (request, reply) => {
    const { projectId } = request.params;
    const { userId } = (request as AuthenticatedRequest).user;

    const project = await projectService.updateProject(projectId, request.body, userId);

    return reply.status(200).send(project);
  };

  fastify.patch('/:projectId', {
    preHandler: [
      authenticate,
      rateLimits.write,
      validate({
        params: {
          projectId: { type: 'string', required: true, pattern: patterns.uuid },
        },
        body: {
          name: { type: 'string', min: 1, max: 100 },
          slug: { type: 'string', pattern: patterns.slug },
          description: { type: 'string', max: 1000 },
          repositoryUrl: { type: 'string', pattern: patterns.url },
        },
      }),
      requireProjectOwner,
    ],
    handler: updateProjectHandler,
  });

  /**
   * DELETE /api/v1/projects/:projectId
   * Delete a project
   *
   * @param projectId - Project ID
   * @returns Success message
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ForbiddenError} If user is not project owner
   * @throws {NotFoundError} If project not found
   */
  const deleteProjectHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Params: { projectId: string } }
  > = async (request, reply) => {
    const { projectId } = request.params;
    const { userId } = (request as AuthenticatedRequest).user;

    await projectService.deleteProject(projectId, userId);

    return reply.status(200).send({ message: 'Project deleted successfully' });
  };

  fastify.delete('/:projectId', {
    preHandler: [
      authenticate,
      rateLimits.write,
      validate({
        params: {
          projectId: { type: 'string', required: true, pattern: patterns.uuid },
        },
      }),
      requireProjectOwner,
    ],
    handler: deleteProjectHandler,
  });

  /**
   * GET /api/v1/projects
   * List all projects accessible to the authenticated user
   *
   * @query teamId - Filter by team ID (optional)
   * @returns Array of projects
   * @throws {UnauthorizedError} If not authenticated
   */
  const listProjectsHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Querystring: { teamId?: string } }
  > = async (request, reply) => {
    const { userId } = (request as AuthenticatedRequest).user;

    // listUserProjects expects (userId, includeArchived, page, limit)
    const projects = await projectService.listUserProjects(userId, false);

    return reply.status(200).send(projects);
  };

  fastify.get('/', {
    preHandler: [
      authenticate,
      rateLimits.read,
      validate({
        query: {
          teamId: { type: 'string', pattern: patterns.uuid },
        },
      }),
    ],
    handler: listProjectsHandler,
  });
}
