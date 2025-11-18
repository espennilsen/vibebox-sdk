/**
 * API Key Authentication Middleware
 * Verifies API keys for programmatic access to the API
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { ApiKeyService } from '@/services';
import { ApiKey } from '@prisma/client';
import { ApiKeyScope } from '@vibebox/types';

/**
 * API key data attached to request
 */
export interface ApiKeyAuth {
  userId: string;
  apiKeyId: string;
  scopes: ApiKeyScope[];
}

/**
 * Extended FastifyRequest with API key authentication
 */
export interface ApiKeyAuthenticatedRequest extends FastifyRequest {
  apiKey: ApiKey;
  user: {
    userId: string;
  };
}

/**
 * Extracts API key from request headers
 * Supports two formats:
 * - Authorization: Bearer vbx_live_...
 * - X-API-Key: vbx_live_...
 *
 * @param request - Fastify request object
 * @returns The API key string or null if not found
 */
function extractApiKey(request: FastifyRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const key = authHeader.substring(7);
    if (key.startsWith('vbx_live_')) {
      return key;
    }
  }

  // Check X-API-Key header
  const apiKeyHeader = request.headers['x-api-key'];
  if (typeof apiKeyHeader === 'string' && apiKeyHeader.startsWith('vbx_live_')) {
    return apiKeyHeader;
  }

  return null;
}

/**
 * API Key authentication middleware
 * Verifies API key and attaches key data to request
 *
 * @param request - Fastify request object
 * @param reply - Fastify reply object
 * @throws {UnauthorizedError} If API key is missing or invalid
 *
 * @example
 * ```typescript
 * // In route handler:
 * fastify.get('/api-protected', { preHandler: authenticateApiKey }, async (request: ApiKeyAuthenticatedRequest) => {
 *   return { userId: request.user.userId };
 * });
 * ```
 */
export async function authenticateApiKey(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const key = extractApiKey(request);

  if (!key) {
    throw new UnauthorizedError('API key required');
  }

  const apiKey = await ApiKeyService.validateApiKey(key);

  if (!apiKey) {
    throw new UnauthorizedError('Invalid or expired API key');
  }

  // Attach API key and user data to request
  (request as ApiKeyAuthenticatedRequest).apiKey = apiKey;
  (request as ApiKeyAuthenticatedRequest).user = {
    userId: apiKey.userId,
  };
}

/**
 * Flexible authentication middleware
 * Accepts either JWT token or API key
 * Useful for endpoints that support both authentication methods
 *
 * @param request - Fastify request object
 * @param reply - Fastify reply object
 * @throws {UnauthorizedError} If neither JWT nor API key is valid
 *
 * @example
 * ```typescript
 * fastify.get('/flexible', { preHandler: authenticateFlexible }, async (request) => {
 *   return { userId: request.user.userId };
 * });
 * ```
 */
export async function authenticateFlexible(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Try API key first
  const key = extractApiKey(request);
  if (key) {
    try {
      const apiKey = await ApiKeyService.validateApiKey(key);
      if (apiKey) {
        (request as ApiKeyAuthenticatedRequest).apiKey = apiKey;
        (request as ApiKeyAuthenticatedRequest).user = {
          userId: apiKey.userId,
        };
        return;
      }
    } catch {
      // Continue to JWT attempt
    }
  }

  // Try JWT
  try {
    await request.jwtVerify();
    const user = request.user as { userId: string; email: string };
    if (user?.userId) {
      return;
    }
  } catch {
    // Both methods failed
  }

  throw new UnauthorizedError('Authentication required (JWT or API key)');
}

/**
 * Creates a middleware that requires specific API key scope(s)
 * Must be used after authenticateApiKey or authenticateFlexible
 *
 * @param requiredScopes - Single scope or array of scopes required
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * fastify.post('/execute',
 *   {
 *     preHandler: [authenticateApiKey, requireScope('execute')]
 *   },
 *   async (request) => {
 *     // Only API keys with 'execute' scope can access this
 *   }
 * );
 * ```
 */
export function requireScope(requiredScopes: ApiKeyScope | ApiKeyScope[]) {
  const scopes = Array.isArray(requiredScopes) ? requiredScopes : [requiredScopes];

  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const apiKeyReq = request as ApiKeyAuthenticatedRequest;

    // If no API key is present, this might be JWT auth
    // JWT auth has full access by default
    if (!apiKeyReq.apiKey) {
      return;
    }

    // Check if API key has required scopes
    const hasAllScopes = ApiKeyService.hasAllScopes(apiKeyReq.apiKey, scopes);
    if (!hasAllScopes) {
      throw new ForbiddenError(
        `API key missing required scope(s): ${scopes.join(', ')}`
      );
    }
  };
}

/**
 * Middleware that only allows API key authentication (no JWT)
 * Useful for SDK-specific endpoints
 *
 * @param request - Fastify request object
 * @param reply - Fastify reply object
 * @throws {UnauthorizedError} If API key is missing or invalid
 */
export async function requireApiKey(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  await authenticateApiKey(request, reply);
}
