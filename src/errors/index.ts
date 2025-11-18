/**
 * VibeBox SDK Error Classes
 *
 * Custom error classes for handling various error scenarios.
 */

import type { ApiErrorResponse } from '../types';

/**
 * Base error class for all VibeBox SDK errors
 */
export class VibeBoxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VibeBoxError';
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when an API request fails
 */
export class ApiError extends VibeBoxError {
  public readonly statusCode: number;
  public readonly response?: ApiErrorResponse;

  constructor(message: string, statusCode: number, response?: ApiErrorResponse) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.response = response;
  }

  /**
   * Check if error is a specific HTTP status code
   */
  is(statusCode: number): boolean {
    return this.statusCode === statusCode;
  }

  /**
   * Check if error is a 4xx client error
   */
  isClientError(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }

  /**
   * Check if error is a 5xx server error
   */
  isServerError(): boolean {
    return this.statusCode >= 500 && this.statusCode < 600;
  }
}

/**
 * Error thrown when a request times out
 */
export class TimeoutError extends VibeBoxError {
  public readonly timeout: number;

  constructor(message: string, timeout: number) {
    super(message);
    this.name = 'TimeoutError';
    this.timeout = timeout;
  }
}

/**
 * Error thrown when input validation fails
 */
export class ValidationError extends VibeBoxError {
  public readonly errors: Record<string, string>;

  constructor(message: string, errors: Record<string, string>) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * Error thrown when authentication fails
 */
export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication failed', response?: ApiErrorResponse) {
    super(message, 401, response);
    this.name = 'AuthenticationError';
  }
}

/**
 * Error thrown when authorization fails (insufficient permissions)
 */
export class AuthorizationError extends ApiError {
  constructor(message: string = 'Insufficient permissions', response?: ApiErrorResponse) {
    super(message, 403, response);
    this.name = 'AuthorizationError';
  }
}

/**
 * Error thrown when a resource is not found
 */
export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found', response?: ApiErrorResponse) {
    super(message, 404, response);
    this.name = 'NotFoundError';
  }
}

/**
 * Error thrown when there's a conflict (e.g., resource already exists)
 */
export class ConflictError extends ApiError {
  constructor(message: string = 'Resource conflict', response?: ApiErrorResponse) {
    super(message, 409, response);
    this.name = 'ConflictError';
  }
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends ApiError {
  public readonly retryAfter?: number;

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number, response?: ApiErrorResponse) {
    super(message, 429, response);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Helper function to create appropriate error from API response
 */
export function createApiError(statusCode: number, message: string, response?: ApiErrorResponse): ApiError {
  switch (statusCode) {
    case 401:
      return new AuthenticationError(message, response);
    case 403:
      return new AuthorizationError(message, response);
    case 404:
      return new NotFoundError(message, response);
    case 409:
      return new ConflictError(message, response);
    case 429:
      return new RateLimitError(message, undefined, response);
    default:
      return new ApiError(message, statusCode, response);
  }
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  // Retry on network errors
  if (error.name === 'AbortError' || error.name === 'TimeoutError') {
    return true;
  }

  // Retry on 5xx server errors
  if (error instanceof ApiError && error.isServerError()) {
    return true;
  }

  // Retry on specific 4xx errors
  if (error instanceof RateLimitError) {
    return true;
  }

  // Don't retry on other errors
  return false;
}
