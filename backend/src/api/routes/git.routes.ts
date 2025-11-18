/**
 * Git Routes
 * Handles git operations for sandboxes
 * Mounted under /api/v1/environments/:environmentId/git
 */

import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { GitService } from '@/services';
import { authenticateFlexible } from '../middleware/api-key-auth';
import { requireScope } from '../middleware/api-key-auth';
import { AuthenticatedRequest } from '../middleware/auth';
import { validate, patterns } from '../middleware/validation';
import { rateLimits } from '../middleware/rateLimit';
import { NotFoundError, ForbiddenError } from '@/lib/errors';
import {
  GitCloneRequest,
  GitCloneResponse,
  GitPullRequest,
  GitPullResponse,
  GitPushRequest,
  GitPushResponse,
  GitCommitRequest,
  GitCommitResponse,
  GitCheckoutRequest,
  GitCheckoutResponse,
  GitStatusResponse,
  GitDiffResponse,
} from '@vibebox/types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

  // Check if user is creator or team member
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
 * Register git routes
 * These routes are nested under environment routes as /environments/:environmentId/git
 *
 * @param fastify - Fastify instance
 */
export async function gitRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/environments/:environmentId/git/clone
   * Clone a git repository into the sandbox
   *
   * @param environmentId - Environment ID
   * @body url - Repository URL
   * @body branch - Branch to clone (default: main)
   * @body path - Path to clone into (default: /repo)
   * @body depth - Shallow clone depth (optional)
   * @body auth - Authentication config (optional)
   * @returns Clone result
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ForbiddenError} If user doesn't have access
   * @throws {ValidationError} If input validation fails
   */
  const cloneHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Params: { environmentId: string }; Body: GitCloneRequest }
  > = async (request, reply) => {
    const { environmentId } = request.params;
    const currentUser = (request as AuthenticatedRequest).user;

    await verifyEnvironmentAccess(environmentId, currentUser.userId);

    const result = await GitService.cloneRepository(environmentId, request.body);

    return reply.status(200).send(result);
  };

  fastify.post('/clone', {
    preHandler: [
      authenticateFlexible,
      requireScope('write'),
      rateLimits.write,
      validate({
        params: {
          environmentId: { type: 'string', required: true, pattern: patterns.uuid },
        },
        body: {
          url: { type: 'string', required: true },
          branch: { type: 'string', required: false },
          path: { type: 'string', required: false },
          depth: { type: 'number', required: false },
          auth: { type: 'object', required: false },
        },
      }),
    ],
    handler: cloneHandler,
  });

  /**
   * POST /api/v1/environments/:environmentId/git/pull
   * Pull latest changes from remote
   *
   * @param environmentId - Environment ID
   * @body remote - Remote name (default: origin)
   * @body branch - Branch to pull (optional)
   * @returns Pull result
   */
  const pullHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Params: { environmentId: string }; Body: GitPullRequest }
  > = async (request, reply) => {
    const { environmentId } = request.params;
    const currentUser = (request as AuthenticatedRequest).user;

    await verifyEnvironmentAccess(environmentId, currentUser.userId);

    const result = await GitService.pullChanges(environmentId, request.body);

    return reply.status(200).send(result);
  };

  fastify.post('/pull', {
    preHandler: [
      authenticateFlexible,
      requireScope('write'),
      rateLimits.write,
      validate({
        params: {
          environmentId: { type: 'string', required: true, pattern: patterns.uuid },
        },
        body: {
          remote: { type: 'string', required: false },
          branch: { type: 'string', required: false },
        },
      }),
    ],
    handler: pullHandler,
  });

  /**
   * POST /api/v1/environments/:environmentId/git/push
   * Push local commits to remote
   *
   * @param environmentId - Environment ID
   * @body remote - Remote name (default: origin)
   * @body branch - Branch to push (optional)
   * @body force - Force push (default: false)
   * @returns Push result
   */
  const pushHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Params: { environmentId: string }; Body: GitPushRequest }
  > = async (request, reply) => {
    const { environmentId } = request.params;
    const currentUser = (request as AuthenticatedRequest).user;

    await verifyEnvironmentAccess(environmentId, currentUser.userId);

    const result = await GitService.pushChanges(environmentId, request.body);

    return reply.status(200).send(result);
  };

  fastify.post('/push', {
    preHandler: [
      authenticateFlexible,
      requireScope('write'),
      rateLimits.write,
      validate({
        params: {
          environmentId: { type: 'string', required: true, pattern: patterns.uuid },
        },
        body: {
          remote: { type: 'string', required: false },
          branch: { type: 'string', required: false },
          force: { type: 'boolean', required: false },
        },
      }),
    ],
    handler: pushHandler,
  });

  /**
   * POST /api/v1/environments/:environmentId/git/commit
   * Commit changes
   *
   * @param environmentId - Environment ID
   * @body message - Commit message
   * @body files - Files to commit (optional, commits all if not specified)
   * @body author - Author info (optional)
   * @returns Commit result
   */
  const commitHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Params: { environmentId: string }; Body: GitCommitRequest }
  > = async (request, reply) => {
    const { environmentId } = request.params;
    const currentUser = (request as AuthenticatedRequest).user;

    await verifyEnvironmentAccess(environmentId, currentUser.userId);

    const result = await GitService.commitChanges(environmentId, request.body);

    return reply.status(200).send(result);
  };

  fastify.post('/commit', {
    preHandler: [
      authenticateFlexible,
      requireScope('write'),
      rateLimits.write,
      validate({
        params: {
          environmentId: { type: 'string', required: true, pattern: patterns.uuid },
        },
        body: {
          message: { type: 'string', required: true, minLength: 1 },
          files: { type: 'array', required: false, items: { type: 'string' } },
          author: { type: 'object', required: false },
        },
      }),
    ],
    handler: commitHandler,
  });

  /**
   * POST /api/v1/environments/:environmentId/git/checkout
   * Checkout a branch
   *
   * @param environmentId - Environment ID
   * @body branch - Branch name
   * @body create - Create new branch (default: false)
   * @returns Checkout result
   */
  const checkoutHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Params: { environmentId: string }; Body: GitCheckoutRequest }
  > = async (request, reply) => {
    const { environmentId } = request.params;
    const currentUser = (request as AuthenticatedRequest).user;

    await verifyEnvironmentAccess(environmentId, currentUser.userId);

    const result = await GitService.checkoutBranch(environmentId, request.body);

    return reply.status(200).send(result);
  };

  fastify.post('/checkout', {
    preHandler: [
      authenticateFlexible,
      requireScope('write'),
      rateLimits.write,
      validate({
        params: {
          environmentId: { type: 'string', required: true, pattern: patterns.uuid },
        },
        body: {
          branch: { type: 'string', required: true, minLength: 1 },
          create: { type: 'boolean', required: false },
        },
      }),
    ],
    handler: checkoutHandler,
  });

  /**
   * GET /api/v1/environments/:environmentId/git/status
   * Get git status
   *
   * @param environmentId - Environment ID
   * @returns Git status
   */
  const statusHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Params: { environmentId: string } }
  > = async (request, reply) => {
    const { environmentId } = request.params;
    const currentUser = (request as AuthenticatedRequest).user;

    await verifyEnvironmentAccess(environmentId, currentUser.userId);

    const result = await GitService.getStatus(environmentId);

    return reply.status(200).send(result);
  };

  fastify.get('/status', {
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
    handler: statusHandler,
  });

  /**
   * GET /api/v1/environments/:environmentId/git/diff
   * Get git diff
   *
   * @param environmentId - Environment ID
   * @returns Git diff
   */
  const diffHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Params: { environmentId: string } }
  > = async (request, reply) => {
    const { environmentId } = request.params;
    const currentUser = (request as AuthenticatedRequest).user;

    await verifyEnvironmentAccess(environmentId, currentUser.userId);

    const result = await GitService.getDiff(environmentId);

    return reply.status(200).send(result);
  };

  fastify.get('/diff', {
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
    handler: diffHandler,
  });

  /**
   * GET /api/v1/environments/:environmentId/git/config
   * Get git configuration for the environment
   *
   * @param environmentId - Environment ID
   * @returns Git config (without sensitive auth token)
   */
  const configHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Params: { environmentId: string } }
  > = async (request, reply) => {
    const { environmentId } = request.params;
    const currentUser = (request as AuthenticatedRequest).user;

    await verifyEnvironmentAccess(environmentId, currentUser.userId);

    const config = await GitService.getGitConfig(environmentId);

    if (!config) {
      return reply.status(404).send({ error: 'No git repository configured' });
    }

    // Remove sensitive auth token from response
    const { authToken, ...safeConfig } = config;

    return reply.status(200).send(safeConfig);
  };

  fastify.get('/config', {
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
    handler: configHandler,
  });
}
