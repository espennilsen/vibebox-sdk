/**
 * Authorization Middleware
 * Role-based access control for teams and projects
 * Task: Phase 3.5 - API Layer
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { UserTeamRole } from '@prisma/client';
import { getPrismaClient } from '@/lib/db';
import { ForbiddenError } from '@/lib/errors';
import { AuthenticatedRequest } from './auth';

/**
 * Authorization service for checking user permissions
 */
class AuthorizationService {
  constructor(private prisma: PrismaClient = getPrismaClient()) {}

  /**
   * Check if user is a member of a team
   *
   * @param userId - User ID
   * @param teamId - Team ID
   * @returns True if user is a team member
   */
  async isTeamMember(userId: string, teamId: string): Promise<boolean> {
    const membership = await this.prisma.userTeam.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
    });
    return membership !== null;
  }

  /**
   * Check if user has admin role in team
   *
   * @param userId - User ID
   * @param teamId - Team ID
   * @returns True if user is team admin
   */
  async isTeamAdmin(userId: string, teamId: string): Promise<boolean> {
    const membership = await this.prisma.userTeam.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
    });
    return membership?.role === UserTeamRole.admin;
  }

  /**
   * Check if user has access to a project
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @returns True if user has access (owner or team member)
   */
  async hasProjectAccess(userId: string, projectId: string): Promise<boolean> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        team: {
          include: {
            userTeams: true,
          },
        },
      },
    });

    if (!project) {
      return false;
    }

    // Check if user is project owner
    if (project.ownerId === userId) {
      return true;
    }

    // Check if user is in project team
    if (project.team) {
      return project.team.userTeams.some((ut: { userId: string }) => ut.userId === userId);
    }

    return false;
  }

  /**
   * Check if user is project owner
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @returns True if user is project owner
   */
  async isProjectOwner(userId: string, projectId: string): Promise<boolean> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });
    return project?.ownerId === userId;
  }

  /**
   * Check if user has access to an environment
   *
   * @param userId - User ID
   * @param environmentId - Environment ID
   * @returns True if user has access via project
   */
  async hasEnvironmentAccess(userId: string, environmentId: string): Promise<boolean> {
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      select: { projectId: true },
    });

    if (!environment) {
      return false;
    }

    return this.hasProjectAccess(userId, environment.projectId);
  }
}

const authzService = new AuthorizationService();

/**
 * Middleware to check if user is a member of the specified team
 *
 * @param request - Fastify request with teamId in params
 * @param reply - Fastify reply object
 * @throws {ForbiddenError} If user is not a team member
 *
 * @example
 * ```typescript
 * fastify.get('/teams/:teamId', {
 *   preHandler: [authenticate, requireTeamMember]
 * }, handler);
 * ```
 */
export async function requireTeamMember(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const { teamId } = request.params as { teamId: string };

  const isMember = await authzService.isTeamMember(user.userId, teamId);
  if (!isMember) {
    throw new ForbiddenError('You do not have access to this team');
  }
}

/**
 * Middleware to check if user is an admin of the specified team
 *
 * @param request - Fastify request with teamId in params
 * @param reply - Fastify reply object
 * @throws {ForbiddenError} If user is not a team admin
 *
 * @example
 * ```typescript
 * fastify.delete('/teams/:teamId', {
 *   preHandler: [authenticate, requireTeamAdmin]
 * }, handler);
 * ```
 */
export async function requireTeamAdmin(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const { teamId } = request.params as { teamId: string };

  const isAdmin = await authzService.isTeamAdmin(user.userId, teamId);
  if (!isAdmin) {
    throw new ForbiddenError('Admin access required for this operation');
  }
}

/**
 * Middleware to check if user has access to the specified project
 *
 * @param request - Fastify request with projectId in params
 * @param reply - Fastify reply object
 * @throws {ForbiddenError} If user does not have project access
 *
 * @example
 * ```typescript
 * fastify.get('/projects/:projectId', {
 *   preHandler: [authenticate, requireProjectAccess]
 * }, handler);
 * ```
 */
export async function requireProjectAccess(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const { projectId } = request.params as { projectId: string };

  const hasAccess = await authzService.hasProjectAccess(user.userId, projectId);
  if (!hasAccess) {
    throw new ForbiddenError('You do not have access to this project');
  }
}

/**
 * Middleware to check if user is the owner of the specified project
 *
 * @param request - Fastify request with projectId in params
 * @param reply - Fastify reply object
 * @throws {ForbiddenError} If user is not the project owner
 *
 * @example
 * ```typescript
 * fastify.delete('/projects/:projectId', {
 *   preHandler: [authenticate, requireProjectOwner]
 * }, handler);
 * ```
 */
export async function requireProjectOwner(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const { projectId } = request.params as { projectId: string };

  const isOwner = await authzService.isProjectOwner(user.userId, projectId);
  if (!isOwner) {
    throw new ForbiddenError('Project owner access required for this operation');
  }
}

/**
 * Middleware to check if user has access to the specified environment
 *
 * @param request - Fastify request with envId in params
 * @param reply - Fastify reply object
 * @throws {ForbiddenError} If user does not have environment access
 *
 * @example
 * ```typescript
 * fastify.post('/environments/:envId/start', {
 *   preHandler: [authenticate, requireEnvironmentAccess]
 * }, handler);
 * ```
 */
export async function requireEnvironmentAccess(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const { envId } = request.params as { envId: string };

  const hasAccess = await authzService.hasEnvironmentAccess(user.userId, envId);
  if (!hasAccess) {
    throw new ForbiddenError('You do not have access to this environment');
  }
}

/**
 * Export authorization service for use in route handlers
 */
export { authzService };
