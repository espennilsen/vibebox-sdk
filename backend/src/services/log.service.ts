/**
 * LogService - Log Management Service
 * Handles log persistence, streaming, and retention policies
 * Tasks: T075, T062-T064
 */
import { PrismaClient } from '@prisma/client';
import type { LogEntry } from '@prisma/client';
import { LogStream } from '@/types/prisma-enums';
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
   * Stream logs in real-time with proper Docker metadata
   *
   * Streams container logs in real-time using Docker's native metadata.
   * Returns actual stream type (stdout/stderr) and timestamps from Docker,
   * not heuristic guesses based on content.
   *
   * @param environmentId - Environment ID
   * @param callback - Callback function called for each log entry with real metadata
   * @returns Function to stop streaming (unsubscribe)
   * @throws {NotFoundError} If environment doesn't exist or has no container
   *
   * @example
   * ```typescript
   * const logService = new LogService();
   * const unsubscribe = await logService.streamLogs('env-id-123', (log) => {
   *   console.log(`[${log.stream}] ${log.timestamp.toISOString()}: ${log.message}`);
   * });
   * // Later: unsubscribe();
   * ```
   */
  async streamLogs(
    environmentId: string,
    callback: (logEntry: { stream: LogStream; content: string; timestamp: Date }) => void
  ): Promise<() => void> {
    // Get environment (no user check for WebSocket - auth handled at connection)
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
    });

    if (!environment) {
      throw new NotFoundError('Environment not found');
    }

    if (!environment.containerId) {
      throw new NotFoundError('Environment has no container');
    }

    // Start streaming logs from Docker with proper metadata parsing
    const stopStreaming = await this.dockerService.streamContainerLogs(
      environment.containerId,
      (logEntry) => {
        // Use Docker's actual metadata - no heuristics!
        callback({
          stream: logEntry.stream === 'stdout' ? LogStream.stdout : LogStream.stderr,
          content: logEntry.message,
          timestamp: logEntry.timestamp, // Real timestamp from Docker, not new Date()
        });
      },
      {
        follow: true,
        tail: 100,
        timestamps: true, // Critical: enables accurate timestamp extraction
      }
    );

    return stopStreaming;
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

    // Process each environment for size limits using database aggregation
    // This avoids loading all logs into memory which can cause OOM errors
    const environments = await this.prisma.environment.findMany({
      select: { id: true },
    });

    let deletedBySize = 0;

    for (const env of environments) {
      // Use database aggregation to calculate total log size without loading all data
      const sizeResult = await this.prisma.$queryRaw<Array<{ totalSize: bigint; count: bigint }>>`
        SELECT
          COALESCE(SUM(LENGTH(message)), 0)::bigint as "totalSize",
          COUNT(*)::bigint as count
        FROM "log_entries"
        WHERE "environment_id" = ${env.id}
      `;

      const totalSizeBytes = Number(sizeResult[0]?.totalSize ?? 0);
      const totalSizeMB = totalSizeBytes / (1024 * 1024);

      // If over limit, delete oldest logs using a subquery approach
      if (totalSizeMB > LOG_SIZE_LIMIT_MB) {
        const bytesToDelete = Math.ceil((totalSizeMB - LOG_SIZE_LIMIT_MB) * 1024 * 1024);

        // Use a CTE with running total to identify logs to delete in a single query
        // This avoids loading all logs into memory
        const deleted = await this.prisma.$executeRaw<number>`
          DELETE FROM "log_entries"
          WHERE id IN (
            WITH ordered_logs AS (
              SELECT
                id,
                LENGTH(message) as size,
                SUM(LENGTH(message)) OVER (ORDER BY timestamp ASC) as running_size
              FROM "log_entries"
              WHERE "environment_id" = ${env.id}
              ORDER BY timestamp ASC
            )
            SELECT id FROM ordered_logs
            WHERE running_size <= ${bytesToDelete}
          )
        `;

        deletedBySize += deleted;
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
   * Delete all logs for an environment
   *
   * @param environmentId - Environment ID
   * @param userId - User ID requesting the deletion
   * @returns Number of logs deleted
   * @throws {NotFoundError} If environment doesn't exist
   * @throws {ForbiddenError} If user lacks access
   *
   * @example
   * ```typescript
   * const count = await logService.deleteLogs('env-123', 'user-123');
   * ```
   */
  async deleteLogs(environmentId: string, userId: string): Promise<number> {
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

    // Delete all logs for this environment
    const result = await this.prisma.logEntry.deleteMany({
      where: { environmentId },
    });

    return result.count;
  }

  /**
   * Cleanup old logs beyond retention period
   *
   * Deletes logs older than the configured retention period (default 7 days)
   *
   * @returns Number of logs deleted
   *
   * @example
   * ```typescript
   * const count = await logService.cleanupOldLogs();
   * ```
   */
  async cleanupOldLogs(): Promise<number> {
    const retentionDays = 7; // Default retention period
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.prisma.logEntry.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
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
