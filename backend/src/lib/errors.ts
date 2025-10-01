/**
 * Custom Error Classes
 * Provides typed error classes for consistent error handling across the application
 * Task: T067-T080
 */

/**
 * Base application error class
 * All custom errors extend from this base class
 */
export abstract class AppError extends Error {
  /**
   * HTTP status code associated with this error
   */
  abstract readonly statusCode: number;

  /**
   * Machine-readable error code
   */
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * NotFoundError - Resource not found (HTTP 404)
 *
 * Used when a requested resource does not exist in the database
 *
 * @example
 * ```typescript
 * throw new NotFoundError('User not found');
 * ```
 */
export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = 'NOT_FOUND';

  constructor(message: string = 'Resource not found') {
    super(message);
  }
}

/**
 * UnauthorizedError - Authentication failure (HTTP 401)
 *
 * Used when authentication is required but credentials are missing or invalid
 *
 * @example
 * ```typescript
 * throw new UnauthorizedError('Invalid credentials');
 * ```
 */
export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly code = 'UNAUTHORIZED';

  constructor(message: string = 'Authentication required') {
    super(message);
  }
}

/**
 * ForbiddenError - Authorization failure (HTTP 403)
 *
 * Used when user is authenticated but lacks permission for the operation
 *
 * @example
 * ```typescript
 * throw new ForbiddenError('You do not have permission to access this team');
 * ```
 */
export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly code = 'FORBIDDEN';

  constructor(message: string = 'Access forbidden') {
    super(message);
  }
}

/**
 * ValidationError - Invalid input data (HTTP 400)
 *
 * Used when request data fails validation rules
 *
 * @example
 * ```typescript
 * throw new ValidationError('Email format is invalid');
 * ```
 */
export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly code = 'VALIDATION_ERROR';

  /**
   * Optional field-specific validation errors
   */
  readonly fields?: Record<string, string>;

  constructor(message: string = 'Validation failed', fields?: Record<string, string>) {
    super(message);
    this.fields = fields;
  }
}

/**
 * ConflictError - Resource conflict (HTTP 409)
 *
 * Used when operation conflicts with existing resource state
 *
 * @example
 * ```typescript
 * throw new ConflictError('Email already exists');
 * ```
 */
export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly code = 'CONFLICT';

  constructor(message: string = 'Resource conflict') {
    super(message);
  }
}

/**
 * InternalServerError - Server-side error (HTTP 500)
 *
 * Used for unexpected server errors
 *
 * @example
 * ```typescript
 * throw new InternalServerError('Database connection failed');
 * ```
 */
export class InternalServerError extends AppError {
  readonly statusCode = 500;
  readonly code = 'INTERNAL_ERROR';

  constructor(message: string = 'Internal server error') {
    super(message);
  }
}

/**
 * BadRequestError - Invalid request (HTTP 400)
 *
 * Used for malformed requests or invalid parameters
 *
 * @example
 * ```typescript
 * throw new BadRequestError('Invalid environment status transition');
 * ```
 */
export class BadRequestError extends AppError {
  readonly statusCode = 400;
  readonly code = 'BAD_REQUEST';

  constructor(message: string = 'Bad request') {
    super(message);
  }
}
