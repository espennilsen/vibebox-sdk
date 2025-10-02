/**
 * Team Routes
 * Handles team CRUD operations and member management
 * Task: Phase 3.5 - API Layer
 */
import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { TeamService } from '@/services';
import { UserTeamRole } from '@/types/prisma-enums';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { requireTeamMember, requireTeamAdmin } from '../middleware/authorize';
import { validate, patterns } from '../middleware/validation';
import { rateLimits } from '../middleware/rateLimit';

/**
 * Register team routes
 *
 * @param fastify - Fastify instance
 *
 * @example
 * ```typescript
 * await fastify.register(teamRoutes);
 * ```
 */
export async function teamRoutes(fastify: FastifyInstance): Promise<void> {
  const teamService = new TeamService();

  /**
   * POST /api/v1/teams
   * Create a new team
   *
   * @body name - Team name
   * @body slug - Team slug (unique identifier)
   * @body description - Team description (optional)
   * @body avatarUrl - Team avatar URL (optional)
   * @returns Created team data
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ValidationError} If input validation fails
   * @throws {ConflictError} If slug already exists
   */
  const createTeamHandler: RouteHandlerMethod<
    any,
    any,
    any,
    {
      Body: {
        name: string;
        slug: string;
        description?: string;
        avatarUrl?: string;
      };
    }
  > = async (request, reply) => {
    const { userId } = (request as AuthenticatedRequest).user;
    const team = await teamService.createTeam(request.body, userId);
    return reply.status(201).send(team);
  };

  fastify.post('/', {
    preHandler: [
      authenticate,
      rateLimits.write,
      validate({
        body: {
          name: { type: 'string', required: true, min: 1, max: 100 },
          slug: { type: 'string', required: true, pattern: patterns.slug },
          description: { type: 'string', max: 500 },
          avatarUrl: { type: 'string', pattern: patterns.url },
        },
      }),
    ],
    handler: createTeamHandler,
  });

  /**
   * GET /api/v1/teams/:teamId
   * Get team details by ID
   *
   * @param teamId - Team ID
   * @returns Team data
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ForbiddenError} If user is not a team member
   * @throws {NotFoundError} If team not found
   */
  const getTeamHandler: RouteHandlerMethod<any, any, any, { Params: { teamId: string } }> = async (
    request,
    reply
  ) => {
    const { teamId } = request.params;
    const { userId } = (request as AuthenticatedRequest).user;
    const team = await teamService.getTeamById(teamId, userId);
    return reply.status(200).send(team);
  };

  fastify.get('/:teamId', {
    preHandler: [
      authenticate,
      rateLimits.read,
      validate({
        params: {
          teamId: { type: 'string', required: true, pattern: patterns.uuid },
        },
      }),
      requireTeamMember,
    ],
    handler: getTeamHandler,
  });

  /**
   * PATCH /api/v1/teams/:teamId
   * Update team details
   *
   * @param teamId - Team ID
   * @body name - Updated team name (optional)
   * @body slug - Updated team slug (optional)
   * @body description - Updated team description (optional)
   * @body avatarUrl - Updated team avatar URL (optional)
   * @returns Updated team data
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ForbiddenError} If user is not team admin
   * @throws {NotFoundError} If team not found
   * @throws {ValidationError} If input validation fails
   */
  const updateTeamHandler: RouteHandlerMethod<
    any,
    any,
    any,
    {
      Params: { teamId: string };
      Body: {
        name?: string;
        slug?: string;
        description?: string | null;
        avatarUrl?: string | null;
      };
    }
  > = async (request, reply) => {
    const { teamId } = request.params;
    const { userId } = (request as AuthenticatedRequest).user;
    const team = await teamService.updateTeam(teamId, request.body, userId);
    return reply.status(200).send(team);
  };

  fastify.patch('/:teamId', {
    preHandler: [
      authenticate,
      rateLimits.write,
      validate({
        params: {
          teamId: { type: 'string', required: true, pattern: patterns.uuid },
        },
        body: {
          name: { type: 'string', min: 1, max: 100 },
          slug: { type: 'string', pattern: patterns.slug },
          description: { type: 'string', max: 500 },
          avatarUrl: { type: 'string', pattern: patterns.url },
        },
      }),
      requireTeamAdmin,
    ],
    handler: updateTeamHandler,
  });

  /**
   * DELETE /api/v1/teams/:teamId
   * Delete a team
   *
   * @param teamId - Team ID
   * @returns Success message
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ForbiddenError} If user is not team admin
   * @throws {NotFoundError} If team not found
   */
  const deleteTeamHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Params: { teamId: string } }
  > = async (request, reply) => {
    const { teamId } = request.params;
    const { userId } = (request as AuthenticatedRequest).user;
    await teamService.deleteTeam(teamId, userId);
    return reply.status(200).send({ message: 'Team deleted successfully' });
  };

  fastify.delete('/:teamId', {
    preHandler: [
      authenticate,
      rateLimits.write,
      validate({
        params: {
          teamId: { type: 'string', required: true, pattern: patterns.uuid },
        },
      }),
      requireTeamAdmin,
    ],
    handler: deleteTeamHandler,
  });

  /**
   * GET /api/v1/teams/:teamId/members
   * List all team members
   *
   * @param teamId - Team ID
   * @returns Array of team members
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ForbiddenError} If user is not a team member
   * @throws {NotFoundError} If team not found
   */
  const listMembersHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Params: { teamId: string } }
  > = async (request, reply) => {
    const { teamId } = request.params;
    const { userId } = (request as AuthenticatedRequest).user;
    const members = await teamService.listMembers(teamId, userId);
    return reply.status(200).send(members);
  };

  fastify.get('/:teamId/members', {
    preHandler: [
      authenticate,
      rateLimits.read,
      validate({
        params: {
          teamId: { type: 'string', required: true, pattern: patterns.uuid },
        },
      }),
      requireTeamMember,
    ],
    handler: listMembersHandler,
  });

  /**
   * POST /api/v1/teams/:teamId/members
   * Add a member to the team
   *
   * @param teamId - Team ID
   * @body userId - User ID to add
   * @body role - Member role (member or admin)
   * @returns Success message
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ForbiddenError} If user is not team admin
   * @throws {NotFoundError} If team or user not found
   * @throws {ConflictError} If user is already a member
   */
  const addMemberHandler: RouteHandlerMethod<
    any,
    any,
    any,
    {
      Params: { teamId: string };
      Body: { userId: string; role: UserTeamRole };
    }
  > = async (request, reply) => {
    const { teamId } = request.params;
    const { userId: newMemberId, role } = request.body;
    const { userId: currentUserId } = (request as AuthenticatedRequest).user;
    await teamService.addMember(teamId, newMemberId, role, currentUserId);
    return reply.status(201).send({ message: 'Member added successfully' });
  };

  fastify.post('/:teamId/members', {
    preHandler: [
      authenticate,
      rateLimits.write,
      validate({
        params: {
          teamId: { type: 'string', required: true, pattern: patterns.uuid },
        },
        body: {
          userId: { type: 'string', required: true, pattern: patterns.uuid },
          role: { type: 'string', required: true, enum: ['member', 'admin'] },
        },
      }),
      requireTeamAdmin,
    ],
    handler: addMemberHandler,
  });

  /**
   * DELETE /api/v1/teams/:teamId/members/:userId
   * Remove a member from the team
   *
   * @param teamId - Team ID
   * @param userId - User ID to remove
   * @returns Success message
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ForbiddenError} If user is not team admin or trying to remove last admin
   * @throws {NotFoundError} If team or member not found
   */
  const removeMemberHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Params: { teamId: string; userId: string } }
  > = async (request, reply) => {
    const { teamId, userId: memberToRemove } = request.params;
    const { userId: currentUserId } = (request as AuthenticatedRequest).user;
    await teamService.removeMember(teamId, memberToRemove, currentUserId);
    return reply.status(200).send({ message: 'Member removed successfully' });
  };

  fastify.delete('/:teamId/members/:userId', {
    preHandler: [
      authenticate,
      rateLimits.write,
      validate({
        params: {
          teamId: { type: 'string', required: true, pattern: patterns.uuid },
          userId: { type: 'string', required: true, pattern: patterns.uuid },
        },
      }),
      requireTeamAdmin,
    ],
    handler: removeMemberHandler,
  });
}
