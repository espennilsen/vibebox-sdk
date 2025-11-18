/**
 * VibeBox SDK Type Definitions
 *
 * This file contains all type definitions used by the SDK.
 * Types are based on the VibeBox API specification.
 */

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * VibeBox SDK configuration options
 */
export interface VibeBoxConfig {
  /** API key for authentication (can also be set via VIBEBOX_API_KEY env var) */
  apiKey?: string;

  /** Base URL for VibeBox API (default: http://localhost:3000) */
  baseUrl?: string;

  /** Default project ID for sandbox creation */
  defaultProjectId?: string;

  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;

  /** Number of retry attempts for failed requests (default: 3) */
  retries?: number;

  /** Initial retry delay in milliseconds (default: 1000) */
  retryDelay?: number;

  /** Custom HTTP headers to include in all requests */
  headers?: Record<string, string>;
}

// ============================================================================
// Environment/Sandbox Types
// ============================================================================

export type EnvironmentStatus = 'creating' | 'running' | 'stopped' | 'paused' | 'error' | 'destroyed';

export interface Environment {
  id: string;
  name: string;
  slug: string;
  description?: string;
  projectId: string;
  creatorId: string;
  baseImage: string;
  containerId: string | null;
  status: EnvironmentStatus;
  cpuLimit: number;
  memoryLimit: number;
  storageLimit: number;
  ephemeral: boolean;
  expiresAt: string | null;
  pausedAt: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  stoppedAt: string | null;
}

export interface CreateSandboxOptions {
  /** Sandbox name (auto-generated if not provided) */
  name?: string;

  /** URL-friendly slug (auto-generated if not provided) */
  slug?: string;

  /** Project ID (uses default from config if not provided) */
  projectId?: string;

  /** Docker base image */
  baseImage?: string;

  /** Template ID (alternative to baseImage) */
  template?: string;

  /** CPU limit in cores (default: 2.0) */
  cpuLimit?: number;

  /** Memory limit in MB (default: 4096) */
  memoryLimit?: number;

  /** Storage limit in MB (default: 20480) */
  storageLimit?: number;

  /** Auto-start sandbox after creation (default: true) */
  autoStart?: boolean;

  /** Ephemeral sandbox (auto-cleanup on expiration) (default: false) */
  ephemeral?: boolean;

  /** Expiration timeout (e.g., "2h", "30m", "1d") */
  timeout?: string;

  /** Git repository configuration */
  git?: GitCloneRequest;

  /** Environment variables */
  env?: Record<string, string>;
}

// ============================================================================
// Git Types
// ============================================================================

export type GitAuthType = 'token' | 'ssh';

export interface GitAuthConfig {
  type: GitAuthType;
  token?: string;
  privateKey?: string;
}

export interface GitCloneRequest {
  url: string;
  branch?: string;
  path?: string;
  depth?: number;
  auth?: GitAuthConfig;
}

export interface GitCloneOptions {
  branch?: string;
  path?: string;
  depth?: number;
  auth?: GitAuthConfig;
}

export interface GitCloneResult {
  success: boolean;
  path: string;
  branch: string;
  commit?: string;
}

export interface GitPullOptions {
  remote?: string;
  branch?: string;
}

export interface GitPullResult {
  success: boolean;
  updatedFiles: number;
  commit: string;
}

export interface GitPushOptions {
  remote?: string;
  branch?: string;
  force?: boolean;
}

export interface GitPushResult {
  success: boolean;
  pushed: boolean;
  commit: string;
}

export interface GitCommitOptions {
  files?: string[];
  author?: {
    name: string;
    email: string;
  };
  all?: boolean;
}

export interface GitCommitResult {
  success: boolean;
  commit: string;
  filesChanged: number;
}

export interface GitCheckoutOptions {
  create?: boolean;
}

export interface GitStatus {
  branch: string;
  modified: string[];
  added: string[];
  deleted: string[];
  untracked: string[];
  ahead: number;
  behind: number;
}

export interface GitDiffFile {
  path: string;
  status: 'modified' | 'added' | 'deleted';
  additions: number;
  deletions: number;
  diff: string;
}

export interface GitDiff {
  files: GitDiffFile[];
}

// ============================================================================
// Execution Types
// ============================================================================

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type ProgrammingLanguage = 'javascript' | 'typescript' | 'python' | 'bash' | 'sh';

export interface ExecutionOptions {
  /** Programming language (auto-detected if not provided) */
  language?: ProgrammingLanguage;

  /** Execution timeout in milliseconds (default: 30000) */
  timeout?: number;

  /** Environment variables for execution */
  env?: Record<string, string>;

  /** Working directory */
  cwd?: string;

  /** Enable WebSocket streaming (default: false) */
  stream?: boolean;

  /** Retry attempts on failure (default: 0) */
  retries?: number;

  /** Retry delay in milliseconds (default: 1000) */
  retryDelay?: number;
}

export interface ExecutionResult {
  executionId: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  status: ExecutionStatus;
}

export interface Execution {
  id: string;
  environmentId: string;
  userId: string;
  code: string;
  language: ProgrammingLanguage;
  status: ExecutionStatus;
  stdout: string | null;
  stderr: string | null;
  exitCode: number | null;
  duration: number | null;
  timeout: number;
  env: Record<string, string> | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

// ============================================================================
// File Types
// ============================================================================

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  permissions: string;
  modifiedAt: string;
}

export interface ListFilesResponse {
  files: FileInfo[];
  path: string;
}

export interface UploadFileRequest {
  path: string;
  content: string;
  permissions?: string;
}

export interface UploadResult {
  success: boolean;
  path: string;
  size: number;
}

export interface DeleteFileOptions {
  recursive?: boolean;
}

export interface MakeDirOptions {
  recursive?: boolean;
}

export interface CopyFileRequest {
  source: string;
  dest: string;
  recursive?: boolean;
}

export interface MoveFileRequest {
  source: string;
  dest: string;
}

export interface SearchFilesResponse {
  files: string[];
}

// ============================================================================
// API Key Types
// ============================================================================

export type ApiKeyScope = 'read' | 'write' | 'execute';

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiKeyRequest {
  name: string;
  scopes: ApiKeyScope[];
  expiresAt?: string;
}

export interface CreateApiKeyResponse {
  apiKey: ApiKey;
  key: string;
}

export interface UpdateApiKeyRequest {
  name?: string;
  scopes?: ApiKeyScope[];
}

// ============================================================================
// WebSocket Types
// ============================================================================

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  stream: 'stdout' | 'stderr';
  data: string;
  text: string;
}

export interface LogSubscription {
  unsubscribe: () => void;
}

export interface LogSubscriptionOptions {
  filter?: 'stdout' | 'stderr';
  level?: LogLevel;
}

// ============================================================================
// Environment Variables Types
// ============================================================================

export interface EnvironmentVariable {
  key: string;
  value: string;
  encrypted: boolean;
}

// ============================================================================
// HTTP Client Types
// ============================================================================

export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  body?: any;
  timeout?: number;
  responseType?: 'json' | 'arraybuffer' | 'text';
}

// ============================================================================
// Retry Types
// ============================================================================

export interface RetryOptions {
  retries: number;
  retryDelay: number;
  retryCondition?: (error: any) => boolean;
}

// ============================================================================
// Error Types
// ============================================================================

export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: Record<string, any>;
  statusCode?: number;
}
