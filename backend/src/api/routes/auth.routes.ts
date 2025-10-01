/**
 * Authentication Routes
 * Handles user registration, login, token refresh, and user profile
 * Task: Phase 3.5 - API Layer
 */
import { FastifyInstance, FastifyRequest, FastifyReply, RouteHandlerMethod } from 'fastify';
import { AuthService } from '@/services';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validate, patterns } from '../middleware/validation';
import { rateLimits } from '../middleware/rateLimit';

/**
 * Register authentication routes
 *
 * @param fastify - Fastify instance
 *
 * @example
 * ```typescript
 * await fastify.register(authRoutes);
 * ```
 */
export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  const authService = new AuthService();

  /**
   * POST /api/v1/auth/register
   * Register a new user account
   *
   * @body email - User email address
   * @body password - User password (min 8 characters)
   * @body displayName - User display name
   * @returns Access token, refresh token, and user data
   * @throws {ValidationError} If input validation fails
   * @throws {ConflictError} If email already exists
   */
  const registerHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Body: { email: string; password: string; displayName: string } }
  > = async (request, reply) => {
    const { email, password, displayName } = request.body;
    const result = await authService.register(email, password, displayName);
    return reply.status(201).send(result);
  };

  fastify.post('/register', {
    preHandler: [
      rateLimits.auth,
      validate({
        body: {
          email: { type: 'string', required: true, pattern: patterns.email },
          password: { type: 'string', required: true, min: 8, max: 128 },
          displayName: { type: 'string', required: true, min: 1, max: 100 },
        },
      }),
    ],
    handler: registerHandler,
  });

  /**
   * POST /api/v1/auth/login
   * Login with email and password
   *
   * @body email - User email address
   * @body password - User password
   * @returns Access token, refresh token, and user data
   * @throws {ValidationError} If input validation fails
   * @throws {UnauthorizedError} If credentials are invalid
   */
  const loginHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Body: { email: string; password: string } }
  > = async (request, reply) => {
    const { email, password } = request.body;
    const result = await authService.login(email, password);
    return reply.status(200).send(result);
  };

  fastify.post('/login', {
    preHandler: [
      rateLimits.auth,
      validate({
        body: {
          email: { type: 'string', required: true, pattern: patterns.email },
          password: { type: 'string', required: true },
        },
      }),
    ],
    handler: loginHandler,
  });

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token using refresh token
   *
   * @body refreshToken - Valid refresh token
   * @returns New access token, refresh token, and user data
   * @throws {ValidationError} If refresh token is missing
   * @throws {UnauthorizedError} If refresh token is invalid
   */
  const refreshHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Body: { refreshToken: string } }
  > = async (request, reply) => {
    const { refreshToken } = request.body;
    const result = await authService.refreshToken(refreshToken);
    return reply.status(200).send(result);
  };

  fastify.post('/refresh', {
    preHandler: [
      rateLimits.auth,
      validate({
        body: {
          refreshToken: { type: 'string', required: true },
        },
      }),
    ],
    handler: refreshHandler,
  });

  /**
   * GET /api/v1/auth/me
   * Get current authenticated user profile
   *
   * @returns User data
   * @throws {UnauthorizedError} If not authenticated
   * @throws {NotFoundError} If user not found
   */
  fastify.get(
    '/me',
    {
      preHandler: [authenticate, rateLimits.read],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = (request as AuthenticatedRequest).user;

      const user = await authService.getUserById(userId);

      return reply.status(200).send(user);
    }
  );
}
