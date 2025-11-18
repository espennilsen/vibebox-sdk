/**
 * VibeBox SDK
 *
 * Official TypeScript/JavaScript SDK for VibeBox - Programmatic sandbox management
 *
 * @packageDocumentation
 */

// Main client
export { VibeBox } from './client';

// Resources
export {
  Sandbox,
  SandboxesResource,
  GitResource,
  FilesResource,
  ExecutionResource,
  EnvironmentVariablesResource,
  ApiKeysResource,
} from './resources';

// Types
export type {
  VibeBoxConfig,
  Environment,
  EnvironmentStatus,
  CreateSandboxOptions,
  GitCloneOptions,
  GitCloneResult,
  GitPullOptions,
  GitPullResult,
  GitPushOptions,
  GitPushResult,
  GitCommitOptions,
  GitCommitResult,
  GitCheckoutOptions,
  GitStatus,
  GitDiff,
  GitDiffFile,
  GitAuthConfig,
  GitAuthType,
  ExecutionOptions,
  ExecutionResult,
  Execution,
  ExecutionStatus,
  ProgrammingLanguage,
  FileInfo,
  ListFilesResponse,
  UploadResult,
  DeleteFileOptions,
  MakeDirOptions,
  CopyFileRequest,
  MoveFileRequest,
  SearchFilesResponse,
  ApiKey,
  ApiKeyScope,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  UpdateApiKeyRequest,
  LogEntry,
  LogLevel,
  LogSubscription,
  LogSubscriptionOptions,
  EnvironmentVariable,
} from './types';

// Errors
export {
  VibeBoxError,
  ApiError,
  TimeoutError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  createApiError,
  isRetryableError,
} from './errors';

// Utilities
export { parseDuration, formatDuration } from './utils/duration-parser';
export { slugify, generateSandboxName, isValidUrl, isValidApiKey } from './utils/validation';

// Default export
export { VibeBox as default } from './client';
