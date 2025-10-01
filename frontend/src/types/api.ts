/**
 * API Request/Response Types - VibeBox Frontend
 * TypeScript interfaces for API communication
 */

import type {
  User,
  Team,
  TeamMember,
  Project,
  Environment,
  EnvironmentStatus,
  TerminalSession,
  Extension,
  ExtensionSearchResult,
  LogEntry,
  ActivityLog,
  PaginatedResponse,
} from './models';

/**
 * API error response
 */
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

/**
 * Authentication token response
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Authentication requests
 */
export interface RegisterRequest {
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Authentication responses
 */
export interface RegisterResponse {
  user: User;
  tokens: AuthTokens;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface RefreshTokenResponse {
  tokens: AuthTokens;
}

/**
 * User requests
 */
export interface UpdateUserRequest {
  displayName?: string;
  avatarUrl?: string;
  timezone?: string;
  locale?: string;
  notificationsEnabled?: boolean;
}

export interface AddSshKeyRequest {
  publicKey: string;
}

/**
 * Team requests
 */
export interface CreateTeamRequest {
  name: string;
  description?: string;
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
}

export interface AddTeamMemberRequest {
  userId: string;
  role: 'ADMIN' | 'MEMBER';
}

/**
 * Project requests
 */
export interface CreateProjectRequest {
  name: string;
  description?: string;
  teamId?: string;
  repositoryUrl?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  repositoryUrl?: string;
}

/**
 * Environment requests
 */
export interface CreateEnvironmentRequest {
  name: string;
  description?: string;
  projectId: string;
  baseImage: string;
  cpuLimit?: number;
  memoryLimit?: number;
  diskLimit?: number;
}

export interface UpdateEnvironmentRequest {
  name?: string;
  description?: string;
  cpuLimit?: number;
  memoryLimit?: number;
  diskLimit?: number;
}

export interface AddPortMappingRequest {
  containerPort: number;
  hostPort?: number;
  protocol?: 'TCP' | 'UDP';
  description?: string;
}

export interface AddEnvironmentVariableRequest {
  key: string;
  value: string;
  isSecret?: boolean;
}

/**
 * Session requests
 */
export interface CreateSessionRequest {
  environmentId: string;
  name?: string;
  shell?: string;
  cols?: number;
  rows?: number;
}

/**
 * Extension requests
 */
export interface InstallExtensionRequest {
  environmentId: string;
  extensionId: string;
  version?: string;
}

export interface SearchExtensionsRequest {
  query: string;
  page?: number;
  pageSize?: number;
}

/**
 * Log requests
 */
export interface GetLogsRequest {
  environmentId: string;
  stream?: 'stdout' | 'stderr';
  since?: string;
  until?: string;
  limit?: number;
  follow?: boolean;
}

/**
 * API response wrappers
 */
export interface SuccessResponse<T = void> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: ApiError;
}

export type ApiResponse<T = void> = SuccessResponse<T> | ErrorResponse;

/**
 * WebSocket message types
 */
export type WsMessageType =
  | 'terminal:data'
  | 'terminal:resize'
  | 'log:data'
  | 'environment:status'
  | 'session:closed'
  | 'ping'
  | 'pong';

export interface WsMessage<T = unknown> {
  type: WsMessageType;
  payload: T;
}

/**
 * WebSocket payloads
 */
export interface TerminalDataPayload {
  sessionId: string;
  data: string;
}

export interface TerminalResizePayload {
  sessionId: string;
  cols: number;
  rows: number;
}

export interface LogDataPayload {
  environmentId: string;
  entry: LogEntry;
}

export interface EnvironmentStatusPayload {
  environmentId: string;
  status: EnvironmentStatus;
  dockerContainerId?: string | null;
}

export interface SessionClosedPayload {
  sessionId: string;
  reason: string;
}

/**
 * API endpoint responses
 */
export type GetUserResponse = User;
export type UpdateUserResponse = User;
export type GetTeamResponse = Team;
export type ListTeamMembersResponse = TeamMember[];
export type GetProjectResponse = Project;
export type ListProjectsResponse = Project[];
export type GetEnvironmentResponse = Environment;
export type ListEnvironmentsResponse = Environment[];
export type GetSessionResponse = TerminalSession;
export type ListSessionsResponse = TerminalSession[];
export type SearchExtensionsResponse = PaginatedResponse<ExtensionSearchResult>;
export type ListExtensionsResponse = Extension[];
export type GetLogsResponse = LogEntry[];
export type ListActivityLogsResponse = PaginatedResponse<ActivityLog>;

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: 'ok' | 'down';
    docker: 'ok' | 'down';
  };
}
