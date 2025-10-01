/**
 * LogService - Log Management Service
 * Handles log persistence, streaming, and retention policies
 * Tasks: T075, T062-T064
 */
import { PrismaClient } from '@prisma/client';
import type { LogEntry } from '@prisma/client';
import { LogStream } from '@prisma/client';
import { getPrismaClient } from '@/lib/db';
import { DockerService } from './docker.service';
import { NotFoundError, ForbiddenError } from '@/lib/errors';

/**
 * Log Entry Data Transfer Object
 */
export interface LogEntryDTO {
  id: string;
  timestamp: Date;
  stream: LogStream;
  message: string;
}

/**
 * Pagination metadata
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Paginated log response
 */
export interface PaginatedLogs {
  logs: LogEntryDTO[];
  pagination: PaginationInfo;
}

/**
 * Log write data
 */
export interface WriteLogData {
  environmentId: string;
  timestamp: Date;
  stream: LogStream;
  message: string;
}

/**
 * Log retention configuration (7 days, 20MB limit)
 */
const LOG_RETENTION_DAYS = 7;
const LOG_SIZE_LIMIT_MB = 20;

/**
 * LogService - Manages environment logs
 *
 * Provides methods for persisting logs, retrieving historical logs,
 * streaming real-time logs, and enforcing retention policies.
 */
export class LogService {
  /**
   * Creates a new LogService instance
   *
   * @param prisma - Prisma client instance for database access
   * @param dockerService - Docker service instance for log streaming
   */
  constructor(
    private prisma: PrismaClient = getPrismaClient(),
    private dockerService: DockerService = new DockerService()
  ) {}

  /**
   * Write log entry to database
   *
   * Persists log entry for historical access
   *
   * @param data - Log entry data
   * @returns Created log entry
   *
   * @example
   * ```typescript
   * const logService = new LogService();
   * await logService.writeLog({
   *   environmentId: 'env-id-123',
   *   timestamp: new Date(),
   *   stream: LogStream.stdout,
   *   message: 'Application started'
   * });
   * ```
   */
  async writeLog(data: WriteLogData): Promise<LogEntryDTO> {
    const logEntry = await this.prisma.logEntry.create({
      data: {
        environmentId: data.environmentId,
        timestamp: data.timestamp,
        stream: data.stream,
        message: data.message,
      },
    });

    return this.toLogEntryDTO(logEntry);
  }

  /**
   * Write multiple log entries in batch
   *
   * More efficient for bulk log writing
   *
   * @param logs - Array of log entry data
   * @returns Number of logs created
   *
   * @example
   * ```typescript
   * const logService = new LogService();
   * await logService.writeBatchLogs([
   *   { environmentId: 'env-id', timestamp: new Date(), stream: LogStream.stdout, message: 'Log 1' },
   *   { environmentId: 'env-id', timestamp: new Date(), stream: LogStream.stderr, message: 'Error' }
   * ]);
   * ```
   */
  async writeBatchLogs(logs: WriteLogData[]): Promise<number> {
    const result = await this.prisma.logEntry.createMany({
      data: logs.map((log) => ({
        environmentId: log.environmentId,
        timestamp: log.timestamp,
        stream: log.stream,
        message: log.message,
      })),
    });

    return result.count;
  }

  /**
   * Get logs for environment with pagination
   *
   * Retrieves historical logs from database
   *
   * @param environmentId - Environment ID
   * @param userId - User ID requesting logs (for permission check)
   * @param page - Page number (1-indexed)
   * @param limit - Items per page
   * @param stream - Filter by stream (optional)
   * @param since - Filter logs after timestamp (optional)
   * @returns Paginated logs
   * @throws {NotFoundError} If environment doesn't exist
   * @throws {ForbiddenError} If user lacks access
   *
   * @example
   * ```typescript
   * const logService = new LogService();
   * const result = await logService.getLogs('env-id-123', 'user-id-456', 1, 100);
   * console.log(result.logs.length); // Up to 100 logs
   * console.log(result.pagination.total); // Total log count
   * ```
   */
  async getLogs(
    environmentId: string,
    userId: string,
    page: number = 1,
    limit: number = 100,
    stream?: LogStream,
    since?: Date
  ): Promise<PaginatedLogs> {
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

    // Build where clause
    const where: any = { environmentId };
    if (stream) {
      where.stream = stream;
    }
    if (since) {
      where.timestamp = { gte: since };
    }

    // Get total count
    const total = await this.prisma.logEntry.count({ where });

    // Get paginated logs
    const skip = (page - 1) * limit;
    const logs = await this.prisma.logEntry.findMany({
      where,
      skip,
      take: limit,
      orderBy: { timestamp: 'asc' },
    });

    return {
      logs: logs.map((log) => this.toLogEntryDTO(log)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get recent logs for environment
   *
   * Convenience method to get most recent logs
   *
   * @param environmentId - Environment ID
   * @param userId - User ID requesting logs
   * @param count - Number of recent logs to retrieve
   * @param stream - Filter by stream (optional)
   * @returns Array of recent log entries
   * @throws {NotFoundError} If environment doesn't exist
   * @throws {ForbiddenError} If user lacks access
   *
   * @example
   * ```typescript
   * const logService = new LogService();
   * const recentLogs = await logService.getRecentLogs('env-id-123', 'user-id-456', 50);
   * ```
   */
  async getRecentLogs(
    environmentId: string,
    userId: string,
    count: number = 100,
    stream?: LogStream
  ): Promise<LogEntryDTO[]> {
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

    // Build where clause
    const where: any = { environmentId };
    if (stream) {
      where.stream = stream;
    }

    // Get recent logs
    const logs = await this.prisma.logEntry.findMany({
      where,
      take: count,
      orderBy: { timestamp: 'desc' },
    });

    // Return in chronological order
    return logs.reverse().map((log) => this.toLogEntryDTO(log));
  }

  /**
   * Stream live logs from container
   *
   * Returns real-time container logs (not from database)
   *
   * @param environmentId - Environment ID
   * @param userId - User ID requesting logs
   * @param tail - Number of previous lines to include
   * @returns Log output string
   * @throws {NotFoundError} If environment doesn't exist or has no container
   * @throws {ForbiddenError} If user lacks access
   *
   * @example
   * ```typescript
   * const logService = new LogService();
   * const liveLogs = await logService.streamLiveLogs('env-id-123', 'user-id-456', 100);
   * console.log(liveLogs); // Recent container output
   * ```
   */
  async streamLiveLogs(environmentId: string, userId: string, tail: number = 100): Promise<string> {
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

    if (!environment.containerId) {
      throw new NotFoundError('Environment has no container');
    }

    // Get logs from Docker container
    const logs = await this.dockerService.getContainerLogs(environment.containerId, {
      stdout: true,
      stderr: true,
      tail,
      timestamps: true,
    });

    return logs;
  }

  /**
   * Apply log retention policy
   *
   * Deletes logs older than retention period and enforces size limits
   *
   * @returns Object with deletion statistics
   *
   * @example
   * ```typescript
   * const logService = new LogService();
   * const stats = await logService.applyRetentionPolicy();
   * console.log(`Deleted ${stats.deletedByAge} old logs`);
   * console.log(`Deleted ${stats.deletedBySize} logs due to size limit`);
   * ```
   */
  async applyRetentionPolicy(): Promise<{
    deletedByAge: number;
    deletedBySize: number;
    environmentsProcessed: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - LOG_RETENTION_DAYS);

    // Delete logs older than retention period
    const deletedByAge = await this.prisma.logEntry.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    // Process each environment for size limits
    const environments = await this.prisma.environment.findMany({
      select: { id: true },
    });

    let deletedBySize = 0;

    for (const env of environments) {
      // Calculate total log size for environment (approximate)
      const logs = await this.prisma.logEntry.findMany({
        where: { environmentId: env.id },
        select: { message: true },
      });

      const totalSizeBytes = logs.reduce((sum, log) => sum + log.message.length, 0);
      const totalSizeMB = totalSizeBytes / (1024 * 1024);

      // If over limit, delete oldest logs
      if (totalSizeMB > LOG_SIZE_LIMIT_MB) {
        const excessMB = totalSizeMB - LOG_SIZE_LIMIT_MB;
        const bytesToDelete = Math.ceil(excessMB * 1024 * 1024);

        // Get oldest logs until we've deleted enough
        let deletedBytes = 0;
        const logsToDelete: string[] = [];

        const oldestLogs = await this.prisma.logEntry.findMany({
          where: { environmentId: env.id },
          orderBy: { timestamp: 'asc' },
        });

        for (const log of oldestLogs) {
          logsToDelete.push(log.id);
          deletedBytes += log.message.length;
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

        deletedBySize += result.count;
      }
    }

    return {
      deletedByAge: deletedByAge.count,
      deletedBySize,
      environmentsProcessed: environments.length,
    };
  }

  /**
   * Get log statistics for environment
   *
   * Returns log count and size information
   *
   * @param environmentId - Environment ID
   * @param userId - User ID requesting stats
   * @returns Log statistics
   * @throws {NotFoundError} If environment doesn't exist
   * @throws {ForbiddenError} If user lacks access
   *
   * @example
   * ```typescript
   * const logService = new LogService();
   * const stats = await logService.getLogStats('env-id-123', 'user-id-456');
   * console.log(`Total logs: ${stats.count}`);
   * console.log(`Size: ${stats.sizeMB.toFixed(2)} MB`);
   * ```
   */
  async getLogStats(
    environmentId: string,
    userId: string
  ): Promise<{
    count: number;
    sizeMB: number;
    oldestLog?: Date;
    newestLog?: Date;
  }> {
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

    // Get count
    const count = await this.prisma.logEntry.count({
      where: { environmentId },
    });

    // Get size (approximate by fetching all messages)
    const logs = await this.prisma.logEntry.findMany({
      where: { environmentId },
      select: { message: true, timestamp: true },
      orderBy: { timestamp: 'asc' },
    });

    const totalSizeBytes = logs.reduce((sum, log) => sum + log.message.length, 0);
    const sizeMB = totalSizeBytes / (1024 * 1024);

    return {
      count,
      sizeMB,
      oldestLog: logs.length > 0 ? logs[0]!.timestamp : undefined,
      newestLog: logs.length > 0 ? logs[logs.length - 1]!.timestamp : undefined,
    };
  }

  /**
   * Delete all logs for environment
   *
   * Clears all log history for environment
   *
   * @param environmentId - Environment ID
   * @param userId - User ID performing deletion
   * @returns Number of logs deleted
   * @throws {NotFoundError} If environment doesn't exist
   * @throws {ForbiddenError} If user lacks access
   *
   * @example
   * ```typescript
   * const logService = new LogService();
   * const deleted = await logService.clearLogs('env-id-123', 'user-id-456');
   * console.log(`Cleared ${deleted} logs`);
   * ```
   */
  async clearLogs(environmentId: string, userId: string): Promise<number> {
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

    // Delete all logs
    const result = await this.prisma.logEntry.deleteMany({
      where: { environmentId },
    });

    return result.count;
  }

  /**
   * Check if user has access to project
   *
   * @private
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  private async checkEnvironmentAccess(project: any, userId: string): Promise<void> {
    const hasAccess =
      project.ownerId === userId ||
      (project.team?.userTeams.some((ut: any) => ut.userId === userId) ?? false);

    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this environment');
    }
  }

  /**
   * Convert LogEntry entity to LogEntryDTO
   *
   * @private
   */
  private toLogEntryDTO(logEntry: LogEntry): LogEntryDTO {
    return {
      id: logEntry.id,
      timestamp: logEntry.timestamp,
      stream: logEntry.stream,
      message: logEntry.message,
    };
  }
}
