/**
 * Authentication Middleware
 * Verifies JWT tokens and extracts user information
 * Task: Phase 3.5 - API Layer
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError } from '@/lib/errors';

/**
 * Authenticated user data attached to request
 */
export interface AuthUser {
  userId: string;
  email: string;
}

/**
 * Extended FastifyRequest with authenticated user
 */
export interface AuthenticatedRequest extends FastifyRequest {
  user: AuthUser;
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user data to request
 *
 * @param request - Fastify request object
 * @param reply - Fastify reply object
 * @throws {UnauthorizedError} If token is missing or invalid
 *
 * @example
 * ```typescript
 * // In route handler:
 * fastify.get('/protected', { preHandler: authenticate }, async (request: AuthenticatedRequest) => {
 *   return { userId: request.user.userId };
 * });
 * ```
 */
export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  try {
    // Verify JWT token - this will throw if invalid
    await request.jwtVerify();

    // Extract user data from verified token
    const user = request.user as AuthUser;

    if (!user?.userId || !user?.email) {
      throw new UnauthorizedError('Invalid token payload');
    }
  } catch {
    throw new UnauthorizedError('Authentication required');
  }
}

/**
 * Optional authentication middleware
 * Similar to authenticate but doesn't throw if token is missing
 * Useful for routes that work with or without authentication
 *
 * @param request - Fastify request object
 * @param reply - Fastify reply object
 *
 * @example
 * ```typescript
 * fastify.get('/public-or-private', { preHandler: optionalAuthenticate }, async (request) => {
 *   const user = (request as AuthenticatedRequest).user;
 *   if (user) {
 *     return { message: 'Authenticated', userId: user.userId };
 *   }
 *   return { message: 'Public access' };
 * });
 * ```
 */
export async function optionalAuthenticate(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    // Silently ignore authentication failures for optional auth
  }
}
