/**
 * Shared Types - Task T010
 * TypeScript types shared between frontend and backend
 * Based on specs/001-develop-vibecode-a/contracts/openapi.yaml
 */

// ============================================================================
// User Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  timezone: string;
  locale: string;
  sshPublicKey?: string;
  notificationSettings?: Record<string, unknown>;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// ============================================================================
// Team Types
// ============================================================================

export interface Team {
  id: string;
  name: string;
  slug: string;
  description?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type UserTeamRole = 'admin' | 'developer' | 'viewer';

export interface TeamMember {
  user: User;
  role: UserTeamRole;
  joinedAt: string;
}

// ============================================================================
// Project Types
// ============================================================================

export interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  ownerId?: string;
  teamId?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Environment Types
// ============================================================================

export type EnvironmentStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'paused' | 'error';

export interface Environment {
  id: string;
  name: string;
  slug: string;
  description?: string;
  projectId: string;
  creatorId: string;
  baseImage: string;
  containerId?: string;
  status: EnvironmentStatus;
  errorMessage?: string;
  cpuLimit: number;
  memoryLimit: number;
  storageLimit: number;
  ephemeral: boolean;
  expiresAt?: string;
  pausedAt?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  stoppedAt?: string;
}

export type Protocol = 'tcp' | 'udp';

export interface EnvironmentPort {
  id: string;
  containerPort: number;
  hostPort?: number;
  protocol: Protocol;
  description?: string;
}

export interface EnvironmentVariable {
  id: string;
  key: string;
  value: string;
  isEncrypted: boolean;
  createdAt: string;
}

// ============================================================================
// Session Types
// ============================================================================

export type SessionType = 'vscode_server' | 'tmux' | 'shell';
export type SessionStatus = 'starting' | 'active' | 'idle' | 'terminated';

export interface Session {
  id: string;
  environmentId: string;
  sessionType: SessionType;
  sessionName: string;
  status: SessionStatus;
  connectionUrl?: string;
  pid?: number;
  createdAt: string;
  lastActivityAt: string;
  idleTimeoutMinutes: number;
  terminatedAt?: string;
}

// ============================================================================
// Extension Types
// ============================================================================

export interface Extension {
  id: string;
  extensionId: string;
  name: string;
  version: string;
  description?: string;
  publisher: string;
  iconUrl?: string;
  isCustom: boolean;
  downloadUrl?: string;
}

export type EnvironmentExtensionStatus =
  | 'pending'
  | 'installing'
  | 'installed'
  | 'failed'
  | 'uninstalling';

export interface EnvironmentExtension {
  id: string;
  environmentId: string;
  extension: Extension;
  status: EnvironmentExtensionStatus;
  errorMessage?: string;
  installedAt?: string;
  createdAt: string;
}

// ============================================================================
// Log Types
// ============================================================================

export type LogStream = 'stdout' | 'stderr';

export interface LogEntry {
  id: string;
  timestamp: string;
  stream: LogStream;
  message: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// WebSocket Message Types
// ============================================================================

export interface WebSocketLogMessage {
  type: 'log';
  data: LogEntry;
}

export interface WebSocketStatusMessage {
  type: 'status';
  data: {
    connected: boolean;
    environmentStatus: EnvironmentStatus;
    streamingFrom?: string;
  };
}

export interface WebSocketErrorMessage {
  type: 'error';
  data: {
    code: string;
    message: string;
  };
}

export interface WebSocketEndMessage {
  type: 'end';
  data: {
    reason: string;
    finalTimestamp?: string;
  };
}

export type WebSocketMessage =
  | WebSocketLogMessage
  | WebSocketStatusMessage
  | WebSocketErrorMessage
  | WebSocketEndMessage;

// ============================================================================
// Request/Response DTOs
// ============================================================================

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateTeamRequest {
  name: string;
  slug: string;
  description?: string;
}

export interface CreateProjectRequest {
  name: string;
  slug: string;
  description?: string;
  teamId?: string;
}

export interface CreateEnvironmentRequest {
  name: string;
  slug: string;
  description?: string;
  projectId: string;
  baseImage: string;
  cpuLimit?: number;
  memoryLimit?: number;
  storageLimit?: number;
  ports?: Array<{
    containerPort: number;
    hostPort?: number;
    protocol?: Protocol;
  }>;
  environmentVariables?: Array<{
    key: string;
    value: string;
    isEncrypted?: boolean;
  }>;
  extensions?: string[];
}

export interface CreateSessionRequest {
  sessionType: SessionType;
  sessionName: string;
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
  expiresAt?: string;
  lastUsedAt?: string;
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
  key: string; // Full API key (only returned once)
}

export interface UpdateApiKeyRequest {
  name?: string;
  scopes?: ApiKeyScope[];
}

// ============================================================================
// Git Integration Types
// ============================================================================

export type GitAuthType = 'token' | 'ssh' | 'none';

export interface GitAuthConfig {
  type: GitAuthType;
  token?: string;
  sshKey?: string;
}

export interface SandboxGitConfig {
  id: string;
  environmentId: string;
  repoUrl: string;
  branch: string;
  path: string;
  depth?: number;
  authType: GitAuthType;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GitCloneRequest {
  url: string;
  branch?: string;
  path?: string;
  depth?: number;
  auth?: GitAuthConfig;
}

export interface GitCloneResponse {
  success: boolean;
  path: string;
  branch: string;
  commit?: string;
}

export interface GitPullRequest {
  remote?: string;
  branch?: string;
}

export interface GitPullResponse {
  success: boolean;
  updatedFiles: number;
  commit?: string;
}

export interface GitPushRequest {
  remote?: string;
  branch?: string;
  force?: boolean;
}

export interface GitPushResponse {
  success: boolean;
  pushed: boolean;
  commit?: string;
}

export interface GitCommitRequest {
  message: string;
  files?: string[];
  author?: {
    name: string;
    email: string;
  };
}

export interface GitCommitResponse {
  success: boolean;
  commit: string;
  filesChanged: number;
}

export interface GitCheckoutRequest {
  branch: string;
  create?: boolean;
}

export interface GitCheckoutResponse {
  success: boolean;
  branch: string;
}

export interface GitStatusResponse {
  branch: string;
  modified: string[];
  added: string[];
  deleted: string[];
  untracked: string[];
  ahead: number;
  behind: number;
}

export interface GitDiffResponse {
  files: Array<{
    path: string;
    status: 'added' | 'modified' | 'deleted';
    additions: number;
    deletions: number;
    diff?: string;
  }>;
}

// ============================================================================
// Code Execution Types
// ============================================================================

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'timeout' | 'cancelled';

export interface Execution {
  id: string;
  environmentId: string;
  userId: string;
  code: string;
  language: string;
  status: ExecutionStatus;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  duration?: number;
  timeout: number;
  env?: Record<string, string>;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface ExecuteCodeRequest {
  code: string;
  language: string;
  timeout?: number;
  env?: Record<string, string>;
}

export interface ExecuteCodeResponse {
  executionId: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  status: ExecutionStatus;
}

// ============================================================================
// File Operations Types
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
  content: string | Buffer;
  permissions?: string;
}

export interface UploadFileResponse {
  success: boolean;
  path: string;
  size: number;
}

export interface DeleteFileResponse {
  success: boolean;
  deleted: number;
}

// ============================================================================
// Template Types
// ============================================================================

export interface Template {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  baseImage: string;
  category?: string;
  tags: string[];
  config: {
    cpuLimit?: number;
    memoryLimit?: number;
    storageLimit?: number;
    ports?: Array<{
      containerPort: number;
      protocol?: Protocol;
    }>;
    extensions?: string[];
  };
  isPublic: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Enhanced Environment Request Types
// ============================================================================

export interface EnhancedCreateEnvironmentRequest extends CreateEnvironmentRequest {
  template?: string;
  autoStart?: boolean;
  ephemeral?: boolean;
  timeout?: string;
  git?: GitCloneRequest;
}

export interface SetEnvironmentVariablesRequest {
  variables: Record<string, string>;
}

export interface SetEnvironmentVariableRequest {
  key: string;
  value: string;
}

// ============================================================================
// WebSocket Execution Message Types
// ============================================================================

export interface WebSocketExecutionStartMessage {
  type: 'execution:start';
  data: {
    executionId: string;
  };
}

export interface WebSocketExecutionOutputMessage {
  type: 'execution:output';
  data: {
    executionId: string;
    stream: 'stdout' | 'stderr';
    data: string;
  };
}

export interface WebSocketExecutionEndMessage {
  type: 'execution:end';
  data: {
    executionId: string;
    exitCode: number;
    duration: number;
    status: ExecutionStatus;
  };
}

export type WebSocketExecutionMessage =
  | WebSocketExecutionStartMessage
  | WebSocketExecutionOutputMessage
  | WebSocketExecutionEndMessage;
