/**
 * SessionService - Session Management Service
 * Handles tmux, shell, and VS Code Server session lifecycle
 * Tasks: T073, T054-T057
 */
import {
  PrismaClient,
  Session,
  SessionType,
  SessionStatus,
  EnvironmentStatus,
} from '@prisma/client';
import { getPrismaClient } from '@/lib/db';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
  BadRequestError,
} from '@/lib/errors';
import { DockerService } from './docker.service';

/**
 * Session Data Transfer Object
 */
export interface SessionDTO {
  id: string;
  environmentId: string;
  sessionType: SessionType;
  sessionName: string;
  status: SessionStatus;
  connectionUrl?: string | null;
  pid?: number | null;
  createdAt: Date;
  lastActivityAt: Date;
  idleTimeoutMinutes: number;
  terminatedAt?: Date | null;
}

/**
 * Session creation data
 */
export interface CreateSessionData {
  environmentId: string;
  sessionType: SessionType;
  sessionName: string;
  idleTimeoutMinutes?: number;
}

/**
 * SessionService - Manages sessions within environments
 *
 * Provides methods for creating and managing tmux sessions, shell sessions,
 * and VS Code Server instances within Docker containers.
 */
export class SessionService {
  /**
   * Creates a new SessionService instance
   *
   * @param prisma - Prisma client instance for database access
   * @param dockerService - Docker service instance for container operations
   */
  constructor(
    private prisma: PrismaClient = getPrismaClient(),
    private dockerService: DockerService = new DockerService()
  ) {}

  /**
   * Create a new session
   *
   * Creates session record and starts process in container
   *
   * @param data - Session creation data
   * @param userId - User ID creating the session
   * @returns Created session
   * @throws {NotFoundError} If environment doesn't exist
   * @throws {ForbiddenError} If user lacks access
   * @throws {BadRequestError} If environment is not running
   * @throws {ConflictError} If session already exists
   *
   * @example
   * ```typescript
   * const sessionService = new SessionService();
   * const session = await sessionService.createSession({
   *   environmentId: 'env-id-123',
   *   sessionType: SessionType.tmux,
   *   sessionName: 'main'
   * }, 'user-id-456');
   * ```
   */
  async createSession(data: CreateSessionData, userId: string): Promise<SessionDTO> {
    // Check if environment exists and user has access
    const environment = await this.prisma.environment.findUnique({
      where: { id: data.environmentId },
      include: {
        project: {
          include: {
            owner: true,
            team: { include: { userTeams: true } },
          },
        },
      },
    });

    if (!environment) {
      throw new NotFoundError('Environment not found');
    }

    // Check access
    await this.checkEnvironmentAccess(environment.project, userId);

    // Check if environment is running
    if (environment.status !== EnvironmentStatus.running) {
      throw new BadRequestError('Environment must be running to create sessions');
    }

    // Check if container exists
    if (!environment.containerId) {
      throw new BadRequestError('Environment has no container');
    }

    // Validate session name
    if (!data.sessionName || data.sessionName.length === 0 || data.sessionName.length > 100) {
      throw new ValidationError('Session name must be between 1 and 100 characters');
    }

    // Check if session already exists
    const existingSession = await this.prisma.session.findUnique({
      where: {
        environmentId_sessionType_sessionName: {
          environmentId: data.environmentId,
          sessionType: data.sessionType,
          sessionName: data.sessionName,
        },
      },
    });

    if (existingSession && existingSession.status !== SessionStatus.terminated) {
      throw new ConflictError('Session already exists');
    }

    // Create session record
    let session = await this.prisma.session.create({
      data: {
        environmentId: data.environmentId,
        sessionType: data.sessionType,
        sessionName: data.sessionName,
        status: SessionStatus.starting,
        idleTimeoutMinutes: data.idleTimeoutMinutes || 30,
      },
    });

    try {
      // Start session process in container based on type
      let command: string[];
      let connectionUrl: string | null = null;

      switch (data.sessionType) {
        case SessionType.tmux:
          command = ['tmux', 'new-session', '-d', '-s', data.sessionName];
          break;

        case SessionType.shell:
          command = ['/bin/bash'];
          break;

        case SessionType.vscode_server:
          // In production, this would start code-server
          command = ['code-server', '--bind-addr', '0.0.0.0:8080'];
          connectionUrl = `http://localhost:8080`;
          break;

        default:
          throw new ValidationError(`Unsupported session type: ${String(data.sessionType)}`);
      }

      // Execute command in container
      await this.dockerService.execCommand(environment.containerId, command);

      // Update session to active
      session = await this.prisma.session.update({
        where: { id: session.id },
        data: {
          status: SessionStatus.active,
          connectionUrl,
          lastActivityAt: new Date(),
        },
      });

      return this.toSessionDTO(session);
    } catch (error) {
      console.error('Failed to start session:', error);

      // Update session to terminated
      await this.prisma.session.update({
        where: { id: session.id },
        data: {
          status: SessionStatus.terminated,
          terminatedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Get session by ID
   *
   * @param sessionId - Session ID
   * @param userId - User ID requesting access
   * @returns Session data
   * @throws {NotFoundError} If session doesn't exist
   * @throws {ForbiddenError} If user lacks access
   *
   * @example
   * ```typescript
   * const sessionService = new SessionService();
   * const session = await sessionService.getSessionById('session-id-123', 'user-id-456');
   * ```
   */
  async getSessionById(sessionId: string, userId: string): Promise<SessionDTO> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        environment: {
          include: {
            project: {
              include: {
                owner: true,
                team: { include: { userTeams: true } },
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundError('Session not found');
    }

    // Check access
    await this.checkEnvironmentAccess(session.environment.project, userId);

    return this.toSessionDTO(session);
  }

  /**
   * List sessions for environment
   *
   * @param environmentId - Environment ID
   * @param userId - User ID requesting list
   * @param page - Page number (1-indexed)
   * @param limit - Items per page
   * @returns Array of sessions
   * @throws {NotFoundError} If environment doesn't exist
   * @throws {ForbiddenError} If user lacks access
   *
   * @example
   * ```typescript
   * const sessionService = new SessionService();
   * const sessions = await sessionService.listSessions('env-id-123', 'user-id-456', 1, 20);
   * ```
   */
  async listSessions(
    environmentId: string,
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<SessionDTO[]> {
    // Check if environment exists and user has access
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      include: {
        project: {
          include: {
            owner: true,
            team: { include: { userTeams: true } },
          },
        },
      },
    });

    if (!environment) {
      throw new NotFoundError('Environment not found');
    }

    await this.checkEnvironmentAccess(environment.project, userId);

    const skip = (page - 1) * limit;

    const sessions = await this.prisma.session.findMany({
      where: { environmentId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map((s) => this.toSessionDTO(s));
  }

  /**
   * Terminate session
   *
   * Terminates session process and updates status
   *
   * @param sessionId - Session ID
   * @param userId - User ID performing action
   * @throws {NotFoundError} If session doesn't exist
   * @throws {ForbiddenError} If user lacks access
   *
   * @example
   * ```typescript
   * const sessionService = new SessionService();
   * await sessionService.terminateSession('session-id-123', 'user-id-456');
   * ```
   */
  async terminateSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        environment: {
          include: {
            project: {
              include: {
                owner: true,
                team: { include: { userTeams: true } },
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundError('Session not found');
    }

    await this.checkEnvironmentAccess(session.environment.project, userId);

    // If already terminated, nothing to do
    if (session.status === SessionStatus.terminated) {
      return;
    }

    // Terminate session process based on type
    if (session.environment.containerId) {
      try {
        let command: string[];

        switch (session.sessionType) {
          case SessionType.tmux:
            command = ['tmux', 'kill-session', '-t', session.sessionName];
            break;

          case SessionType.shell:
            // Shell sessions terminate when container stops
            command = ['echo', 'Shell session will terminate with container'];
            break;

          case SessionType.vscode_server:
            // Kill code-server process
            command = ['pkill', '-f', 'code-server'];
            break;

          default:
            command = ['echo', 'Unknown session type'];
        }

        await this.dockerService.execCommand(session.environment.containerId, command);
      } catch (error) {
        console.warn('Failed to terminate session process:', error);
      }
    }

    // Update session status
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.terminated,
        terminatedAt: new Date(),
      },
    });
  }

  /**
   * Update session activity timestamp
   *
   * Updates lastActivityAt to track session usage
   *
   * @param sessionId - Session ID
   * @param userId - User ID performing action
   * @throws {NotFoundError} If session doesn't exist
   * @throws {ForbiddenError} If user lacks access
   *
   * @example
   * ```typescript
   * const sessionService = new SessionService();
   * await sessionService.updateSessionActivity('session-id-123', 'user-id-456');
   * ```
   */
  async updateSessionActivity(sessionId: string, userId: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        environment: {
          include: {
            project: {
              include: {
                owner: true,
                team: { include: { userTeams: true } },
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundError('Session not found');
    }

    await this.checkEnvironmentAccess(session.environment.project, userId);

    // Update activity timestamp and set status to active if idle
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        lastActivityAt: new Date(),
        status: session.status === SessionStatus.idle ? SessionStatus.active : session.status,
      },
    });
  }

  /**
   * Mark idle sessions
   *
   * Marks sessions as idle if no activity within timeout period
   *
   * @returns Number of sessions marked idle
   *
   * @example
   * ```typescript
   * const sessionService = new SessionService();
   * const count = await sessionService.markIdleSessions();
   * ```
   */
  async markIdleSessions(): Promise<number> {
    const now = new Date();

    const result = await this.prisma.session.updateMany({
      where: {
        status: SessionStatus.active,
        lastActivityAt: {
          lt: new Date(now.getTime() - 30 * 60 * 1000), // Default 30 minutes
        },
      },
      data: {
        status: SessionStatus.idle,
      },
    });

    return result.count;
  }

  /**
   * Terminate idle sessions
   *
   * Terminates sessions that have been idle beyond their timeout
   *
   * @returns Number of sessions terminated
   *
   * @example
   * ```typescript
   * const sessionService = new SessionService();
   * const count = await sessionService.terminateIdleSessions();
   * ```
   */
  async terminateIdleSessions(): Promise<number> {
    const now = new Date();

    // Find idle sessions past timeout
    const idleSessions = await this.prisma.session.findMany({
      where: {
        status: SessionStatus.idle,
      },
    });

    let terminatedCount = 0;

    for (const session of idleSessions) {
      const idleTime = now.getTime() - new Date(session.lastActivityAt).getTime();
      const timeoutMs = session.idleTimeoutMinutes * 60 * 1000;

      if (idleTime > timeoutMs) {
        await this.prisma.session.update({
          where: { id: session.id },
          data: {
            status: SessionStatus.terminated,
            terminatedAt: now,
          },
        });
        terminatedCount++;
      }
    }

    return terminatedCount;
  }

  /**
   * Check if user has access to project
   *
   * @private
   */
  private async checkEnvironmentAccess(project: any, userId: string): Promise<void> {
    const hasAccess =
      project.ownerId === userId ||
      (project.team?.userTeams.some((ut: any) => ut.userId === userId) ?? false);

    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this environment');
    }
  }

  /**
   * Convert Session entity to SessionDTO
   *
   * @private
   */
  private toSessionDTO(session: Session): SessionDTO {
    return {
      id: session.id,
      environmentId: session.environmentId,
      sessionType: session.sessionType,
      sessionName: session.sessionName,
      status: session.status,
      connectionUrl: session.connectionUrl,
      pid: session.pid,
      createdAt: session.createdAt,
      lastActivityAt: session.lastActivityAt,
      idleTimeoutMinutes: session.idleTimeoutMinutes,
      terminatedAt: session.terminatedAt,
    };
  }
}
