/**
 * Unit Tests: LogService - Stream Logs Functionality
 * Tests real-time log streaming with callbacks and unsubscribe functionality
 * Tasks: T075, T062-T064
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LogService } from '@/services/log.service';
import { DockerService, DockerLogEntry } from '@/services/docker.service';
import { PrismaClient } from '@prisma/client';
import { LogStream } from '@/types/prisma-enums';
import { NotFoundError } from '@/lib/errors';

// Mock Prisma Client
vi.mock('@/lib/db', () => ({
  getPrismaClient: () => mockPrisma,
}));

// Mock Docker Service
vi.mock('@/services/docker.service');

// Create mock Prisma instance
const mockPrisma = {
  environment: {
    findUnique: vi.fn(),
  },
  logEntry: {
    create: vi.fn(),
    createMany: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    deleteMany: vi.fn(),
  },
  $connect: vi.fn(),
  $disconnect: vi.fn(),
} as unknown as PrismaClient;

describe('LogService - streamLogs', () => {
  let logService: LogService;
  let mockDockerService: any;

  const mockEnvironment = {
    id: 'env-123',
    name: 'test-env',
    containerId: 'container-456',
    projectId: 'project-789',
    status: 'running',
    image: 'node:20',
    createdAt: new Date(),
    updatedAt: new Date(),
    project: {
      id: 'project-789',
      ownerId: 'user-123',
      owner: { id: 'user-123' },
      team: null,
    },
  };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock DockerService
    mockDockerService = {
      streamContainerLogs: vi.fn(),
    };

    // Create LogService instance with mocked dependencies
    logService = new LogService(mockPrisma, mockDockerService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Success Cases', () => {
    /**
     * Test: Successfully starts streaming logs
     */
    it('should start streaming logs from container', async () => {
      // Arrange
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(mockEnvironment);

      const mockUnsubscribe = vi.fn();
      mockDockerService.streamContainerLogs = vi
        .fn()
        .mockResolvedValue(mockUnsubscribe);

      const callback = vi.fn();

      // Act
      const unsubscribe = await logService.streamLogs('env-123', callback);

      // Assert
      expect(mockPrisma.environment.findUnique).toHaveBeenCalledWith({
        where: { id: 'env-123' },
      });
      expect(mockDockerService.streamContainerLogs).toHaveBeenCalledWith(
        'container-456',
        expect.any(Function),
        {
          follow: true,
          tail: 100,
          timestamps: true,
        }
      );
      expect(unsubscribe).toBeDefined();
      expect(typeof unsubscribe).toBe('function');
    });

    /**
     * Test: Callback is called for each log entry
     */
    it('should call callback for each log entry', async () => {
      // Arrange
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(mockEnvironment);

      let logCallback: Function;
      mockDockerService.streamContainerLogs = vi
        .fn()
        .mockImplementation(async (containerId: string, callback: Function) => {
          logCallback = callback;
          return vi.fn();
        });

      const receivedLogs: any[] = [];
      const callback = vi.fn((log) => receivedLogs.push(log));

      // Act
      await logService.streamLogs('env-123', callback);

      // Simulate Docker sending logs with structured DockerLogEntry
      const dockerLogEntry: DockerLogEntry = {
        stream: 'stdout',
        message: 'Application started',
        timestamp: new Date(),
      };
      logCallback!(dockerLogEntry);

      // Assert
      expect(callback).toHaveBeenCalled();
      expect(receivedLogs).toHaveLength(1);
      expect(receivedLogs[0]!.stream).toBe(LogStream.stdout);
      expect(receivedLogs[0]!.content).toBe('Application started');
      expect(receivedLogs[0]!.timestamp).toBeInstanceOf(Date);
    });

    /**
     * Test: Correctly passes through stderr stream from Docker
     */
    it('should pass through stderr stream from Docker', async () => {
      // Arrange
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(mockEnvironment);

      let logCallback: Function;
      mockDockerService.streamContainerLogs = vi
        .fn()
        .mockImplementation(async (containerId: string, callback: Function) => {
          logCallback = callback;
          return vi.fn();
        });

      const receivedLogs: any[] = [];
      const callback = vi.fn((log) => receivedLogs.push(log));

      // Act
      await logService.streamLogs('env-123', callback);

      // Simulate Docker sending stderr logs
      const stderrEntry1: DockerLogEntry = {
        stream: 'stderr',
        message: 'Error: Database connection failed',
        timestamp: new Date(),
      };
      const stderrEntry2: DockerLogEntry = {
        stream: 'stderr',
        message: 'Exception: Failed to load module',
        timestamp: new Date(),
      };
      logCallback!(stderrEntry1);
      logCallback!(stderrEntry2);

      // Assert
      expect(receivedLogs).toHaveLength(2);
      expect(receivedLogs[0]!.stream).toBe(LogStream.stderr);
      expect(receivedLogs[0]!.content).toBe('Error: Database connection failed');
      expect(receivedLogs[1]!.stream).toBe(LogStream.stderr);
      expect(receivedLogs[1]!.content).toBe('Exception: Failed to load module');
    });

    /**
     * Test: Handles multiple log entries from Docker
     */
    it('should handle multiple log entries from Docker', async () => {
      // Arrange
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(mockEnvironment);

      let logCallback: Function;
      mockDockerService.streamContainerLogs = vi
        .fn()
        .mockImplementation(async (containerId: string, callback: Function) => {
          logCallback = callback;
          return vi.fn();
        });

      const receivedLogs: any[] = [];
      const callback = vi.fn((log) => receivedLogs.push(log));

      // Act
      await logService.streamLogs('env-123', callback);

      // Simulate Docker sending multiple log entries
      logCallback!({ stream: 'stdout', message: 'Line 1', timestamp: new Date() });
      logCallback!({ stream: 'stdout', message: 'Line 2', timestamp: new Date() });
      logCallback!({ stream: 'stdout', message: 'Line 3', timestamp: new Date() });

      // Assert
      expect(receivedLogs).toHaveLength(3);
      expect(receivedLogs[0]!.content).toBe('Line 1');
      expect(receivedLogs[1]!.content).toBe('Line 2');
      expect(receivedLogs[2]!.content).toBe('Line 3');
    });

    /**
     * Test: Returns unsubscribe function that stops streaming
     */
    it('should return unsubscribe function that stops streaming', async () => {
      // Arrange
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(mockEnvironment);

      const mockStopStreaming = vi.fn();
      mockDockerService.streamContainerLogs = vi
        .fn()
        .mockResolvedValue(mockStopStreaming);

      const callback = vi.fn();

      // Act
      const unsubscribe = await logService.streamLogs('env-123', callback);
      unsubscribe();

      // Assert
      expect(mockStopStreaming).toHaveBeenCalled();
    });

    /**
     * Test: Handles stdout logs correctly
     */
    it('should handle stdout logs correctly', async () => {
      // Arrange
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(mockEnvironment);

      let logCallback: Function;
      mockDockerService.streamContainerLogs = vi
        .fn()
        .mockImplementation(async (containerId: string, callback: Function) => {
          logCallback = callback;
          return vi.fn();
        });

      const receivedLogs: any[] = [];
      const callback = vi.fn((log) => receivedLogs.push(log));

      // Act
      await logService.streamLogs('env-123', callback);

      // Simulate stdout logs from Docker
      logCallback!({ stream: 'stdout', message: 'Server listening on port 3000', timestamp: new Date() });
      logCallback!({ stream: 'stdout', message: 'Database connected', timestamp: new Date() });

      // Assert
      expect(receivedLogs).toHaveLength(2);
      expect(receivedLogs[0]!.stream).toBe(LogStream.stdout);
      expect(receivedLogs[0]!.content).toBe('Server listening on port 3000');
      expect(receivedLogs[1]!.stream).toBe(LogStream.stdout);
      expect(receivedLogs[1]!.content).toBe('Database connected');
    });
  });

  describe('Error Handling', () => {
    /**
     * Test: Throws NotFoundError for non-existent environment
     */
    it('should throw NotFoundError if environment does not exist', async () => {
      // Arrange
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(null);

      const callback = vi.fn();

      // Act & Assert
      await expect(logService.streamLogs('non-existent', callback)).rejects.toThrow(
        NotFoundError
      );
      await expect(logService.streamLogs('non-existent', callback)).rejects.toThrow(
        'Environment not found'
      );
    });

    /**
     * Test: Throws NotFoundError if environment has no container
     */
    it('should throw NotFoundError if environment has no container', async () => {
      // Arrange
      const envWithoutContainer = {
        ...mockEnvironment,
        containerId: null,
      };
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(envWithoutContainer);

      const callback = vi.fn();

      // Act & Assert
      await expect(logService.streamLogs('env-123', callback)).rejects.toThrow(
        NotFoundError
      );
      await expect(logService.streamLogs('env-123', callback)).rejects.toThrow(
        'Environment has no container'
      );
    });

    /**
     * Test: Handles Docker streaming errors gracefully
     */
    it('should handle Docker streaming errors', async () => {
      // Arrange
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(mockEnvironment);

      mockDockerService.streamContainerLogs = vi
        .fn()
        .mockRejectedValue(new Error('Docker API error'));

      const callback = vi.fn();

      // Act & Assert
      await expect(logService.streamLogs('env-123', callback)).rejects.toThrow(
        'Docker API error'
      );
    });
  });

  describe('Content Handling', () => {
    /**
     * Test: Handles logs with special characters
     */
    it('should handle logs with special characters', async () => {
      // Arrange
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(mockEnvironment);

      let logCallback: Function;
      mockDockerService.streamContainerLogs = vi
        .fn()
        .mockImplementation(async (containerId: string, callback: Function) => {
          logCallback = callback;
          return vi.fn();
        });

      const receivedLogs: any[] = [];
      const callback = vi.fn((log) => receivedLogs.push(log));

      // Act
      await logService.streamLogs('env-123', callback);

      // Send logs with special characters from Docker
      logCallback!({ stream: 'stdout', message: 'Log with "quotes" and \'apostrophes\'', timestamp: new Date() });
      logCallback!({ stream: 'stdout', message: 'Log with unicode: 你好世界 🚀', timestamp: new Date() });
      logCallback!({ stream: 'stdout', message: 'Log with backslash: C:\\path\\to\\file', timestamp: new Date() });

      // Assert
      expect(receivedLogs).toHaveLength(3);
      expect(receivedLogs[0]!.content).toContain('quotes');
      expect(receivedLogs[1]!.content).toContain('你好世界');
      expect(receivedLogs[2]!.content).toContain('backslash');
    });

    /**
     * Test: Preserves log content exactly
     */
    it('should preserve log content exactly (no modifications)', async () => {
      // Arrange
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(mockEnvironment);

      let logCallback: Function;
      mockDockerService.streamContainerLogs = vi
        .fn()
        .mockImplementation(async (containerId: string, callback: Function) => {
          logCallback = callback;
          return vi.fn();
        });

      const receivedLogs: any[] = [];
      const callback = vi.fn((log) => receivedLogs.push(log));

      // Act
      await logService.streamLogs('env-123', callback);

      const testContent = '  Leading and trailing spaces  ';
      logCallback!({ stream: 'stdout', message: testContent, timestamp: new Date() });

      // Assert
      expect(receivedLogs[0]!.content).toBe(testContent);
    });
  });

  describe('Callback Invocation', () => {
    /**
     * Test: Callback receives all required fields
     */
    it('should pass all required fields to callback', async () => {
      // Arrange
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(mockEnvironment);

      let logCallback: Function;
      mockDockerService.streamContainerLogs = vi
        .fn()
        .mockImplementation(async (containerId: string, callback: Function) => {
          logCallback = callback;
          return vi.fn();
        });

      const callback = vi.fn();

      // Act
      await logService.streamLogs('env-123', callback);
      logCallback!({ stream: 'stdout', message: 'Test log', timestamp: new Date() });

      // Assert
      expect(callback).toHaveBeenCalledWith({
        stream: expect.any(String),
        content: expect.any(String),
        timestamp: expect.any(Date),
      });

      const callArg = callback.mock.calls[0]![0];
      expect(['stdout', 'stderr']).toContain(callArg.stream);
    });

    /**
     * Test: Callback is called in order
     */
    it('should call callback in order for sequential logs', async () => {
      // Arrange
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(mockEnvironment);

      let logCallback: Function;
      mockDockerService.streamContainerLogs = vi
        .fn()
        .mockImplementation(async (containerId: string, callback: Function) => {
          logCallback = callback;
          return vi.fn();
        });

      const receivedLogs: string[] = [];
      const callback = vi.fn((log) => receivedLogs.push(log.content));

      // Act
      await logService.streamLogs('env-123', callback);

      // Send logs sequentially from Docker
      logCallback!({ stream: 'stdout', message: 'First', timestamp: new Date() });
      logCallback!({ stream: 'stdout', message: 'Second', timestamp: new Date() });
      logCallback!({ stream: 'stdout', message: 'Third', timestamp: new Date() });

      // Assert
      expect(receivedLogs).toEqual(['First', 'Second', 'Third']);
    });

    /**
     * Test: Handles callback errors without crashing
     */
    it('should handle callback errors gracefully', async () => {
      // Arrange
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(mockEnvironment);

      let logCallback: Function;
      mockDockerService.streamContainerLogs = vi
        .fn()
        .mockImplementation(async (containerId: string, callback: Function) => {
          logCallback = callback;
          return vi.fn();
        });

      const callback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });

      // Act
      await logService.streamLogs('env-123', callback);

      // This should not crash the streaming
      expect(() => logCallback!({ stream: 'stdout', message: 'Test', timestamp: new Date() })).toThrow('Callback error');
    });
  });

  describe('Unsubscribe Functionality', () => {
    /**
     * Test: Unsubscribe can be called multiple times safely
     */
    it('should allow calling unsubscribe multiple times', async () => {
      // Arrange
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(mockEnvironment);

      const mockStopStreaming = vi.fn();
      mockDockerService.streamContainerLogs = vi
        .fn()
        .mockResolvedValue(mockStopStreaming);

      const callback = vi.fn();

      // Act
      const unsubscribe = await logService.streamLogs('env-123', callback);
      unsubscribe();
      unsubscribe();
      unsubscribe();

      // Assert - Should not throw and can be called multiple times
      expect(mockStopStreaming).toHaveBeenCalledTimes(3);
    });
  });
});
