import chalk from 'chalk';
import Table from 'cli-table3';
import boxen from 'boxen';

/**
 * Output utilities for consistent CLI formatting
 */
export class Output {
  /**
   * Print a success message
   */
  static success(message: string): void {
    console.log(chalk.green('✓'), message);
  }

  /**
   * Print an error message
   */
  static error(message: string, error?: Error): void {
    console.error(chalk.red('✗'), message);
    if (error && process.env.DEBUG) {
      console.error(chalk.gray(error.stack || error.message));
    }
  }

  /**
   * Print a warning message
   */
  static warn(message: string): void {
    console.warn(chalk.yellow('⚠'), message);
  }

  /**
   * Print an info message
   */
  static info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  /**
   * Print verbose debug output
   */
  static debug(message: string): void {
    if (process.env.DEBUG || process.env.VERBOSE) {
      console.log(chalk.gray('›'), chalk.gray(message));
    }
  }

  /**
   * Print a header/title
   */
  static header(message: string): void {
    console.log();
    console.log(chalk.bold.cyan(message));
    console.log(chalk.gray('─'.repeat(message.length)));
  }

  /**
   * Print a boxed message
   */
  static box(message: string, options?: { title?: string; type?: 'info' | 'success' | 'warning' | 'error' }): void {
    const borderColor = {
      info: 'blue',
      success: 'green',
      warning: 'yellow',
      error: 'red',
    }[options?.type || 'info'] as 'blue' | 'green' | 'yellow' | 'red';

    console.log(
      boxen(message, {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor,
        title: options?.title,
      })
    );
  }

  /**
   * Create a table for displaying data
   */
  static table(headers: string[], rows: string[][]): void {
    const table = new Table({
      head: headers.map((h) => chalk.cyan(h)),
      style: {
        head: [],
        border: ['gray'],
      },
    });

    rows.forEach((row) => table.push(row));
    console.log(table.toString());
  }

  /**
   * Print a key-value pair
   */
  static keyValue(key: string, value: string): void {
    console.log(chalk.gray(`${key}:`), value);
  }

  /**
   * Print a blank line
   */
  static blank(): void {
    console.log();
  }

  /**
   * Format bytes to human-readable size
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Format duration to human-readable string
   */
  static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  }

  /**
   * Format timestamp to relative time
   */
  static formatRelativeTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return `${Math.floor(diff / 86400000)} days ago`;
  }

  /**
   * Truncate string with ellipsis
   */
  static truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  }
}
