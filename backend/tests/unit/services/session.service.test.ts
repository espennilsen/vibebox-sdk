/**
 * Unit Tests: SessionService - Session Management
 * Tests tmux, shell, and VS Code Server session lifecycle
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionService } from '@/services/session.service';
import { PrismaClient, SessionType, SessionStatus, EnvironmentStatus } from '@prisma/client';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
} from '@/lib/errors';
import { DockerService } from '@/services/docker.service';

// Mock Prisma Client
vi.mock('@/lib/db', () => ({
  getPrismaClient: () => mockPrisma,
}));

// Mock DockerService
vi.mock('@/services/docker.service', () => ({
  DockerService: vi.fn(() => mockDockerService),
}));

const mockDockerService = {
  execCommand: vi.fn().mockResolvedValue('session-name'),
};

const mockPrisma = {
  session: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  environment: {
    findUnique: vi.fn(),
  },
  $connect: vi.fn(),
  $disconnect: vi.fn(),
} as unknown as PrismaClient;

describe('SessionService', () => {
  let sessionService: SessionService;
  const mockSession = {
    id: 'session-123',
    environmentId: 'env-123',
    sessionType: SessionType.tmux,
    sessionName: 'main',
    status: SessionStatus.active,
    connectionUrl: null,
    pid: 12345,
    idleTimeoutMinutes: 60,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    lastActivityAt: new Date('2025-01-01T00:00:00.000Z'),
    terminatedAt: null,
  };

  beforeEach(() => {
    sessionService = new SessionService(mockPrisma, mockDockerService as any);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createSession', () => {
    it.skip('should create tmux session successfully', async () => {
      // Arrange
      const mockEnv = {
        id: 'env-123',
        containerId: 'container-123',
        status: EnvironmentStatus.running,
        project: {
          ownerId: 'user-123',
          teamId: null,
          owner: { id: 'user-123' },
          team: null,
        },
      };
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(mockEnv);
      mockPrisma.session.findUnique = vi.fn().mockResolvedValue(null);
      mockPrisma.session.create = vi.fn().mockResolvedValue(mockSession);

      // Act
      const result = await sessionService.createSession(
        {
          environmentId: 'env-123',
          sessionType: SessionType.tmux,
          sessionName: 'main',
        },
        'user-123'
      );

      // Assert
      expect(result.sessionType).toBe(SessionType.tmux);
      expect(result.status).toBe(SessionStatus.active);
    });

    it('should throw NotFoundError when environment not found', async () => {
      // Arrange
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(
        sessionService.createSession(
          {
            environmentId: 'non-existent',
            sessionType: SessionType.tmux,
            sessionName: 'main',
          },
          'user-123'
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when user lacks access', async () => {
      // Arrange
      const mockEnv = {
        id: 'env-123',
        containerId: 'container-123',
        status: EnvironmentStatus.running,
        project: {
          ownerId: 'other-user',
          teamId: null,
          owner: { id: 'other-user' },
          team: null,
        },
      };
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(mockEnv);

      // Act & Assert
      await expect(
        sessionService.createSession(
          {
            environmentId: 'env-123',
            sessionType: SessionType.tmux,
            sessionName: 'main',
          },
          'user-123'
        )
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw BadRequestError when environment not running', async () => {
      // Arrange
      const mockEnv = {
        id: 'env-123',
        containerId: 'container-123',
        status: EnvironmentStatus.stopped,
        project: {
          ownerId: 'user-123',
          teamId: null,
          owner: { id: 'user-123' },
          team: null,
        },
      };
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(mockEnv);

      // Act & Assert
      await expect(
        sessionService.createSession(
          {
            environmentId: 'env-123',
            sessionType: SessionType.tmux,
            sessionName: 'main',
          },
          'user-123'
        )
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw ConflictError when session already exists', async () => {
      // Arrange
      const mockEnv = {
        id: 'env-123',
        containerId: 'container-123',
        status: EnvironmentStatus.running,
        project: {
          ownerId: 'user-123',
          teamId: null,
          owner: { id: 'user-123' },
          team: null,
        },
      };
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(mockEnv);
      mockPrisma.session.findUnique = vi.fn().mockResolvedValue(mockSession);

      // Act & Assert
      await expect(
        sessionService.createSession(
          {
            environmentId: 'env-123',
            sessionType: SessionType.tmux,
            sessionName: 'main',
          },
          'user-123'
        )
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('getSessionById', () => {
    it('should return session when user has access', async () => {
      // Arrange
      const sessionWithEnv = {
        ...mockSession,
        environment: {
          project: {
            ownerId: 'user-123',
            teamId: null,
            owner: { id: 'user-123' },
            team: null,
          },
        },
      };
      mockPrisma.session.findUnique = vi.fn().mockResolvedValue(sessionWithEnv);

      // Act
      const result = await sessionService.getSessionById('session-123', 'user-123');

      // Assert
      expect(result.id).toBe('session-123');
    });

    it('should throw NotFoundError when session not found', async () => {
      // Arrange
      mockPrisma.session.findUnique = vi.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(sessionService.getSessionById('non-existent', 'user-123')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('listSessions', () => {
    it('should list sessions for environment', async () => {
      // Arrange
      const mockEnv = {
        id: 'env-123',
        project: {
          ownerId: 'user-123',
          teamId: null,
          owner: { id: 'user-123' },
          team: null,
        },
      };
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(mockEnv);
      mockPrisma.session.findMany = vi.fn().mockResolvedValue([mockSession]);

      // Act
      const result = await sessionService.listSessions('env-123', 'user-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].sessionName).toBe('main');
    });

    it.skip('should filter by session type', async () => {
      // Arrange
      const mockEnv = {
        id: 'env-123',
        project: {
          ownerId: 'user-123',
          teamId: null,
          owner: { id: 'user-123' },
          team: null,
        },
      };
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(mockEnv);
      mockPrisma.session.findMany = vi.fn().mockResolvedValue([mockSession]);

      // Act
      await sessionService.listSessions('env-123', 'user-123', SessionType.tmux);

      // Assert
      expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sessionType: SessionType.tmux,
          }),
        })
      );
    });
  });

  describe('terminateSession', () => {
    it('should terminate session successfully', async () => {
      // Arrange
      const sessionWithEnv = {
        ...mockSession,
        environment: {
          containerId: 'container-123',
          project: {
            ownerId: 'user-123',
            teamId: null,
            owner: { id: 'user-123' },
            team: null,
          },
        },
      };
      mockPrisma.session.findUnique = vi.fn().mockResolvedValue(sessionWithEnv);
      mockPrisma.session.update = vi.fn().mockResolvedValue({
        ...sessionWithEnv,
        status: SessionStatus.terminated,
        terminatedAt: new Date(),
      });

      // Act
      await sessionService.terminateSession('session-123', 'user-123');

      // Assert
      expect(mockPrisma.session.update).toHaveBeenCalled();
      expect(mockDockerService.execCommand).toHaveBeenCalled();
    });

    it('should throw NotFoundError when session not found', async () => {
      // Arrange
      mockPrisma.session.findUnique = vi.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(sessionService.terminateSession('non-existent', 'user-123')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('updateActivity', () => {
    it.skip('should update last activity timestamp', async () => {
      // Arrange
      const sessionWithEnv = {
        ...mockSession,
        environment: {
          project: {
            ownerId: 'user-123',
            teamId: null,
            owner: { id: 'user-123' },
            team: null,
          },
        },
      };
      mockPrisma.session.findUnique = vi.fn().mockResolvedValue(sessionWithEnv);
      mockPrisma.session.update = vi.fn().mockResolvedValue({
        ...sessionWithEnv,
        lastActivityAt: new Date(),
      });

      // Act
      await sessionService.updateActivity('session-123', 'user-123');

      // Assert
      expect(mockPrisma.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            lastActivityAt: expect.any(Date),
          },
        })
      );
    });
  });

  describe('cleanupIdleSessions', () => {
    it('should terminate idle sessions', async () => {
      // Arrange
      const idleDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const idleSession = {
        ...mockSession,
        lastActivityAt: idleDate,
        environment: {
          containerId: 'container-123',
        },
      };
      mockPrisma.session.findMany = vi.fn().mockResolvedValue([idleSession]);
      mockPrisma.session.update = vi.fn().mockResolvedValue({
        ...idleSession,
        status: SessionStatus.terminated,
      });

      // Act
      const count = await sessionService.cleanupIdleSessions();

      // Assert
      expect(count).toBe(1);
    });
  });
});
