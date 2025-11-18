/**
 * API Key Routes
 * Handles API key management for programmatic access
 */

import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { ApiKeyService } from '@/services';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validate, patterns } from '../middleware/validation';
import { rateLimits } from '../middleware/rateLimit';
import { BadRequestError } from '@/lib/errors';
import {
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  UpdateApiKeyRequest,
  ApiKey as ApiKeyDTO,
  ApiKeyScope,
} from '@vibebox/types';

/**
 * Converts Prisma ApiKey to DTO (hides keyHash)
 *
 * @param apiKey - Prisma ApiKey object
 * @returns ApiKey DTO
 */
function toApiKeyDTO(apiKey: any): ApiKeyDTO {
  return {
    id: apiKey.id,
    userId: apiKey.userId,
    name: apiKey.name,
    keyPrefix: apiKey.keyPrefix,
    scopes: apiKey.scopes as ApiKeyScope[],
    expiresAt: apiKey.expiresAt?.toISOString(),
    lastUsedAt: apiKey.lastUsedAt?.toISOString(),
    createdAt: apiKey.createdAt.toISOString(),
    updatedAt: apiKey.updatedAt.toISOString(),
  };
}

/**
 * Register API key routes
 *
 * @param fastify - Fastify instance
 */
export async function apiKeyRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/keys
   * Generate a new API key
   *
   * @body name - Descriptive name for the key
   * @body scopes - Array of permissions (read, write, execute)
   * @body expiresAt - Optional expiration date (ISO string)
   * @returns Created API key with full key (only shown once)
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ValidationError} If input validation fails
   */
  const createApiKeyHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Body: CreateApiKeyRequest }
  > = async (request, reply) => {
    const currentUser = (request as AuthenticatedRequest).user;
    const { name, scopes, expiresAt } = request.body;

    // Validate scopes
    const validScopes: ApiKeyScope[] = ['read', 'write', 'execute'];
    const invalidScopes = scopes.filter(scope => !validScopes.includes(scope));
    if (invalidScopes.length > 0) {
      throw new BadRequestError(
        `Invalid scope(s): ${invalidScopes.join(', ')}. Valid scopes are: ${validScopes.join(', ')}`
      );
    }

    // Parse expiration date if provided
    const expirationDate = expiresAt ? new Date(expiresAt) : undefined;
    if (expirationDate && expirationDate <= new Date()) {
      throw new BadRequestError('Expiration date must be in the future');
    }

    const { apiKey, key } = await ApiKeyService.createApiKey(
      currentUser.userId,
      name,
      scopes,
      expirationDate
    );

    const response: CreateApiKeyResponse = {
      apiKey: toApiKeyDTO(apiKey),
      key, // Full key only returned once
    };

    return reply.status(201).send(response);
  };

  fastify.post('/', {
    preHandler: [
      authenticate,
      rateLimits.write,
      validate({
        body: {
          name: { type: 'string', required: true, minLength: 1, maxLength: 100 },
          scopes: {
            type: 'array',
            required: true,
            items: { type: 'string' },
            minItems: 1,
          },
          expiresAt: { type: 'string', required: false },
        },
      }),
    ],
    handler: createApiKeyHandler,
  });

  /**
   * GET /api/v1/keys
   * List all API keys for the authenticated user
   *
   * @returns Array of API keys (without full keys)
   * @throws {UnauthorizedError} If not authenticated
   */
  const listApiKeysHandler: RouteHandlerMethod = async (request, reply) => {
    const currentUser = (request as AuthenticatedRequest).user;

    const apiKeys = await ApiKeyService.listApiKeys(currentUser.userId);
    const dtoKeys = apiKeys.map(toApiKeyDTO);

    return reply.status(200).send(dtoKeys);
  };

  fastify.get('/', {
    preHandler: [authenticate, rateLimits.read],
    handler: listApiKeysHandler,
  });

  /**
   * GET /api/v1/keys/:keyId
   * Get a specific API key by ID
   *
   * @param keyId - API key ID
   * @returns API key data
   * @throws {UnauthorizedError} If not authenticated
   * @throws {NotFoundError} If key not found or not owned by user
   */
  const getApiKeyHandler: RouteHandlerMethod<any, any, any, { Params: { keyId: string } }> =
    async (request, reply) => {
      const currentUser = (request as AuthenticatedRequest).user;
      const { keyId } = request.params;

      const apiKey = await ApiKeyService.getApiKey(keyId, currentUser.userId);

      if (!apiKey) {
        return reply.status(404).send({ error: 'API key not found' });
      }

      return reply.status(200).send(toApiKeyDTO(apiKey));
    };

  fastify.get('/:keyId', {
    preHandler: [
      authenticate,
      rateLimits.read,
      validate({
        params: {
          keyId: { type: 'string', required: true, pattern: patterns.uuid },
        },
      }),
    ],
    handler: getApiKeyHandler,
  });

  /**
   * PUT /api/v1/keys/:keyId
   * Update an API key
   *
   * @param keyId - API key ID
   * @body name - Updated name (optional)
   * @body scopes - Updated scopes (optional)
   * @returns Updated API key
   * @throws {UnauthorizedError} If not authenticated
   * @throws {NotFoundError} If key not found or not owned by user
   * @throws {ValidationError} If input validation fails
   */
  const updateApiKeyHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Params: { keyId: string }; Body: UpdateApiKeyRequest }
  > = async (request, reply) => {
    const currentUser = (request as AuthenticatedRequest).user;
    const { keyId } = request.params;
    const { name, scopes } = request.body;

    // Validate scopes if provided
    if (scopes) {
      const validScopes: ApiKeyScope[] = ['read', 'write', 'execute'];
      const invalidScopes = scopes.filter(scope => !validScopes.includes(scope));
      if (invalidScopes.length > 0) {
        throw new BadRequestError(
          `Invalid scope(s): ${invalidScopes.join(', ')}. Valid scopes are: ${validScopes.join(', ')}`
        );
      }
    }

    const updated = await ApiKeyService.updateApiKey(keyId, currentUser.userId, {
      name,
      scopes,
    });

    if (!updated) {
      return reply.status(404).send({ error: 'API key not found' });
    }

    return reply.status(200).send(toApiKeyDTO(updated));
  };

  fastify.put('/:keyId', {
    preHandler: [
      authenticate,
      rateLimits.write,
      validate({
        params: {
          keyId: { type: 'string', required: true, pattern: patterns.uuid },
        },
        body: {
          name: { type: 'string', required: false, minLength: 1, maxLength: 100 },
          scopes: {
            type: 'array',
            required: false,
            items: { type: 'string' },
            minItems: 1,
          },
        },
      }),
    ],
    handler: updateApiKeyHandler,
  });

  /**
   * DELETE /api/v1/keys/:keyId
   * Revoke (delete) an API key
   *
   * @param keyId - API key ID
   * @returns Success message
   * @throws {UnauthorizedError} If not authenticated
   * @throws {NotFoundError} If key not found or not owned by user
   */
  const deleteApiKeyHandler: RouteHandlerMethod<any, any, any, { Params: { keyId: string } }> =
    async (request, reply) => {
      const currentUser = (request as AuthenticatedRequest).user;
      const { keyId } = request.params;

      const deleted = await ApiKeyService.deleteApiKey(keyId, currentUser.userId);

      if (!deleted) {
        return reply.status(404).send({ error: 'API key not found' });
      }

      return reply.status(200).send({ success: true, message: 'API key revoked' });
    };

  fastify.delete('/:keyId', {
    preHandler: [
      authenticate,
      rateLimits.write,
      validate({
        params: {
          keyId: { type: 'string', required: true, pattern: patterns.uuid },
        },
      }),
    ],
    handler: deleteApiKeyHandler,
  });
}
