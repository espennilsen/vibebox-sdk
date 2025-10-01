/**
 * Domain Models - VibeBox Frontend
 * TypeScript interfaces matching backend Prisma schema
 */

/**
 * User entity representing an authenticated user
 */
export interface User {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  timezone: string;
  locale: string;
  notificationsEnabled: boolean;
  sshPublicKeys: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Team entity for collaborative workspaces
 */
export interface Team {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Team member relationship
 */
export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joinedAt: string;
  user?: User;
}

/**
 * Project entity containing environments
 */
export interface Project {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  teamId: string | null;
  repositoryUrl: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: User;
  team?: Team;
}

/**
 * Environment status enum
 */
export type EnvironmentStatus = 'CREATING' | 'RUNNING' | 'STOPPED' | 'ERROR' | 'DELETING';

/**
 * Environment entity representing a development container
 */
export interface Environment {
  id: string;
  name: string;
  description: string | null;
  projectId: string;
  baseImage: string;
  status: EnvironmentStatus;
  dockerContainerId: string | null;
  cpuLimit: number;
  memoryLimit: number;
  diskLimit: number;
  createdAt: string;
  updatedAt: string;
  project?: Project;
  ports?: PortMapping[];
  variables?: EnvironmentVariable[];
}

/**
 * Port mapping for environment networking
 */
export interface PortMapping {
  id: string;
  environmentId: string;
  containerPort: number;
  hostPort: number;
  protocol: 'TCP' | 'UDP';
  description: string | null;
  createdAt: string;
}

/**
 * Environment variable for container configuration
 */
export interface EnvironmentVariable {
  id: string;
  environmentId: string;
  key: string;
  value: string;
  isSecret: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Terminal session entity
 */
export interface TerminalSession {
  id: string;
  environmentId: string;
  userId: string;
  name: string;
  shell: string;
  cols: number;
  rows: number;
  pid: number | null;
  status: 'ACTIVE' | 'CLOSED';
  createdAt: string;
  closedAt: string | null;
  user?: User;
}

/**
 * VS Code extension entity
 */
export interface Extension {
  id: string;
  environmentId: string;
  extensionId: string;
  version: string;
  installedAt: string;
}

/**
 * Extension search result from marketplace
 */
export interface ExtensionSearchResult {
  extensionId: string;
  displayName: string;
  shortDescription: string;
  publisher: string;
  version: string;
  installs: number;
  rating: number;
  iconUrl: string | null;
}

/**
 * Container log entry
 */
export interface LogEntry {
  timestamp: string;
  stream: 'stdout' | 'stderr';
  message: string;
  level?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Activity log entry for audit trail
 */
export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: User;
}

/**
 * Resource usage metrics
 */
export interface ResourceUsage {
  cpuPercent: number;
  memoryUsedMb: number;
  memoryLimitMb: number;
  diskUsedMb: number;
  diskLimitMb: number;
  networkRxBytes: number;
  networkTxBytes: number;
  timestamp: string;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
