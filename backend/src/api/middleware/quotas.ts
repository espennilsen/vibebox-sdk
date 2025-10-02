/**
 * Resource Quota Middleware
 * Enforces per-user and per-team environment limits
 * Task: GitHub Issue #7 - Resource Quotas and Limits
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from './auth';
import { TooManyRequestsError } from '@/lib/errors';

const prisma = new PrismaClient();

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

  // Get user with their quota limit
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { maxEnvironments: true },
  });

  if (!user) {
    throw new TooManyRequestsError('User not found');
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

  // Check if quota exceeded
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

  // Check if quota exceeded
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
    throw new TooManyRequestsError('Team not found');
  }

  // Check if quota exceeded
  if (team._count.userTeams >= team.maxMembers) {
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
export async function validateResourceLimits(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const body = request.body as {
    cpuLimit?: number;
    memoryLimit?: number;
    storageLimit?: number;
  };

  // Define maximum allowed resource limits
  const MAX_CPU = 8.0; // 8 CPUs
  const MAX_MEMORY = 16384; // 16 GB in MB
  const MAX_STORAGE = 102400; // 100 GB in MB

  // Validate CPU limit
  if (body.cpuLimit !== undefined) {
    if (body.cpuLimit <= 0 || body.cpuLimit > MAX_CPU) {
      throw new TooManyRequestsError(
        `CPU limit must be between 0 and ${MAX_CPU}. Requested: ${body.cpuLimit}`
      );
    }
  }

  // Validate memory limit
  if (body.memoryLimit !== undefined) {
    if (body.memoryLimit <= 0 || body.memoryLimit > MAX_MEMORY) {
      throw new TooManyRequestsError(
        `Memory limit must be between 0 and ${MAX_MEMORY} MB. Requested: ${body.memoryLimit}`
      );
    }
  }

  // Validate storage limit
  if (body.storageLimit !== undefined) {
    if (body.storageLimit <= 0 || body.storageLimit > MAX_STORAGE) {
      throw new TooManyRequestsError(
        `Storage limit must be between 0 and ${MAX_STORAGE} MB. Requested: ${body.storageLimit}`
      );
    }
  }
}
