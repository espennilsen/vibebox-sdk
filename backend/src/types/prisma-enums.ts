/**
 * Prisma Enum Types
 * Re-exports from @prisma/client for convenient imports
 */

// Re-export Prisma enums
export {
  UserTeamRole,
  Protocol,
  EnvironmentStatus,
  SessionType,
  SessionStatus,
  EnvironmentExtensionStatus,
  LogStream,
} from '@prisma/client';

/**
 * Log level enum (not in Prisma schema)
 */
export enum LogLevel {
  debug = 'debug',
  info = 'info',
  warn = 'warn',
  error = 'error',
}
