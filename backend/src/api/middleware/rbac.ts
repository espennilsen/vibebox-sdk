/**
 * Role-Based Access Control (RBAC) Middleware
 *
 * Provides middleware for enforcing role-based permissions on routes.
 * Supports team-level roles (admin, developer, viewer) and resource ownership checks.
 *
 * Task: Security Hardening (#6)
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { UserTeamRole } from '@prisma/client';
import { ForbiddenError, UnauthorizedError, NotFoundError } from '@/lib/errors';
import { getPrismaClient } from '@/lib/db';
import { AuthenticatedRequest } from './auth';

const prisma = getPrismaClient();

/**
 * Role hierarchy - higher number = more permissions
 */
const ROLE_HIERARCHY: Record<UserTeamRole, number> = {
  [UserTeamRole.admin]: 3,
  [UserTeamRole.developer]: 2,
  [UserTeamRole.viewer]: 1,
};

/**
 * Check if user has required role or higher
 *
 * @param userRole - User's current role
 * @param requiredRole - Minimum required role
 * @returns True if user has sufficient permissions
 *
 * @example
 * ```typescript
 * hasRole(UserTeamRole.developer, UserTeamRole.viewer) // true
 * hasRole(UserTeamRole.viewer, UserTeamRole.admin) // false
 * ```
 */
export function hasRole(userRole: UserTeamRole, requiredRole: UserTeamRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Get user's role for a specific team
 *
 * @param userId - User ID
 * @param teamId - Team ID
 * @returns User's role in the team, or null if not a member
 */
export async function getUserTeamRole(
  userId: string,
  teamId: string
): Promise<UserTeamRole | null> {
  const membership = await prisma.userTeam.findUnique({
    where: {
      userId_teamId: {
        userId,
        teamId,
      },
    },
    select: {
      role: true,
    },
  });

  return membership?.role || null;
}

/**
 * Check if user has required role for a team
 *
 * @param userId - User ID
 * @param teamId - Team ID
 * @param requiredRole - Minimum required role
 * @returns True if user has sufficient permissions
 */
export async function hasTeamRole(
  userId: string,
  teamId: string,
  requiredRole: UserTeamRole
): Promise<boolean> {
  const userRole = await getUserTeamRole(userId, teamId);

  if (!userRole) {
    return false;
  }

  return hasRole(userRole, requiredRole);
}

/**
 * Require specific team role middleware
 *
 * Validates that the authenticated user has at least the required role
 * in the team specified by the route parameter.
 *
 * @param requiredRole - Minimum required role
 * @param teamIdParam - Name of the route parameter containing team ID (default: 'teamId')
 * @returns Middleware function
 * @throws {UnauthorizedError} If not authenticated
 * @throws {ForbiddenError} If insufficient permissions
 *
 * @example
 * ```typescript
 * // Require admin role for team
 * fastify.delete('/teams/:teamId',
 *   { preHandler: [authenticate, requireTeamRole(UserTeamRole.admin)] },
 *   handler
 * );
 *
 * // Require developer role for project in team
 * fastify.post('/teams/:teamId/projects',
 *   { preHandler: [authenticate, requireTeamRole(UserTeamRole.developer)] },
 *   handler
 * );
 * ```
 */
export function requireTeamRole(requiredRole: UserTeamRole, teamIdParam: string = 'teamId') {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    // Ensure user is authenticated
    const user = (request as AuthenticatedRequest).user;
    if (!user || !user.userId) {
      throw new UnauthorizedError('Authentication required');
    }

    // Get team ID from route parameters
    const params = request.params as Record<string, string>;
    const teamId = params[teamIdParam];

    if (!teamId) {
      throw new Error(`Team ID parameter '${teamIdParam}' not found in route`);
    }

    // Check if user has required role
    const hasPermission = await hasTeamRole(user.userId, teamId, requiredRole);

    if (!hasPermission) {
      throw new ForbiddenError('Insufficient permissions for this operation');
    }
  };
}

/**
 * Require resource ownership or team admin role
 *
 * Allows access if user owns the resource OR has admin role in the team.
 * Useful for routes where users can modify their own resources or admins can modify any.
 *
 * @param options - Configuration options
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * // Allow user to edit their own project or team admin to edit any project
 * fastify.patch('/projects/:projectId',
 *   {
 *     preHandler: [
 *       authenticate,
 *       requireOwnershipOrAdmin({
 *         resourceIdParam: 'projectId',
 *         resourceType: 'project',
 *         ownerField: 'ownerId'
 *       })
 *     ]
 *   },
 *   handler
 * );
 * ```
 */
export function requireOwnershipOrAdmin(options: {
  resourceIdParam: string;
  resourceType: 'project' | 'environment';
  ownerField?: string;
  teamIdField?: string;
}) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const user = (request as AuthenticatedRequest).user;
    if (!user || !user.userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const params = request.params as Record<string, string>;
    const resourceId = params[options.resourceIdParam];

    if (!resourceId) {
      throw new Error(`Resource ID parameter '${options.resourceIdParam}' not found in route`);
    }

    // Fetch full resource to support custom ownerField/teamIdField
    if (options.resourceType === 'project') {
      const project = await prisma.project.findUnique({
        where: { id: resourceId },
      });

      if (!project) {
        throw new NotFoundError(`${options.resourceType} not found`);
      }

      const projectData = project as Record<string, unknown>;
      const ownerKey = options.ownerField ?? 'ownerId';
      const teamKey = options.teamIdField ?? 'teamId';

      if (projectData[ownerKey] === user.userId) {
        return;
      }

      const projectTeamId = projectData[teamKey];
      if (projectTeamId && typeof projectTeamId === 'string') {
        if (await hasTeamRole(user.userId, projectTeamId, UserTeamRole.admin)) {
          return;
        }
      }

      throw new ForbiddenError('Insufficient permissions for this operation');
    }

    const environment = await prisma.environment.findUnique({
      where: { id: resourceId },
      include: {
        project: true,
      },
    });

    if (!environment) {
      throw new NotFoundError(`${options.resourceType} not found`);
    }

    const environmentData = environment as unknown as Record<string, unknown>;
    const ownerKey = options.ownerField ?? 'creatorId';

    if (environmentData[ownerKey] === user.userId) {
      return;
    }

    const teamKey = options.teamIdField ?? 'teamId';
    const teamId =
      (environmentData[teamKey] as string | undefined) ??
      (environment.project?.teamId as string | undefined);

    if (teamId && (await hasTeamRole(user.userId, teamId, UserTeamRole.admin))) {
      return;
    }

    throw new ForbiddenError('Insufficient permissions for this operation');
  };
}

/**
 * Require minimum role across all teams user belongs to
 *
 * Useful for platform-level operations that require a certain role
 * in at least one team.
 *
 * @param requiredRole - Minimum required role
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * // Require user to be at least a developer in any team
 * fastify.post('/api/v1/resources',
 *   { preHandler: [authenticate, requireAnyTeamRole(UserTeamRole.developer)] },
 *   handler
 * );
 * ```
 */
export function requireAnyTeamRole(requiredRole: UserTeamRole) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const user = (request as AuthenticatedRequest).user;
    if (!user || !user.userId) {
      throw new UnauthorizedError('Authentication required');
    }

    // Check if user has required role in any team
    const memberships = await prisma.userTeam.findMany({
      where: {
        userId: user.userId,
      },
      select: {
        role: true,
      },
    });

    const hasPermission = memberships.some((membership) => hasRole(membership.role, requiredRole));

    if (!hasPermission) {
      throw new ForbiddenError(`This operation requires ${requiredRole} role in at least one team`);
    }
  };
}

/**
 * Check if user is team member
 *
 * @param userId - User ID
 * @param teamId - Team ID
 * @returns True if user is a team member
 */
export async function isTeamMember(userId: string, teamId: string): Promise<boolean> {
  const membership = await prisma.userTeam.findUnique({
    where: {
      userId_teamId: {
        userId,
        teamId,
      },
    },
  });

  return !!membership;
}

/**
 * Require team membership
 *
 * Simply checks if user is a member of the team, regardless of role.
 *
 * @param teamIdParam - Name of the route parameter containing team ID
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * fastify.get('/teams/:teamId/info',
 *   { preHandler: [authenticate, requireTeamMembership()] },
 *   handler
 * );
 * ```
 */
export function requireTeamMembership(teamIdParam: string = 'teamId') {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const user = (request as AuthenticatedRequest).user;
    if (!user || !user.userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const params = request.params as Record<string, string>;
    const teamId = params[teamIdParam];

    if (!teamId) {
      throw new Error(`Team ID parameter '${teamIdParam}' not found in route`);
    }

    const isMember = await isTeamMember(user.userId, teamId);

    if (!isMember) {
      throw new ForbiddenError('You must be a team member to access this resource');
    }
  };
}

/**
 * Export role enum for convenience
 */
export { UserTeamRole };
