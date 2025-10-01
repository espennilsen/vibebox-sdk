/**
 * Services Index
 * Central export point for all service classes
 * Tasks: T067-T080
 */

// Core services
export { AuthService } from './auth.service';
export { UserService } from './user.service';
export { TeamService } from './team.service';
export { ProjectService } from './project.service';

// Infrastructure services
export { DockerService } from './docker.service';
export { EnvironmentService } from './environment.service';
export { SessionService } from './session.service';

// Feature services
export { ExtensionService } from './extension.service';
export { LogService } from './log.service';
export { WebSocketService } from './websocket.service';

// Type exports from AuthService
export type {
  JWTPayload,
  AuthResponse,
  UserDTO as AuthUserDTO,
  OAuthProvider,
  OAuthProfile,
} from './auth.service';

// Type exports from UserService
export type { UpdateUserProfile, UserDTO } from './user.service';

// Type exports from TeamService
export type { TeamDTO, TeamMemberDTO, CreateTeamData, UpdateTeamData } from './team.service';

// Type exports from ProjectService
export type { ProjectDTO, CreateProjectData, UpdateProjectData } from './project.service';

// Type exports from DockerService
export type {
  ContainerStatus,
  CreateContainerOptions,
  ContainerInfo,
  ContainerStats,
  LogOptions,
} from './docker.service';

// Type exports from EnvironmentService
export type {
  EnvironmentDTO,
  CreateEnvironmentData,
  UpdateEnvironmentData,
  PortMapping,
  EnvironmentVariableData,
} from './environment.service';

// Type exports from SessionService
export type { SessionDTO, CreateSessionData } from './session.service';

// Type exports from ExtensionService
export type {
  ExtensionDTO,
  EnvironmentExtensionDTO,
  ExtensionSearchResult,
} from './extension.service';

// Type exports from LogService
export type { LogEntryDTO, PaginationInfo, PaginatedLogs, WriteLogData } from './log.service';

// Type exports from WebSocketService
export {
  MessageType,
  type WebSocketMessage,
  type LogMessagePayload,
  type TerminalInputPayload,
  type TerminalOutputPayload,
  type TerminalResizePayload,
  type EnvironmentStatusPayload,
  type ClientConnection,
} from './websocket.service';
