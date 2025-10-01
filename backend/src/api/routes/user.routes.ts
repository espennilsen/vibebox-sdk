/**
 * User Routes
 * Handles user profile retrieval and updates
 * Task: Phase 3.5 - API Layer
 */
import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { UserService } from '@/services';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validate, patterns } from '../middleware/validation';
import { rateLimits } from '../middleware/rateLimit';
import { ForbiddenError } from '@/lib/errors';

/**
 * Register user routes
 *
 * @param fastify - Fastify instance
 *
 * @example
 * ```typescript
 * await fastify.register(userRoutes);
 * ```
 */
export async function userRoutes(fastify: FastifyInstance): Promise<void> {
  const userService = new UserService();

  /**
   * GET /api/v1/users/:userId
   * Get user profile by ID
   *
   * @param userId - User ID
   * @returns User data
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ForbiddenError} If requesting another user's profile
   * @throws {NotFoundError} If user not found
   */
  const getUserHandler: RouteHandlerMethod<any, any, any, { Params: { userId: string } }> = async (
    request,
    reply
  ) => {
    const { userId } = request.params;
    const currentUser = (request as AuthenticatedRequest).user;

    // Users can only view their own profile
    if (currentUser.userId !== userId) {
      throw new ForbiddenError('You can only view your own profile');
    }

    const user = await userService.getUserById(userId);

    return reply.status(200).send(user);
  };

  fastify.get('/:userId', {
    preHandler: [
      authenticate,
      rateLimits.read,
      validate({
        params: {
          userId: { type: 'string', required: true, pattern: patterns.uuid },
        },
      }),
    ],
    handler: getUserHandler,
  });

  /**
   * PATCH /api/v1/users/:userId
   * Update user profile
   *
   * @param userId - User ID
   * @body displayName - Updated display name (optional)
   * @body avatarUrl - Updated avatar URL (optional)
   * @body timezone - Updated timezone (optional)
   * @body locale - Updated locale (optional)
   * @body sshPublicKey - Updated SSH public key (optional)
   * @body notificationSettings - Updated notification settings (optional)
   * @returns Updated user data
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ForbiddenError} If updating another user's profile
   * @throws {NotFoundError} If user not found
   * @throws {ValidationError} If input validation fails
   */
  const updateUserHandler: RouteHandlerMethod<
    any,
    any,
    any,
    {
      Params: { userId: string };
      Body: {
        displayName?: string;
        avatarUrl?: string;
        timezone?: string;
        locale?: string;
        sshPublicKey?: string;
        notificationSettings?: Record<string, unknown>;
      };
    }
  > = async (request, reply) => {
    const { userId } = request.params;
    const currentUser = (request as AuthenticatedRequest).user;

    // Users can only update their own profile
    if (currentUser.userId !== userId) {
      throw new ForbiddenError('You can only update your own profile');
    }

    const user = await userService.updateProfile(userId, request.body);

    return reply.status(200).send(user);
  };

  fastify.patch('/:userId', {
    preHandler: [
      authenticate,
      rateLimits.write,
      validate({
        params: {
          userId: { type: 'string', required: true, pattern: patterns.uuid },
        },
        body: {
          displayName: { type: 'string', min: 1, max: 100 },
          avatarUrl: { type: 'string', pattern: patterns.url },
          timezone: { type: 'string', min: 1, max: 50 },
          locale: { type: 'string', min: 2, max: 10 },
          sshPublicKey: { type: 'string', max: 4096 },
          notificationSettings: { type: 'object' },
        },
      }),
    ],
    handler: updateUserHandler,
  });
}
