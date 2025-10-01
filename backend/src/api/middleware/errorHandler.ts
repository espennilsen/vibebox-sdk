/**
 * Error Handler Middleware
 * Transforms service errors to HTTP responses
 * Task: Phase 3.5 - API Layer
 */
import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

/**
 * Error response interface
 */
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    statusCode: number;
    fields?: Record<string, string>;
    stack?: string;
  };
}

/**
 * Global error handler for Fastify
 * Transforms AppError instances and other errors into proper HTTP responses
 *
 * @param error - Error object
 * @param request - Fastify request object
 * @param reply - Fastify reply object
 *
 * @example
 * ```typescript
 * // In server setup:
 * fastify.setErrorHandler(errorHandler);
 * ```
 */
export async function errorHandler(
  error: Error | FastifyError | AppError,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Handle AppError instances
  if (error instanceof AppError) {
    const response: ErrorResponse = {
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
      },
    };

    // Add validation fields if present
    if ('fields' in error && error.fields) {
      response.error.fields = error.fields as Record<string, string>;
    }

    // Add stack trace in development
    if (process.env.NODE_ENV === 'development') {
      response.error.stack = error.stack;
    }

    // Log error based on severity
    if (error.statusCode >= 500) {
      logger.error(
        {
          err: error,
          method: request.method,
          url: request.url,
          userId: (request as { user?: { userId: string } }).user?.userId,
        },
        'Server error'
      );
    } else if (error.statusCode >= 400) {
      logger.warn(
        {
          code: error.code,
          message: error.message,
          method: request.method,
          url: request.url,
        },
        'Client error'
      );
    }

    return reply.status(error.statusCode).send(response);
  }

  // Handle Fastify validation errors
  if ('validation' in error && error.validation) {
    logger.warn(
      {
        validation: error.validation,
        method: request.method,
        url: request.url,
      },
      'Validation error'
    );

    const response: ErrorResponse = {
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message || 'Validation failed',
        statusCode: 400,
      },
    };

    return reply.status(400).send(response);
  }

  // Handle JWT errors
  if (error.message?.includes('jwt') || error.message?.includes('token')) {
    logger.warn(
      {
        message: error.message,
        method: request.method,
        url: request.url,
      },
      'Authentication error'
    );

    const response: ErrorResponse = {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        statusCode: 401,
      },
    };

    return reply.status(401).send(response);
  }

  // Handle unknown errors
  logger.error(
    {
      err: error,
      method: request.method,
      url: request.url,
      userId: (request as { user?: { userId: string } }).user?.userId,
    },
    'Unhandled error'
  );

  const response: ErrorResponse = {
    error: {
      code: 'INTERNAL_ERROR',
      message:
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : error.message || 'Internal server error',
      statusCode: 500,
    },
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development' && error.stack) {
    response.error.stack = error.stack;
  }

  return reply.status(500).send(response);
}

/**
 * Not found handler
 * Handles 404 errors for undefined routes
 *
 * @param request - Fastify request object
 * @param reply - Fastify reply object
 *
 * @example
 * ```typescript
 * // In server setup:
 * fastify.setNotFoundHandler(notFoundHandler);
 * ```
 */
export async function notFoundHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  logger.warn(
    {
      method: request.method,
      url: request.url,
    },
    'Route not found'
  );

  const response: ErrorResponse = {
    error: {
      code: 'NOT_FOUND',
      message: `Route ${request.method} ${request.url} not found`,
      statusCode: 404,
    },
  };

  return reply.status(404).send(response);
}
