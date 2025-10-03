/**
 * Resource Quota Middleware
 * Enforces per-user and per-team environment limits
 * Task: GitHub Issue #7 - Resource Quotas and Limits
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthenticatedRequest } from './auth';
import { TooManyRequestsError, NotFoundError, ValidationError } from '@/lib/errors';
import { getPrismaClient } from '@/lib/db';
import { RESOURCE_LIMITS } from '@/lib/constants';

/**
 * Check user environment quota middleware
 * Verifies that the user hasn't exceeded their concurrent environment limit
 *
 * @param request - Authenticated Fastify request
 * @param reply - Fastify reply object
 * @throws {TooManyRequestsError} If user has reached their environment quota
 *
 * @example
 * ```typescript
 * // In route handler:
 * fastify.post('/environments',
 *   { preHandler: [authenticate, checkUserQuota] },
 *   async (request) => {
 *     // Create environment - quota already verified
 *   }
 * );
 * ```
 */
export async function checkUserQuota(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const authRequest = request as AuthenticatedRequest;
  const userId = authRequest.user.userId;
  const prisma = getPrismaClient();

  // Get user with their quota limit
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { maxEnvironments: true },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Treat null/undefined maxEnvironments as unlimited
  if (user.maxEnvironments === null || user.maxEnvironments === undefined) {
    // No limit set, allow creation
    return;
  }

  // Count active environments for this user
  const activeEnvironments = await prisma.environment.count({
    where: {
      creatorId: userId,
      status: {
        in: ['starting', 'running', 'stopping'],
      },
    },
  });

  // Check if quota exceeded (only if maxEnvironments is a finite number)
  if (activeEnvironments >= user.maxEnvironments) {
    throw new TooManyRequestsError(
      `User environment quota exceeded. You have ${activeEnvironments} active environments out of ${user.maxEnvironments} allowed.`
    );
  }
}

/**
 * Check team environment quota middleware
 * Verifies that the team hasn't exceeded their concurrent environment limit
 * Only applicable for team-owned projects
 *
 * @param request - Authenticated Fastify request with projectId in body
 * @param reply - Fastify reply object
 * @throws {TooManyRequestsError} If team has reached their environment quota
 *
 * @example
 * ```typescript
 * // In route handler:
 * fastify.post('/environments',
 *   { preHandler: [authenticate, checkTeamQuota] },
 *   async (request) => {
 *     // Create environment - team quota already verified
 *   }
 * );
 * ```
 */
export async function checkTeamQuota(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const body = request.body as { projectId?: string };

  if (!body.projectId) {
    // No project specified, skip team quota check
    return;
  }

  const prisma = getPrismaClient();

  // Get project with team information
  const project = await prisma.project.findUnique({
    where: { id: body.projectId },
    select: {
      teamId: true,
      team: {
        select: {
          maxEnvironments: true,
        },
      },
    },
  });

  if (!project || !project.teamId || !project.team) {
    // Not a team project, skip team quota check
    return;
  }

  // Treat null/undefined maxEnvironments as unlimited
  if (project.team.maxEnvironments === null || project.team.maxEnvironments === undefined) {
    // No limit set, allow creation
    return;
  }

  // Count active environments for this team across all projects
  const activeEnvironments = await prisma.environment.count({
    where: {
      project: {
        teamId: project.teamId,
      },
      status: {
        in: ['starting', 'running', 'stopping'],
      },
    },
  });

  // Check if quota exceeded (only when maxEnvironments is a non-null number)
  if (activeEnvironments >= project.team.maxEnvironments) {
    throw new TooManyRequestsError(
      `Team environment quota exceeded. The team has ${activeEnvironments} active environments out of ${project.team.maxEnvironments} allowed.`
    );
  }
}

/**
 * Check team member quota middleware
 * Verifies that the team hasn't exceeded their member limit
 *
 * @param request - Authenticated Fastify request with teamId in params
 * @param reply - Fastify reply object
 * @throws {TooManyRequestsError} If team has reached their member quota
 *
 * @example
 * ```typescript
 * // In route handler for adding team members:
 * fastify.post('/teams/:teamId/members',
 *   { preHandler: [authenticate, checkTeamMemberQuota] },
 *   async (request) => {
 *     // Add member - quota already verified
 *   }
 * );
 * ```
 */
export async function checkTeamMemberQuota(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const params = request.params as { teamId?: string };

  if (!params.teamId) {
    return;
  }

  const prisma = getPrismaClient();

  // Get team with member count
  const team = await prisma.team.findUnique({
    where: { id: params.teamId },
    select: {
      maxMembers: true,
      _count: {
        select: { userTeams: true },
      },
    },
  });

  if (!team) {
    throw new NotFoundError('Team not found');
  }

  // Treat null/undefined maxMembers as unlimited - only enforce when a numeric cap is configured
  if (typeof team.maxMembers === 'number' && team._count.userTeams >= team.maxMembers) {
    throw new TooManyRequestsError(
      `Team member quota exceeded. The team has ${team._count.userTeams} members out of ${team.maxMembers} allowed.`
    );
  }
}

/**
 * Validate environment resource limits
 * Ensures requested CPU, memory, and storage are within bounds
 *
 * @param request - Fastify request with resource limits in body
 * @param reply - Fastify reply object
 * @throws {TooManyRequestsError} If requested resources exceed limits
 *
 * @example
 * ```typescript
 * // In route handler:
 * fastify.post('/environments',
 *   { preHandler: [authenticate, validateResourceLimits] },
 *   async (request) => {
 *     // Create environment - resources already validated
 *   }
 * );
 * ```
 */
export function validateResourceLimits(request: FastifyRequest, _reply: FastifyReply): void {
  const body = request.body as {
    cpuLimit?: number;
    memoryLimit?: number;
    storageLimit?: number;
  };

  // Validate CPU limit - skip null/undefined, only validate if present
  if (body.cpuLimit !== null && body.cpuLimit !== undefined) {
    if (
      typeof body.cpuLimit !== 'number' ||
      body.cpuLimit < RESOURCE_LIMITS.CPU.MIN ||
      body.cpuLimit > RESOURCE_LIMITS.CPU.MAX
    ) {
      throw new ValidationError(
        `CPU limit must be between ${RESOURCE_LIMITS.CPU.MIN} and ${RESOURCE_LIMITS.CPU.MAX} cores. Requested: ${body.cpuLimit}`
      );
    }
  }

  // Validate memory limit - skip null/undefined, only validate if present
  if (body.memoryLimit !== null && body.memoryLimit !== undefined) {
    if (
      typeof body.memoryLimit !== 'number' ||
      body.memoryLimit < RESOURCE_LIMITS.MEMORY.MIN ||
      body.memoryLimit > RESOURCE_LIMITS.MEMORY.MAX
    ) {
      throw new ValidationError(
        `Memory limit must be between ${RESOURCE_LIMITS.MEMORY.MIN} and ${RESOURCE_LIMITS.MEMORY.MAX} MB. Requested: ${body.memoryLimit}`
      );
    }
  }

  // Validate storage limit - skip null/undefined, only validate if present
  if (body.storageLimit !== null && body.storageLimit !== undefined) {
    if (
      typeof body.storageLimit !== 'number' ||
      body.storageLimit < RESOURCE_LIMITS.STORAGE.MIN ||
      body.storageLimit > RESOURCE_LIMITS.STORAGE.MAX
    ) {
      throw new ValidationError(
        `Storage limit must be between ${RESOURCE_LIMITS.STORAGE.MIN} and ${RESOURCE_LIMITS.STORAGE.MAX} MB. Requested: ${body.storageLimit}`
      );
    }
  }
}
