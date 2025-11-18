/**
 * File Routes
 * Handles file operations within sandbox environments
 * Mounted under /api/v1/environments/:environmentId/files
 */

import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { FileService } from '@/services';
import { authenticateFlexible } from '../middleware/api-key-auth';
import { requireScope } from '../middleware/api-key-auth';
import { AuthenticatedRequest } from '../middleware/auth';
import { validate, patterns } from '../middleware/validation';
import { rateLimits } from '../middleware/rateLimit';
import { NotFoundError, ForbiddenError, BadRequestError } from '@/lib/errors';
import {
  ListFilesResponse,
  UploadFileRequest,
  UploadFileResponse,
  DeleteFileResponse,
  FileInfo,
} from '@vibebox/types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Verifies user has access to the environment
 *
 * @param environmentId - Environment ID
 * @param userId - User ID
 * @throws {NotFoundError} If environment not found
 * @throws {ForbiddenError} If user doesn't have access
 */
async function verifyEnvironmentAccess(
  environmentId: string,
  userId: string
): Promise<void> {
  const environment = await prisma.environment.findUnique({
    where: { id: environmentId },
    include: {
      project: {
        include: {
          team: {
            include: {
              userTeams: true,
            },
          },
        },
      },
    },
  });

  if (!environment) {
    throw new NotFoundError('Environment not found');
  }

  const isCreator = environment.creatorId === userId;
  const isTeamMember = environment.project.team?.userTeams.some(
    ut => ut.userId === userId
  );
  const isOwner = environment.project.ownerId === userId;

  if (!isCreator && !isTeamMember && !isOwner) {
    throw new ForbiddenError('You do not have access to this environment');
  }
}

/**
 * Register file routes
 * These routes are nested under environment routes
 *
 * @param fastify - Fastify instance
 */
export async function fileRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/environments/:environmentId/files
   * List files in a directory
   *
   * @param environmentId - Environment ID
   * @query path - Directory path (default: /workspace)
   * @returns List of files
   */
  const listFilesHandler: RouteHandlerMethod<
    any,
    any,
    any,
    {
      Params: { environmentId: string };
      Querystring: { path?: string };
    }
  > = async (request, reply) => {
    const { environmentId } = request.params;
    const currentUser = (request as AuthenticatedRequest).user;
    const path = request.query.path || '/workspace';

    await verifyEnvironmentAccess(environmentId, currentUser.userId);

    const result = await FileService.listFiles(environmentId, path);

    return reply.status(200).send(result);
  };

  fastify.get('/', {
    preHandler: [
      authenticateFlexible,
      requireScope('read'),
      rateLimits.read,
      validate({
        params: {
          environmentId: { type: 'string', required: true, pattern: patterns.uuid },
        },
        query: {
          path: { type: 'string', required: false },
        },
      }),
    ],
    handler: listFilesHandler,
  });

  /**
   * GET /api/v1/environments/:environmentId/files/info
   * Get file information
   *
   * @param environmentId - Environment ID
   * @query path - File path
   * @returns File info
   */
  const getFileInfoHandler: RouteHandlerMethod<
    any,
    any,
    any,
    {
      Params: { environmentId: string };
      Querystring: { path: string };
    }
  > = async (request, reply) => {
    const { environmentId } = request.params;
    const currentUser = (request as AuthenticatedRequest).user;
    const { path } = request.query;

    if (!path) {
      throw new BadRequestError('path query parameter is required');
    }

    await verifyEnvironmentAccess(environmentId, currentUser.userId);

    const fileInfo = await FileService.getFileInfo(environmentId, path);

    return reply.status(200).send(fileInfo);
  };

  fastify.get('/info', {
    preHandler: [
      authenticateFlexible,
      requireScope('read'),
      rateLimits.read,
      validate({
        params: {
          environmentId: { type: 'string', required: true, pattern: patterns.uuid },
        },
        query: {
          path: { type: 'string', required: true },
        },
      }),
    ],
    handler: getFileInfoHandler,
  });

  /**
   * GET /api/v1/environments/:environmentId/files/download
   * Download a file
   *
   * @param environmentId - Environment ID
   * @query path - File path
   * @returns File content
   */
  const downloadFileHandler: RouteHandlerMethod<
    any,
    any,
    any,
    {
      Params: { environmentId: string };
      Querystring: { path: string };
    }
  > = async (request, reply) => {
    const { environmentId } = request.params;
    const currentUser = (request as AuthenticatedRequest).user;
    const { path } = request.query;

    if (!path) {
      throw new BadRequestError('path query parameter is required');
    }

    await verifyEnvironmentAccess(environmentId, currentUser.userId);

    const content = await FileService.readFile(environmentId, path);

    // Set appropriate headers for file download
    const filename = path.split('/').pop() || 'file';
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    reply.header('Content-Type', 'application/octet-stream');

    return reply.status(200).send(content);
  };

  fastify.get('/download', {
    preHandler: [
      authenticateFlexible,
      requireScope('read'),
      rateLimits.read,
      validate({
        params: {
          environmentId: { type: 'string', required: true, pattern: patterns.uuid },
        },
        query: {
          path: { type: 'string', required: true },
        },
      }),
    ],
    handler: downloadFileHandler,
  });

  /**
   * POST /api/v1/environments/:environmentId/files
   * Upload a file
   *
   * @param environmentId - Environment ID
   * @body path - File path
   * @body content - File content (string or base64)
   * @body permissions - File permissions (optional, default: '644')
   * @returns Upload result
   */
  const uploadFileHandler: RouteHandlerMethod<
    any,
    any,
    any,
    {
      Params: { environmentId: string };
      Body: UploadFileRequest;
    }
  > = async (request, reply) => {
    const { environmentId } = request.params;
    const currentUser = (request as AuthenticatedRequest).user;
    const { path, content, permissions } = request.body;

    await verifyEnvironmentAccess(environmentId, currentUser.userId);

    // Handle base64 encoded content
    let fileContent: string | Buffer = content;
    if (typeof content === 'string' && content.startsWith('data:')) {
      // Extract base64 data
      const base64Data = content.split(',')[1];
      fileContent = Buffer.from(base64Data, 'base64');
    }

    const result = await FileService.writeFile(
      environmentId,
      path,
      fileContent,
      permissions
    );

    return reply.status(201).send(result);
  };

  fastify.post('/', {
    preHandler: [
      authenticateFlexible,
      requireScope('write'),
      rateLimits.write,
      validate({
        params: {
          environmentId: { type: 'string', required: true, pattern: patterns.uuid },
        },
        body: {
          path: { type: 'string', required: true, minLength: 1 },
          content: { type: 'string', required: true },
          permissions: { type: 'string', required: false },
        },
      }),
    ],
    handler: uploadFileHandler,
  });

  /**
   * DELETE /api/v1/environments/:environmentId/files
   * Delete a file or directory
   *
   * @param environmentId - Environment ID
   * @query path - Path to delete
   * @query recursive - Delete directories recursively (default: false)
   * @returns Delete result
   */
  const deleteFileHandler: RouteHandlerMethod<
    any,
    any,
    any,
    {
      Params: { environmentId: string };
      Querystring: { path: string; recursive?: string };
    }
  > = async (request, reply) => {
    const { environmentId } = request.params;
    const currentUser = (request as AuthenticatedRequest).user;
    const { path, recursive } = request.query;

    if (!path) {
      throw new BadRequestError('path query parameter is required');
    }

    await verifyEnvironmentAccess(environmentId, currentUser.userId);

    const isRecursive = recursive === 'true';
    const result = await FileService.deleteFile(environmentId, path, isRecursive);

    return reply.status(200).send(result);
  };

  fastify.delete('/', {
    preHandler: [
      authenticateFlexible,
      requireScope('write'),
      rateLimits.write,
      validate({
        params: {
          environmentId: { type: 'string', required: true, pattern: patterns.uuid },
        },
        query: {
          path: { type: 'string', required: true },
          recursive: { type: 'string', required: false },
        },
      }),
    ],
    handler: deleteFileHandler,
  });

  /**
   * POST /api/v1/environments/:environmentId/files/mkdir
   * Create a directory
   *
   * @param environmentId - Environment ID
   * @body path - Directory path
   * @body recursive - Create parent directories (default: true)
   * @returns Success message
   */
  const createDirectoryHandler: RouteHandlerMethod<
    any,
    any,
    any,
    {
      Params: { environmentId: string };
      Body: { path: string; recursive?: boolean };
    }
  > = async (request, reply) => {
    const { environmentId } = request.params;
    const currentUser = (request as AuthenticatedRequest).user;
    const { path, recursive = true } = request.body;

    await verifyEnvironmentAccess(environmentId, currentUser.userId);

    await FileService.createDirectory(environmentId, path, recursive);

    return reply.status(201).send({
      success: true,
      message: 'Directory created',
      path,
    });
  };

  fastify.post('/mkdir', {
    preHandler: [
      authenticateFlexible,
      requireScope('write'),
      rateLimits.write,
      validate({
        params: {
          environmentId: { type: 'string', required: true, pattern: patterns.uuid },
        },
        body: {
          path: { type: 'string', required: true, minLength: 1 },
          recursive: { type: 'boolean', required: false },
        },
      }),
    ],
    handler: createDirectoryHandler,
  });

  /**
   * POST /api/v1/environments/:environmentId/files/copy
   * Copy a file or directory
   *
   * @param environmentId - Environment ID
   * @body source - Source path
   * @body dest - Destination path
   * @body recursive - Copy directories recursively (default: false)
   * @returns Success message
   */
  const copyFileHandler: RouteHandlerMethod<
    any,
    any,
    any,
    {
      Params: { environmentId: string };
      Body: { source: string; dest: string; recursive?: boolean };
    }
  > = async (request, reply) => {
    const { environmentId } = request.params;
    const currentUser = (request as AuthenticatedRequest).user;
    const { source, dest, recursive = false } = request.body;

    await verifyEnvironmentAccess(environmentId, currentUser.userId);

    await FileService.copyFile(environmentId, source, dest, recursive);

    return reply.status(200).send({
      success: true,
      message: 'File copied',
      source,
      dest,
    });
  };

  fastify.post('/copy', {
    preHandler: [
      authenticateFlexible,
      requireScope('write'),
      rateLimits.write,
      validate({
        params: {
          environmentId: { type: 'string', required: true, pattern: patterns.uuid },
        },
        body: {
          source: { type: 'string', required: true, minLength: 1 },
          dest: { type: 'string', required: true, minLength: 1 },
          recursive: { type: 'boolean', required: false },
        },
      }),
    ],
    handler: copyFileHandler,
  });

  /**
   * POST /api/v1/environments/:environmentId/files/move
   * Move/rename a file or directory
   *
   * @param environmentId - Environment ID
   * @body source - Source path
   * @body dest - Destination path
   * @returns Success message
   */
  const moveFileHandler: RouteHandlerMethod<
    any,
    any,
    any,
    {
      Params: { environmentId: string };
      Body: { source: string; dest: string };
    }
  > = async (request, reply) => {
    const { environmentId } = request.params;
    const currentUser = (request as AuthenticatedRequest).user;
    const { source, dest } = request.body;

    await verifyEnvironmentAccess(environmentId, currentUser.userId);

    await FileService.moveFile(environmentId, source, dest);

    return reply.status(200).send({
      success: true,
      message: 'File moved',
      source,
      dest,
    });
  };

  fastify.post('/move', {
    preHandler: [
      authenticateFlexible,
      requireScope('write'),
      rateLimits.write,
      validate({
        params: {
          environmentId: { type: 'string', required: true, pattern: patterns.uuid },
        },
        body: {
          source: { type: 'string', required: true, minLength: 1 },
          dest: { type: 'string', required: true, minLength: 1 },
        },
      }),
    ],
    handler: moveFileHandler,
  });

  /**
   * GET /api/v1/environments/:environmentId/files/search
   * Search for files matching a pattern
   *
   * @param environmentId - Environment ID
   * @query path - Base path to search in
   * @query pattern - Search pattern (glob)
   * @returns Array of matching file paths
   */
  const searchFilesHandler: RouteHandlerMethod<
    any,
    any,
    any,
    {
      Params: { environmentId: string };
      Querystring: { path: string; pattern: string };
    }
  > = async (request, reply) => {
    const { environmentId } = request.params;
    const currentUser = (request as AuthenticatedRequest).user;
    const { path, pattern } = request.query;

    if (!path || !pattern) {
      throw new BadRequestError('path and pattern query parameters are required');
    }

    await verifyEnvironmentAccess(environmentId, currentUser.userId);

    const files = await FileService.searchFiles(environmentId, path, pattern);

    return reply.status(200).send({ files });
  };

  fastify.get('/search', {
    preHandler: [
      authenticateFlexible,
      requireScope('read'),
      rateLimits.read,
      validate({
        params: {
          environmentId: { type: 'string', required: true, pattern: patterns.uuid },
        },
        query: {
          path: { type: 'string', required: true },
          pattern: { type: 'string', required: true },
        },
      }),
    ],
    handler: searchFilesHandler,
  });
}
