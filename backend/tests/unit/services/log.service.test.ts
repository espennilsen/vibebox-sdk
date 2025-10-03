/**
 * Unit Tests: LogService - Log Management
 * Tests log persistence, streaming, and retention
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LogService } from '@/services/log.service';
import { PrismaClient, LogStream } from '@prisma/client';
import { NotFoundError, ForbiddenError } from '@/lib/errors';
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
  getContainerLogs: vi.fn().mockResolvedValue('Container log output\n'),
  streamContainerLogs: vi.fn().mockResolvedValue(() => {}), // Returns stop function
};

const mockPrisma = {
  logEntry: {
    create: vi.fn(),
    createMany: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    deleteMany: vi.fn(),
  },
  environment: {
    findUnique: vi.fn(),
  },
  $connect: vi.fn(),
  $disconnect: vi.fn(),
} as unknown as PrismaClient;

describe('LogService', () => {
  let logService: LogService;
  const mockLog = {
    id: 'log-123',
    environmentId: 'env-123',
    timestamp: new Date('2025-01-01T00:00:00.000Z'),
    stream: LogStream.stdout,
    message: 'Test log message',
  };

  beforeEach(() => {
    // Clear mock call history but restore implementations
    mockDockerService.getContainerLogs.mockClear().mockResolvedValue('Container log output\n');
    mockDockerService.streamContainerLogs.mockClear().mockResolvedValue(() => {});

    logService = new LogService(mockPrisma, mockDockerService as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('writeLog', () => {
    it('should write log entry successfully', async () => {
      // Arrange
      mockPrisma.logEntry.create = vi.fn().mockResolvedValue(mockLog);

      // Act
      const result = await logService.writeLog({
        environmentId: 'env-123',
        timestamp: new Date(),
        stream: LogStream.stdout,
        message: 'Test log message',
      });

      // Assert
      expect(result.id).toBe('log-123');
      expect(result.message).toBe('Test log message');
      expect(mockPrisma.logEntry.create).toHaveBeenCalled();
    });

    it('should handle stderr logs', async () => {
      // Arrange
      const stderrLog = { ...mockLog, stream: LogStream.stderr };
      mockPrisma.logEntry.create = vi.fn().mockResolvedValue(stderrLog);

      // Act
      const result = await logService.writeLog({
        environmentId: 'env-123',
        timestamp: new Date(),
        stream: LogStream.stderr,
        message: 'Error message',
      });

      // Assert
      expect(result.stream).toBe(LogStream.stderr);
    });
  });

  describe('writeBatchLogs', () => {
    it('should write multiple logs in batch', async () => {
      // Arrange
      mockPrisma.logEntry.createMany = vi.fn().mockResolvedValue({ count: 3 });

      // Act
      const count = await logService.writeBatchLogs([
        {
          environmentId: 'env-123',
          timestamp: new Date(),
          stream: LogStream.stdout,
          message: 'Log 1',
        },
        {
          environmentId: 'env-123',
          timestamp: new Date(),
          stream: LogStream.stdout,
          message: 'Log 2',
        },
        {
          environmentId: 'env-123',
          timestamp: new Date(),
          stream: LogStream.stderr,
          message: 'Error',
        },
      ]);

      // Assert
      expect(count).toBe(3);
    });
  });

  describe('getLogs', () => {
    it('should retrieve logs with pagination', async () => {
      // Arrange
      const mockEnv = {
        id: 'env-123',
        project: {
          ownerId: 'user-123',
          teamId: null,
        },
      };
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(mockEnv);
      mockPrisma.logEntry.findMany = vi.fn().mockResolvedValue([mockLog]);
      mockPrisma.logEntry.count = vi.fn().mockResolvedValue(1);

      // Act
      const result = await logService.getLogs('env-123', 'user-123');

      // Assert
      expect(result.logs).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should filter logs by stream', async () => {
      // Arrange
      const mockEnv = {
        id: 'env-123',
        project: {
          ownerId: 'user-123',
          teamId: null,
        },
      };
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(mockEnv);
      mockPrisma.logEntry.findMany = vi.fn().mockResolvedValue([mockLog]);
      mockPrisma.logEntry.count = vi.fn().mockResolvedValue(1);

      // Act
      await logService.getLogs('env-123', 'user-123', 1, 20, LogStream.stdout);

      // Assert
      expect(mockPrisma.logEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            stream: LogStream.stdout,
          }),
        })
      );
    });

    it('should filter logs by timestamp', async () => {
      // Arrange
      const mockEnv = {
        id: 'env-123',
        project: {
          ownerId: 'user-123',
          teamId: null,
        },
      };
      const since = new Date('2025-01-01T00:00:00.000Z');
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(mockEnv);
      mockPrisma.logEntry.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.logEntry.count = vi.fn().mockResolvedValue(0);

      // Act
      await logService.getLogs('env-123', 'user-123', 1, 20, undefined, since);

      // Assert
      expect(mockPrisma.logEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timestamp: { gte: since },
          }),
        })
      );
    });

    it('should throw NotFoundError when environment not found', async () => {
      // Arrange
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(logService.getLogs('non-existent', 'user-123')).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when user lacks access', async () => {
      // Arrange
      const mockEnv = {
        id: 'env-123',
        project: {
          ownerId: 'other-user',
          teamId: null,
        },
      };
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(mockEnv);

      // Act & Assert
      await expect(logService.getLogs('env-123', 'user-123')).rejects.toThrow(ForbiddenError);
    });
  });

  describe('streamLogs', () => {
    it('should stream container logs', async () => {
      // Arrange
      const mockEnv = {
        id: 'env-123',
        containerId: 'container-123',
        project: {
          ownerId: 'user-123',
          teamId: null,
        },
      };
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(mockEnv);
      const callbackFn = vi.fn();

      // Act
      const stopFn = await logService.streamLogs('env-123', callbackFn);

      // Assert
      expect(stopFn).toBeDefined();
      expect(typeof stopFn).toBe('function');
      expect(mockDockerService.streamContainerLogs).toHaveBeenCalledWith(
        'container-123',
        expect.any(Function),
        { follow: true, tail: 100, timestamps: true }
      );
    });
  });

  describe('deleteLogs', () => {
    it('should delete logs for environment', async () => {
      // Arrange
      const mockEnv = {
        id: 'env-123',
        project: {
          ownerId: 'user-123',
          teamId: null,
        },
      };
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(mockEnv);
      mockPrisma.logEntry.deleteMany = vi.fn().mockResolvedValue({ count: 5 });

      // Act
      const count = await logService.deleteLogs('env-123', 'user-123');

      // Assert
      expect(count).toBe(5);
    });
  });

  describe('cleanupOldLogs', () => {
    it('should delete logs older than retention period', async () => {
      // Arrange
      mockPrisma.logEntry.deleteMany = vi.fn().mockResolvedValue({ count: 10 });

      // Act
      const count = await logService.cleanupOldLogs();

      // Assert
      expect(count).toBe(10);
      expect(mockPrisma.logEntry.deleteMany).toHaveBeenCalled();
    });
  });
});
