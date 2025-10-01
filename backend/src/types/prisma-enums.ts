/**
 * Prisma Enum Types
 * Temporary workaround for missing Prisma client generation
 * These enums should match prisma/schema.prisma
 */

/**
 * User role within a team
 */
export enum UserTeamRole {
  admin = 'admin',
  developer = 'developer',
  viewer = 'viewer',
}

/**
 * Network protocol for port mappings
 */
export enum Protocol {
  tcp = 'tcp',
  udp = 'udp',
}

/**
 * Environment status
 */
export enum EnvironmentStatus {
  stopped = 'stopped',
  starting = 'starting',
  running = 'running',
  stopping = 'stopping',
  error = 'error',
}

/**
 * Session type
 */
export enum SessionType {
  vscode_server = 'vscode_server',
  tmux = 'tmux',
  shell = 'shell',
}

/**
 * Session status
 */
export enum SessionStatus {
  starting = 'starting',
  active = 'active',
  idle = 'idle',
  terminated = 'terminated',
}

/**
 * Environment extension installation status
 */
export enum EnvironmentExtensionStatus {
  pending = 'pending',
  installing = 'installing',
  installed = 'installed',
  failed = 'failed',
  uninstalling = 'uninstalling',
}

/**
 * Log stream type
 */
export enum LogStream {
  stdout = 'stdout',
  stderr = 'stderr',
}

/**
 * Log level
 */
export enum LogLevel {
  debug = 'debug',
  info = 'info',
  warn = 'warn',
  error = 'error',
}
