/**
 * Scheduler - Cron Job Scheduling Utility
 * Provides cron-based task scheduling for background jobs
 */
import type { ScheduledTask as CronScheduledTask } from 'node-cron';
import { schedule as scheduleCronTask, validate as validateCronExpression } from 'node-cron';
import { logger } from '@/lib/logger';

/**
 * Scheduled task configuration
 */
export interface ScheduledTask {
  name: string;
  schedule: string;
  handler: () => Promise<void> | void;
  enabled?: boolean;
}

/**
 * Task execution result
 */
export interface TaskExecutionResult {
  /** Name of the executed task */
  taskName: string;
  /** Whether the task completed successfully */
  success: boolean;
  /** Task start time */
  startTime: Date;
  /** Task end time */
  endTime: Date;
  /** Task execution duration in milliseconds */
  duration: number;
  /** Error object if task failed (optional) */
  error?: Error;
}

/**
 * Scheduler - Manages cron-based scheduled tasks
 *
 * Provides a simple interface for registering and managing scheduled jobs
 * with error handling and execution tracking.
 *
 * @example
 * ```typescript
 * const scheduler = new Scheduler();
 *
 * scheduler.register({
 *   name: 'daily-cleanup',
 *   schedule: '0 0 * * *', // Daily at midnight
 *   handler: async () => {
 *     console.log('Running cleanup...');
 *   }
 * });
 *
 * scheduler.start();
 * ```
 */
export class Scheduler {
  private tasks: Map<string, CronScheduledTask> = new Map();
  private configs: Map<string, ScheduledTask> = new Map();
  private executionHistory: TaskExecutionResult[] = [];
  private maxHistorySize = 100;

  /**
   * Register a new scheduled task
   *
   * @param config - Task configuration
   * @throws {Error} If task with same name already exists or schedule is invalid
   *
   * @example
   * ```typescript
   * scheduler.register({
   *   name: 'hourly-sync',
   *   schedule: '0 * * * *', // Every hour
   *   handler: async () => {
   *     await syncData();
   *   }
   * });
   * ```
   */
  register(config: ScheduledTask): void {
    if (this.tasks.has(config.name)) {
      throw new Error(`Task with name "${config.name}" already exists`);
    }

    if (!validateCronExpression(config.schedule)) {
      throw new Error(`Invalid cron schedule: ${config.schedule}`);
    }

    const task = scheduleCronTask(config.schedule, async () => {
      await this.executeTask(config);
    });

    this.tasks.set(config.name, task);
    this.configs.set(config.name, config);
  }

  /**
   * Start all registered tasks
   *
   * @example
   * ```typescript
   * scheduler.start();
   * ```
   */
  start(): void {
    for (const [_name, task] of this.tasks) {
      void task.start();
    }
  }

  /**
   * Stop all running tasks
   *
   * Waits for all active task executions to complete before resolving.
   * Ensures graceful shutdown of all scheduled tasks.
   *
   * @example
   * ```typescript
   * await scheduler.stop();
   * ```
   */
  async stop(): Promise<void> {
    const stopPromises: Promise<void>[] = [];

    for (const [_name, task] of this.tasks) {
      const stopPromise = Promise.resolve(task.stop());
      stopPromises.push(stopPromise);
    }

    await Promise.all(stopPromises);
  }

  /**
   * Start a specific task by name
   *
   * @param name - Task name
   * @throws {Error} If task doesn't exist
   */
  startTask(name: string): void {
    const task = this.tasks.get(name);
    if (!task) {
      throw new Error(`Task "${name}" not found`);
    }
    void task.start();
  }

  /**
   * Stop a specific task by name
   *
   * @param name - Task name
   * @throws {Error} If task doesn't exist
   */
  stopTask(name: string): void {
    const task = this.tasks.get(name);
    if (!task) {
      throw new Error(`Task "${name}" not found`);
    }
    void task.stop();
  }

  /**
   * Unregister a task
   *
   * @param name - Task name
   * @throws {Error} If task doesn't exist
   */
  unregister(name: string): void {
    const task = this.tasks.get(name);
    if (!task) {
      throw new Error(`Task "${name}" not found`);
    }
    void task.stop();
    this.tasks.delete(name);
    this.configs.delete(name);
  }

  /**
   * Get execution history
   *
   * @param taskName - Optional task name to filter by
   * @returns Array of task execution results
   */
  getHistory(taskName?: string): TaskExecutionResult[] {
    if (taskName) {
      return this.executionHistory.filter((result) => result.taskName === taskName);
    }
    return [...this.executionHistory];
  }

  /**
   * Clear execution history
   */
  clearHistory(): void {
    this.executionHistory = [];
  }

  /**
   * Get list of registered task names
   *
   * @returns Array of task names
   */
  getRegisteredTasks(): string[] {
    return Array.from(this.tasks.keys());
  }

  /**
   * Check if a task is registered
   *
   * @param name - Task name
   * @returns True if task exists, false otherwise
   */
  has(name: string): boolean {
    return this.tasks.has(name);
  }

  /**
   * Execute a task immediately (outside of schedule)
   *
   * Manually triggers a task execution without waiting for the next scheduled run.
   * Useful for testing or manual intervention scenarios.
   *
   * @param name - Task name
   * @returns Promise that resolves when task execution completes
   * @throws {Error} If task doesn't exist
   *
   * @example
   * ```typescript
   * // Execute task immediately for testing
   * await scheduler.executeTaskNow('log-cleanup');
   * ```
   */
  async executeTaskNow(name: string): Promise<void> {
    const config = this.configs.get(name);
    if (!config) {
      throw new Error(`Task "${name}" not found`);
    }

    await this.executeTask(config);
  }

  /**
   * Execute a task and track results
   *
   * @private
   */
  private async executeTask(config: ScheduledTask): Promise<void> {
    const startTime = new Date();
    let success = false;
    let error: Error | undefined;

    try {
      logger.info({ taskName: config.name }, '[Scheduler] Executing task');
      await config.handler();
      success = true;
      logger.info({ taskName: config.name }, '[Scheduler] Task completed');
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      logger.error({ taskName: config.name, error }, '[Scheduler] Task failed');
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    const result: TaskExecutionResult = {
      taskName: config.name,
      success,
      startTime,
      endTime,
      duration,
      error,
    };

    this.addToHistory(result);
  }

  /**
   * Add execution result to history
   *
   * @private
   */
  private addToHistory(result: TaskExecutionResult): void {
    this.executionHistory.push(result);

    // Keep history size under limit
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory.shift();
    }
  }
}

/**
 * Global scheduler instance
 */
let globalScheduler: Scheduler | null = null;

/**
 * Get or create global scheduler instance
 *
 * @returns Global scheduler instance
 *
 * @example
 * ```typescript
 * const scheduler = getScheduler();
 * scheduler.register({
 *   name: 'my-task',
 *   schedule: '0 0 * * *',
 *   handler: async () => { ... }
 * });
 * ```
 */
export function getScheduler(): Scheduler {
  if (!globalScheduler) {
    globalScheduler = new Scheduler();
  }
  return globalScheduler;
}
