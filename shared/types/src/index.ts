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

export type EnvironmentStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';

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
