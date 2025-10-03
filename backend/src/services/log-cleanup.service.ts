/**
 * LogCleanupService - Log Retention and Cleanup Service
 * Handles automated log cleanup, rotation, and retention policies
 * Implements 7-day retention and 20MB size limits from spec
 */
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '@/lib/db';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);

/**
 * Log retention configuration from spec
 */
export const LOG_RETENTION_CONFIG = {
  /**
   * Maximum age of logs in days (7 days)
   */
  RETENTION_DAYS: 7,

  /**
   * Maximum total log size per environment in MB (20MB)
   */
  MAX_SIZE_MB: 20,

  /**
   * Size threshold for compression (logs older than this are compressed)
   */
  COMPRESSION_AGE_DAYS: 3,
};

/**
 * Cleanup statistics
 */
export interface CleanupStats {
  /**
   * Number of logs deleted due to age
   */
  deletedByAge: number;

  /**
   * Number of logs deleted due to size limit
   */
  deletedBySize: number;

  /**
   * Number of logs compressed
   */
  compressed: number;

  /**
   * Number of environments processed
   */
  environmentsProcessed: number;

  /**
   * Total space freed in MB
   */
  spaceFreedMB: number;

  /**
   * Duration of cleanup in milliseconds
   */
  durationMs: number;

  /**
   * Timestamp when cleanup ran
   */
  timestamp: Date;
}

/**
 * Environment log statistics
 */
export interface EnvironmentLogStats {
  environmentId: string;
  logCount: number;
  totalSizeMB: number;
  oldestLogDate?: Date;
  newestLogDate?: Date;
  logsToDelete: number;
  spaceToFreeMB: number;
}

/**
 * LogCleanupService - Manages log retention and cleanup
 *
 * Implements automated cleanup policies:
 * - Deletes logs older than 7 days
 * - Enforces 20MB size limit per environment
 * - Compresses old logs to save space
 * - Provides cleanup statistics and monitoring
 *
 * @example
 * ```typescript
 * const cleanupService = new LogCleanupService();
 *
 * // Run cleanup
 * const stats = await cleanupService.runCleanup();
 * console.log(`Deleted ${stats.deletedByAge} old logs`);
 * console.log(`Freed ${stats.spaceFreedMB.toFixed(2)} MB`);
 *
 * // Get environment stats
 * const envStats = await cleanupService.getEnvironmentStats('env-id-123');
 * console.log(`Environment has ${envStats.logCount} logs (${envStats.totalSizeMB.toFixed(2)} MB)`);
 * ```
 */
export class LogCleanupService {
  /**
   * Creates a new LogCleanupService instance
   *
   * @param prisma - Prisma client instance for database access
   */
  constructor(private prisma: PrismaClient = getPrismaClient()) {}

  /**
   * Run complete cleanup process
   *
   * Executes all cleanup policies:
   * 1. Delete logs older than retention period
   * 2. Enforce size limits per environment
   * 3. Compress old logs (optional)
   *
   * @returns Cleanup statistics
   *
   * @example
   * ```typescript
   * const cleanupService = new LogCleanupService();
   * const stats = await cleanupService.runCleanup();
   * console.log(`Cleanup complete: ${stats.deletedByAge + stats.deletedBySize} logs deleted`);
   * ```
   */
  async runCleanup(): Promise<CleanupStats> {
    const startTime = Date.now();
    const timestamp = new Date();

    console.log('[LogCleanup] Starting log cleanup...');

    // Step 1: Delete old logs (age-based retention)
    const deletedByAge = await this.cleanupByAge();
    console.log(
      `[LogCleanup] Deleted ${deletedByAge.count} logs older than ${LOG_RETENTION_CONFIG.RETENTION_DAYS} days`
    );

    // Step 2: Enforce size limits per environment
    const { deletedBySize, spaceFreed } = await this.cleanupBySize();
    console.log(
      `[LogCleanup] Deleted ${deletedBySize} logs exceeding size limit (freed ${spaceFreed.toFixed(2)} MB)`
    );

    // Step 3: Get environment count
    const environmentCount = await this.prisma.environment.count();

    const durationMs = Date.now() - startTime;

    const stats: CleanupStats = {
      deletedByAge: deletedByAge.count,
      deletedBySize,
      compressed: 0, // Compression not implemented yet
      environmentsProcessed: environmentCount,
      spaceFreedMB: spaceFreed,
      durationMs,
      timestamp,
    };

    console.log(`[LogCleanup] Cleanup completed in ${durationMs}ms`);
    console.log(`[LogCleanup] Total deleted: ${stats.deletedByAge + stats.deletedBySize} logs`);
    console.log(`[LogCleanup] Space freed: ${stats.spaceFreedMB.toFixed(2)} MB`);

    return stats;
  }

  /**
   * Delete logs older than retention period
   *
   * @private
   * @returns Delete result with count
   */
  private async cleanupByAge(): Promise<{ count: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - LOG_RETENTION_CONFIG.RETENTION_DAYS);

    const result = await this.prisma.logEntry.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    return result;
  }

  /**
   * Enforce size limits per environment
   *
   * @private
   * @returns Object with deletion count and space freed
   */
  private async cleanupBySize(): Promise<{ deletedBySize: number; spaceFreed: number }> {
    const environments = await this.prisma.environment.findMany({
      select: { id: true },
    });

    let totalDeleted = 0;
    let totalSpaceFreed = 0;

    for (const env of environments) {
      const { deleted, spaceFreed } = await this.cleanupEnvironmentBySize(env.id);
      totalDeleted += deleted;
      totalSpaceFreed += spaceFreed;
    }

    return {
      deletedBySize: totalDeleted,
      spaceFreed: totalSpaceFreed,
    };
  }

  /**
   * Cleanup logs for a single environment by size
   *
   * @private
   * @param environmentId - Environment ID
   * @returns Deletion statistics
   */
  private async cleanupEnvironmentBySize(
    environmentId: string
  ): Promise<{ deleted: number; spaceFreed: number }> {
    // Get all logs for environment (ordered by timestamp)
    const logs = await this.prisma.logEntry.findMany({
      where: { environmentId },
      select: { id: true, message: true, timestamp: true },
      orderBy: { timestamp: 'asc' },
    });

    // Calculate total size
    const totalSizeBytes = logs.reduce(
      (sum, log) => sum + Buffer.byteLength(log.message, 'utf8'),
      0
    );
    const totalSizeMB = totalSizeBytes / (1024 * 1024);

    // If under limit, no cleanup needed
    if (totalSizeMB <= LOG_RETENTION_CONFIG.MAX_SIZE_MB) {
      return { deleted: 0, spaceFreed: 0 };
    }

    // Calculate how much to delete
    const excessMB = totalSizeMB - LOG_RETENTION_CONFIG.MAX_SIZE_MB;
    const bytesToDelete = Math.ceil(excessMB * 1024 * 1024);

    // Collect oldest logs until we've deleted enough
    let deletedBytes = 0;
    const logsToDelete: string[] = [];

    for (const log of logs) {
      logsToDelete.push(log.id);
      deletedBytes += Buffer.byteLength(log.message, 'utf8');
      if (deletedBytes >= bytesToDelete) {
        break;
      }
    }

    // Delete identified logs
    const result = await this.prisma.logEntry.deleteMany({
      where: {
        id: { in: logsToDelete },
      },
    });

    const spaceFreed = deletedBytes / (1024 * 1024);

    return {
      deleted: result.count,
      spaceFreed,
    };
  }

  /**
   * Get statistics for a specific environment
   *
   * @param environmentId - Environment ID
   * @returns Environment log statistics
   *
   * @example
   * ```typescript
   * const cleanupService = new LogCleanupService();
   * const stats = await cleanupService.getEnvironmentStats('env-id-123');
   * console.log(`Environment has ${stats.logCount} logs`);
   * console.log(`Total size: ${stats.totalSizeMB.toFixed(2)} MB`);
   * if (stats.logsToDelete > 0) {
   *   console.log(`Will delete ${stats.logsToDelete} logs (${stats.spaceToFreeMB.toFixed(2)} MB)`);
   * }
   * ```
   */
  async getEnvironmentStats(environmentId: string): Promise<EnvironmentLogStats> {
    const logs = await this.prisma.logEntry.findMany({
      where: { environmentId },
      select: { id: true, message: true, timestamp: true },
      orderBy: { timestamp: 'asc' },
    });

    const logCount = logs.length;
    const totalSizeBytes = logs.reduce(
      (sum, log) => sum + Buffer.byteLength(log.message, 'utf8'),
      0
    );
    const totalSizeMB = totalSizeBytes / (1024 * 1024);

    const oldestLogDate = logs.length > 0 ? logs[0]!.timestamp : undefined;
    const newestLogDate = logs.length > 0 ? logs[logs.length - 1]!.timestamp : undefined;

    // Calculate what would be deleted
    let logsToDelete = 0;
    let spaceToFreeMB = 0;

    // Age-based deletions
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - LOG_RETENTION_CONFIG.RETENTION_DAYS);
    const oldLogs = logs.filter((log) => log.timestamp < cutoffDate);
    logsToDelete += oldLogs.length;
    spaceToFreeMB +=
      oldLogs.reduce((sum, log) => sum + Buffer.byteLength(log.message, 'utf8'), 0) / (1024 * 1024);

    // Size-based deletions
    if (totalSizeMB > LOG_RETENTION_CONFIG.MAX_SIZE_MB) {
      const excessMB = totalSizeMB - LOG_RETENTION_CONFIG.MAX_SIZE_MB;
      const bytesToDelete = Math.ceil(excessMB * 1024 * 1024);

      let deletedBytes = 0;
      let countToDelete = 0;

      for (const log of logs) {
        // Skip logs already counted in age-based deletion
        if (log.timestamp < cutoffDate) continue;

        countToDelete++;
        deletedBytes += Buffer.byteLength(log.message, 'utf8');
        if (deletedBytes >= bytesToDelete) {
          break;
        }
      }

      logsToDelete += countToDelete;
      spaceToFreeMB += deletedBytes / (1024 * 1024);
    }

    return {
      environmentId,
      logCount,
      totalSizeMB,
      oldestLogDate,
      newestLogDate,
      logsToDelete,
      spaceToFreeMB,
    };
  }

  /**
   * Get statistics for all environments
   *
   * @returns Array of environment statistics
   *
   * @example
   * ```typescript
   * const cleanupService = new LogCleanupService();
   * const allStats = await cleanupService.getAllEnvironmentStats();
   * for (const stats of allStats) {
   *   console.log(`${stats.environmentId}: ${stats.logCount} logs, ${stats.totalSizeMB.toFixed(2)} MB`);
   * }
   * ```
   */
  async getAllEnvironmentStats(): Promise<EnvironmentLogStats[]> {
    const environments = await this.prisma.environment.findMany({
      select: { id: true },
    });

    const statsPromises = environments.map((env) => this.getEnvironmentStats(env.id));
    return Promise.all(statsPromises);
  }

  /**
   * Get global statistics across all environments
   *
   * @returns Global log statistics
   *
   * @example
   * ```typescript
   * const cleanupService = new LogCleanupService();
   * const stats = await cleanupService.getGlobalStats();
   * console.log(`Total logs: ${stats.totalLogs}`);
   * console.log(`Total size: ${stats.totalSizeMB.toFixed(2)} MB`);
   * console.log(`Logs to delete: ${stats.logsToDelete}`);
   * ```
   */
  async getGlobalStats(): Promise<{
    totalLogs: number;
    totalSizeMB: number;
    totalEnvironments: number;
    logsToDelete: number;
    spaceToFreeMB: number;
  }> {
    const allStats = await this.getAllEnvironmentStats();

    const totalLogs = allStats.reduce((sum, stat) => sum + stat.logCount, 0);
    const totalSizeMB = allStats.reduce((sum, stat) => sum + stat.totalSizeMB, 0);
    const totalEnvironments = allStats.length;
    const logsToDelete = allStats.reduce((sum, stat) => sum + stat.logsToDelete, 0);
    const spaceToFreeMB = allStats.reduce((sum, stat) => sum + stat.spaceToFreeMB, 0);

    return {
      totalLogs,
      totalSizeMB,
      totalEnvironments,
      logsToDelete,
      spaceToFreeMB,
    };
  }

  /**
   * Export logs for an environment
   *
   * Useful for backing up logs before cleanup
   *
   * @param environmentId - Environment ID
   * @param compress - Whether to compress the export (default: false)
   * @returns Log data as string (or compressed Buffer)
   *
   * @example
   * ```typescript
   * const cleanupService = new LogCleanupService();
   * const logs = await cleanupService.exportLogs('env-id-123', false);
   * fs.writeFileSync('logs.txt', logs);
   *
   * // Or compressed
   * const compressed = await cleanupService.exportLogs('env-id-123', true);
   * fs.writeFileSync('logs.txt.gz', compressed);
   * ```
   */
  async exportLogs(environmentId: string, compress: boolean = false): Promise<string | Buffer> {
    const logs = await this.prisma.logEntry.findMany({
      where: { environmentId },
      orderBy: { timestamp: 'asc' },
    });

    // Format logs as text
    const logText = logs
      .map((log) => {
        const timestamp = log.timestamp.toISOString();
        const stream = log.stream.toUpperCase();
        return `[${timestamp}] [${stream}] ${log.message}`;
      })
      .join('\n');

    if (compress) {
      return await gzip(Buffer.from(logText, 'utf-8'));
    }

    return logText;
  }
}
