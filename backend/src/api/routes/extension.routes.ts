/**
 * Extension Routes
 * Handles VS Code extension search, installation, and management
 * Task: Phase 3.5 - API Layer
 */
import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { ExtensionService } from '@/services';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { requireEnvironmentAccess } from '../middleware/authorize';
import { validate, patterns } from '../middleware/validation';
import { rateLimits } from '../middleware/rateLimit';

/**
 * Register extension routes
 *
 * @param fastify - Fastify instance
 *
 * @example
 * ```typescript
 * await fastify.register(extensionRoutes);
 * ```
 */
export async function extensionRoutes(fastify: FastifyInstance): Promise<void> {
  const extensionService = new ExtensionService();

  /**
   * GET /api/v1/extensions/search
   * Search for VS Code extensions
   *
   * @query q - Search query
   * @query page - Page number (default: 1)
   * @query limit - Results per page (default: 20, max: 100)
   * @returns Array of extension search results
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ValidationError} If input validation fails
   */
  const searchExtensionsHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Querystring: { q: string; page?: number; limit?: number } }
  > = async (request, reply) => {
    const { q, limit = 20 } = request.query;
    const results = await extensionService.searchExtensions(q, limit);
    return reply.status(200).send(results);
  };

  fastify.get('/search', {
    preHandler: [
      authenticate,
      rateLimits.read,
      validate({
        query: {
          q: { type: 'string', required: true, min: 1, max: 255 },
          page: { type: 'number', min: 1 },
          limit: { type: 'number', min: 1, max: 100 },
        },
      }),
    ],
    handler: searchExtensionsHandler,
  });

  /**
   * POST /api/v1/extensions/install
   * Install an extension in an environment
   *
   * @body environmentId - Environment ID
   * @body extensionId - Extension ID (e.g., "ms-python.python")
   * @body version - Extension version (optional, defaults to latest)
   * @returns Installed extension data
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ValidationError} If input validation fails
   * @throws {ForbiddenError} If user doesn't have access to environment
   * @throws {NotFoundError} If environment or extension not found
   * @throws {ConflictError} If extension is already installed
   */
  const installExtensionHandler: RouteHandlerMethod<
    any,
    any,
    any,
    {
      Body: {
        environmentId: string;
        extensionId: string;
        version?: string;
      };
    }
  > = async (request, reply) => {
    const { userId } = (request as AuthenticatedRequest).user;
    const { environmentId, extensionId } = request.body;

    const extension = await extensionService.installExtension(environmentId, extensionId, userId);

    return reply.status(201).send(extension);
  };

  fastify.post('/install', {
    preHandler: [
      authenticate,
      rateLimits.intensive,
      validate({
        body: {
          environmentId: { type: 'string', required: true, pattern: patterns.uuid },
          extensionId: { type: 'string', required: true, min: 1, max: 255 },
          version: { type: 'string', pattern: patterns.semver },
        },
      }),
    ],
    handler: installExtensionHandler,
  });

  /**
   * DELETE /api/v1/extensions/:extensionId
   * Uninstall an extension from an environment
   *
   * @param extensionId - Environment extension ID (database record ID)
   * @returns Success message
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ForbiddenError} If user doesn't have access to environment
   * @throws {NotFoundError} If extension installation not found
   */
  const uninstallExtensionHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Params: { extensionId: string } }
  > = async (request, reply) => {
    const { extensionId } = request.params;
    const { userId } = (request as AuthenticatedRequest).user;

    // Get the extension record to find the environment
    const extension = await extensionService.prisma.environmentExtension.findUnique({
      where: { id: extensionId },
      select: { environmentId: true, extensionId: true },
    });

    if (!extension) {
      return reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Extension installation not found',
          statusCode: 404,
        },
      });
    }

    await extensionService.uninstallExtension(
      extension.environmentId,
      extension.extensionId,
      userId
    );
    return reply.status(200).send({ message: 'Extension uninstalled successfully' });
  };

  fastify.delete('/:extensionId', {
    preHandler: [
      authenticate,
      rateLimits.write,
      validate({
        params: {
          extensionId: { type: 'string', required: true, pattern: patterns.uuid },
        },
      }),
    ],
    handler: uninstallExtensionHandler,
  });

  /**
   * GET /api/v1/environments/:envId/extensions
   * List all installed extensions in an environment
   *
   * @param envId - Environment ID
   * @returns Array of installed extensions
   * @throws {UnauthorizedError} If not authenticated
   * @throws {ForbiddenError} If user doesn't have access to environment
   * @throws {NotFoundError} If environment not found
   */
  const listInstalledExtensionsHandler: RouteHandlerMethod<
    any,
    any,
    any,
    { Params: { envId: string } }
  > = async (request, reply) => {
    const { envId } = request.params;
    const { userId } = (request as AuthenticatedRequest).user;
    const extensions = await extensionService.listInstalledExtensions(envId, userId);
    return reply.status(200).send(extensions);
  };

  fastify.get('/environments/:envId/extensions', {
    preHandler: [
      authenticate,
      rateLimits.read,
      validate({
        params: {
          envId: { type: 'string', required: true, pattern: patterns.uuid },
        },
      }),
      requireEnvironmentAccess,
    ],
    handler: listInstalledExtensionsHandler,
  });
}
