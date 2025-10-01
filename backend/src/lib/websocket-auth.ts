/**
 * WebSocket Authentication Utility
 * Provides JWT verification for WebSocket connections
 */
import { FastifyInstance } from 'fastify';
import { UnauthorizedError } from '@/lib/errors';
import { AuthUser } from '@/api/middleware/auth';

/**
 * Verifies JWT token from query string for WebSocket connections
 *
 * @param fastify - Fastify instance with JWT plugin
 * @param token - JWT token from query string
 * @returns Decoded user information
 * @throws {UnauthorizedError} If token is missing or invalid
 *
 * @example
 * ```typescript
 * const user = verifyWebSocketToken(fastify, request.query.token);
 * logger.info({ userId: user.userId }, 'WebSocket authenticated');
 * ```
 */
export function verifyWebSocketToken(fastify: FastifyInstance, token?: string): AuthUser {
  if (!token) {
    throw new UnauthorizedError('Authentication token is required');
  }

  try {
    // Verify the token using Fastify's JWT plugin
    const decoded = fastify.jwt.verify(token);

    // Validate payload structure
    if (
      !decoded ||
      typeof decoded !== 'object' ||
      !('userId' in decoded) ||
      !('email' in decoded)
    ) {
      throw new UnauthorizedError('Invalid token payload');
    }

    const user = decoded as AuthUser;

    if (!user.userId || !user.email) {
      throw new UnauthorizedError('Invalid token payload structure');
    }

    return user;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError('Invalid or expired token');
  }
}
