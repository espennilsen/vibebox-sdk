import { Output } from './output.js';

/**
 * Custom error class for CLI errors
 */
export class CliError extends Error {
  constructor(
    message: string,
    public code?: string,
    public exitCode: number = 1
  ) {
    super(message);
    this.name = 'CliError';
  }
}

/**
 * Error handler for the CLI
 */
export function handleError(error: unknown): never {
  if (error instanceof CliError) {
    Output.error(error.message);
    if (error.code) {
      Output.debug(`Error code: ${error.code}`);
    }
    process.exit(error.exitCode);
  }

  if (error instanceof Error) {
    Output.error('An unexpected error occurred', error);
    process.exit(1);
  }

  Output.error('An unknown error occurred');
  process.exit(1);
}

/**
 * Authentication error
 */
export class AuthenticationError extends CliError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTH_ERROR', 1);
    this.name = 'AuthenticationError';
  }
}

/**
 * Validation error
 */
export class ValidationError extends CliError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 1);
    this.name = 'ValidationError';
  }
}

/**
 * Not found error
 */
export class NotFoundError extends CliError {
  constructor(resource: string, identifier: string) {
    super(`${resource} '${identifier}' not found`, 'NOT_FOUND', 1);
    this.name = 'NotFoundError';
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends CliError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR', 1);
    this.name = 'ConfigurationError';
  }
}
