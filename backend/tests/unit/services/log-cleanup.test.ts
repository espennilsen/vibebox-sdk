/**
 * LogCleanupService Unit Tests
 * Tests for log retention, rotation, and cleanup functionality
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LogCleanupService, LOG_RETENTION_CONFIG } from '@/services/log-cleanup.service';
import { PrismaClient } from '@prisma/client';
import { LogStream } from '@/types/prisma-enums';

// Mock Prisma client
vi.mock('@/lib/db', () => ({
  getPrismaClient: vi.fn(),
}));

describe('LogCleanupService', () => {
  let logCleanupService: LogCleanupService;
  let prismaMock: any;

  beforeEach(() => {
    // Create mock Prisma client
    prismaMock = {
      logEntry: {
        deleteMany: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      environment: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
    };
    logCleanupService = new LogCleanupService(prismaMock as unknown as PrismaClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('runCleanup', () => {
    it('should delete logs older than retention period', async () => {
      // Mock environment query
      prismaMock.environment.count.mockResolvedValue(2);

      // Mock age-based deletion
      prismaMock.logEntry.deleteMany.mockResolvedValueOnce({ count: 150 });

      // Mock environment queries for size-based cleanup
      prismaMock.environment.findMany.mockResolvedValue([{ id: 'env-1' }, { id: 'env-2' }] as any);

      // Mock log queries for size check (both under limit)
      prismaMock.logEntry.findMany
        .mockResolvedValueOnce([]) // env-1 logs
        .mockResolvedValueOnce([]); // env-2 logs

      const stats = await logCleanupService.runCleanup();

      expect(stats.deletedByAge).toBe(150);
      expect(stats.deletedBySize).toBe(0);
      expect(stats.environmentsProcessed).toBe(2);
      expect(stats.spaceFreedMB).toBeGreaterThanOrEqual(0);
      expect(stats.durationMs).toBeGreaterThanOrEqual(0);
      expect(stats.timestamp).toBeInstanceOf(Date);

      // Verify age-based deletion was called with correct date
      const deleteCall = prismaMock.logEntry.deleteMany.mock.calls[0]![0];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - LOG_RETENTION_CONFIG.RETENTION_DAYS);

      expect(deleteCall?.where?.timestamp?.lt).toBeDefined();
      const actualCutoff = deleteCall?.where?.timestamp?.lt as Date;
      // Allow 5 second difference for test execution time
      expect(Math.abs(actualCutoff.getTime() - cutoffDate.getTime())).toBeLessThan(5000);
    });

    it('should enforce size limits per environment', async () => {
      // Mock environment query
      prismaMock.environment.count.mockResolvedValue(1);

      // Mock age-based deletion (no old logs)
      prismaMock.logEntry.deleteMany.mockResolvedValueOnce({ count: 0 });

      // Mock environment for size-based cleanup
      prismaMock.environment.findMany.mockResolvedValue([{ id: 'env-1' }] as any);

      // Create mock logs that exceed 20MB limit
      const largeLogs = Array.from({ length: 100 }, (_, i) => ({
        id: `log-${i}`,
        environmentId: 'env-1',
        timestamp: new Date(Date.now() - i * 1000),
        stream: LogStream.stdout,
        message: 'x'.repeat(300000), // ~300KB each = ~30MB total
        createdAt: new Date(),
      }));

      prismaMock.logEntry.findMany.mockResolvedValueOnce(largeLogs as any);

      // Mock deletion of excess logs
      prismaMock.logEntry.deleteMany.mockResolvedValueOnce({ count: 34 });

      const stats = await logCleanupService.runCleanup();

      expect(stats.deletedByAge).toBe(0);
      expect(stats.deletedBySize).toBe(34);
      expect(stats.spaceFreedMB).toBeGreaterThan(0);
      expect(stats.environmentsProcessed).toBe(1);
    });

    it('should process multiple environments', async () => {
      // Mock environment query
      prismaMock.environment.count.mockResolvedValue(3);

      // Mock age-based deletion
      prismaMock.logEntry.deleteMany.mockResolvedValueOnce({ count: 50 });

      // Mock 3 environments
      prismaMock.environment.findMany.mockResolvedValue([
        { id: 'env-1' },
        { id: 'env-2' },
        { id: 'env-3' },
      ] as any);

      // All environments under size limit
      prismaMock.logEntry.findMany
        .mockResolvedValueOnce([]) // env-1
        .mockResolvedValueOnce([]) // env-2
        .mockResolvedValueOnce([]); // env-3

      const stats = await logCleanupService.runCleanup();

      expect(stats.deletedByAge).toBe(50);
      expect(stats.environmentsProcessed).toBe(3);
    });

    it('should track cleanup duration', async () => {
      prismaMock.environment.count.mockResolvedValue(0);
      prismaMock.logEntry.deleteMany.mockResolvedValue({ count: 0 });
      prismaMock.environment.findMany.mockResolvedValue([]);

      const stats = await logCleanupService.runCleanup();

      expect(stats.durationMs).toBeGreaterThanOrEqual(0);
      expect(stats.durationMs).toBeLessThan(10000); // Should be fast
    });
  });

  describe('getEnvironmentStats', () => {
    it('should return statistics for environment with logs', async () => {
      const envId = 'env-123';
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 3600000);

      const mockLogs = [
        {
          id: 'log-1',
          timestamp: hourAgo,
          stream: LogStream.stdout,
          message: 'x'.repeat(1000),
        },
        {
          id: 'log-2',
          timestamp: now,
          stream: LogStream.stderr,
          message: 'y'.repeat(2000),
        },
      ];

      prismaMock.logEntry.findMany.mockResolvedValue(mockLogs as any);

      const stats = await logCleanupService.getEnvironmentStats(envId);

      expect(stats.environmentId).toBe(envId);
      expect(stats.logCount).toBe(2);
      expect(stats.totalSizeMB).toBeCloseTo(3000 / (1024 * 1024), 6);
      expect(stats.oldestLogDate).toEqual(hourAgo);
      expect(stats.newestLogDate).toEqual(now);
      expect(stats.logsToDelete).toBe(0); // No old logs
      expect(stats.spaceToFreeMB).toBe(0);
    });

    it('should identify logs that would be deleted by age', async () => {
      const envId = 'env-123';
      const now = new Date();
      const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 3600000);

      const mockLogs = [
        {
          id: 'log-old',
          timestamp: eightDaysAgo,
          stream: LogStream.stdout,
          message: 'x'.repeat(1000),
        },
        {
          id: 'log-new',
          timestamp: now,
          stream: LogStream.stdout,
          message: 'y'.repeat(1000),
        },
      ];

      prismaMock.logEntry.findMany.mockResolvedValue(mockLogs as any);

      const stats = await logCleanupService.getEnvironmentStats(envId);

      expect(stats.logCount).toBe(2);
      expect(stats.logsToDelete).toBe(1); // One old log
      expect(stats.spaceToFreeMB).toBeGreaterThan(0);
    });

    it('should identify logs that would be deleted by size', async () => {
      const envId = 'env-123';
      const now = new Date();

      // Create logs that exceed 20MB
      const mockLogs = Array.from({ length: 80 }, (_, i) => ({
        id: `log-${i}`,
        timestamp: new Date(now.getTime() - i * 1000),
        stream: LogStream.stdout,
        message: 'x'.repeat(300000), // ~300KB each = ~24MB total
      }));

      prismaMock.logEntry.findMany.mockResolvedValue(mockLogs as any);

      const stats = await logCleanupService.getEnvironmentStats(envId);

      expect(stats.logCount).toBe(80);
      expect(stats.totalSizeMB).toBeGreaterThan(LOG_RETENTION_CONFIG.MAX_SIZE_MB);
      expect(stats.logsToDelete).toBeGreaterThan(0);
      expect(stats.spaceToFreeMB).toBeGreaterThan(0);
    });

    it('should handle environment with no logs', async () => {
      const envId = 'env-empty';

      prismaMock.logEntry.findMany.mockResolvedValue([]);

      const stats = await logCleanupService.getEnvironmentStats(envId);

      expect(stats.environmentId).toBe(envId);
      expect(stats.logCount).toBe(0);
      expect(stats.totalSizeMB).toBe(0);
      expect(stats.oldestLogDate).toBeUndefined();
      expect(stats.newestLogDate).toBeUndefined();
      expect(stats.logsToDelete).toBe(0);
      expect(stats.spaceToFreeMB).toBe(0);
    });
  });

  describe('getAllEnvironmentStats', () => {
    it('should return stats for all environments', async () => {
      prismaMock.environment.findMany.mockResolvedValue([{ id: 'env-1' }, { id: 'env-2' }] as any);

      prismaMock.logEntry.findMany
        .mockResolvedValueOnce([
          { id: 'log-1', timestamp: new Date(), stream: LogStream.stdout, message: 'test' },
        ] as any)
        .mockResolvedValueOnce([
          { id: 'log-2', timestamp: new Date(), stream: LogStream.stdout, message: 'test2' },
        ] as any);

      const allStats = await logCleanupService.getAllEnvironmentStats();

      expect(allStats).toHaveLength(2);
      expect(allStats[0]!.environmentId).toBe('env-1');
      expect(allStats[1]!.environmentId).toBe('env-2');
    });

    it('should handle no environments', async () => {
      prismaMock.environment.findMany.mockResolvedValue([]);

      const allStats = await logCleanupService.getAllEnvironmentStats();

      expect(allStats).toHaveLength(0);
    });
  });

  describe('getGlobalStats', () => {
    it('should aggregate stats across all environments', async () => {
      prismaMock.environment.findMany.mockResolvedValue([{ id: 'env-1' }, { id: 'env-2' }] as any);

      const mockLogs1 = [
        { id: 'log-1', timestamp: new Date(), stream: LogStream.stdout, message: 'x'.repeat(1000) },
      ];

      const mockLogs2 = [
        { id: 'log-2', timestamp: new Date(), stream: LogStream.stdout, message: 'y'.repeat(2000) },
        { id: 'log-3', timestamp: new Date(), stream: LogStream.stderr, message: 'z'.repeat(3000) },
      ];

      prismaMock.logEntry.findMany
        .mockResolvedValueOnce(mockLogs1 as any)
        .mockResolvedValueOnce(mockLogs2 as any);

      const stats = await logCleanupService.getGlobalStats();

      expect(stats.totalLogs).toBe(3);
      expect(stats.totalEnvironments).toBe(2);
      expect(stats.totalSizeMB).toBeGreaterThan(0);
      expect(stats.logsToDelete).toBeGreaterThanOrEqual(0);
      expect(stats.spaceToFreeMB).toBeGreaterThanOrEqual(0);
    });
  });

  describe('exportLogs', () => {
    it('should export logs as text', async () => {
      const envId = 'env-123';
      const timestamp1 = new Date('2025-01-01T12:00:00Z');
      const timestamp2 = new Date('2025-01-01T12:01:00Z');

      const mockLogs = [
        {
          id: 'log-1',
          environmentId: envId,
          timestamp: timestamp1,
          stream: LogStream.stdout,
          message: 'First log message',
          createdAt: timestamp1,
        },
        {
          id: 'log-2',
          environmentId: envId,
          timestamp: timestamp2,
          stream: LogStream.stderr,
          message: 'Error message',
          createdAt: timestamp2,
        },
      ];

      prismaMock.logEntry.findMany.mockResolvedValue(mockLogs as any);

      const exported = await logCleanupService.exportLogs(envId, false);

      expect(typeof exported).toBe('string');
      expect(exported).toContain('First log message');
      expect(exported).toContain('Error message');
      expect(exported).toContain('[STDOUT]');
      expect(exported).toContain('[STDERR]');
    });

    it('should export logs as compressed data', async () => {
      const envId = 'env-123';

      const mockLogs = [
        {
          id: 'log-1',
          environmentId: envId,
          timestamp: new Date(),
          stream: LogStream.stdout,
          message: 'Test message',
          createdAt: new Date(),
        },
      ];

      prismaMock.logEntry.findMany.mockResolvedValue(mockLogs as any);

      const exported = await logCleanupService.exportLogs(envId, true);

      expect(Buffer.isBuffer(exported)).toBe(true);
      expect((exported as Buffer).length).toBeGreaterThan(0);
    });

    it('should handle empty log export', async () => {
      const envId = 'env-empty';

      prismaMock.logEntry.findMany.mockResolvedValue([]);

      const exported = await logCleanupService.exportLogs(envId, false);

      expect(exported).toBe('');
    });
  });

  describe('LOG_RETENTION_CONFIG', () => {
    it('should have correct retention configuration', () => {
      expect(LOG_RETENTION_CONFIG.RETENTION_DAYS).toBe(7);
      expect(LOG_RETENTION_CONFIG.MAX_SIZE_MB).toBe(20);
      expect(LOG_RETENTION_CONFIG.COMPRESSION_AGE_DAYS).toBe(3);
    });
  });
});
