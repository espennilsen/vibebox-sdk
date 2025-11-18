/**
 * Duration parser utility
 * Converts human-readable duration strings to milliseconds
 */

/**
 * Parse a human-readable duration string to milliseconds
 *
 * Supported formats:
 * - "30s" -> 30 seconds
 * - "5m" -> 5 minutes
 * - "2h" -> 2 hours
 * - "1d" -> 1 day
 *
 * @param duration - Duration string (e.g., "2h", "30m", "1d")
 * @returns Duration in milliseconds
 * @throws Error if duration format is invalid
 *
 * @example
 * ```typescript
 * parseDuration("2h") // 7200000
 * parseDuration("30m") // 1800000
 * parseDuration("1d") // 86400000
 * ```
 */
export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);

  if (!match) {
    throw new Error(
      `Invalid duration format: "${duration}". Expected format: <number><unit> (e.g., "2h", "30m", "1d")`
    );
  }

  const [, value, unit] = match;
  const num = parseInt(value, 10);

  if (isNaN(num) || num <= 0) {
    throw new Error(`Invalid duration value: "${value}". Must be a positive number.`);
  }

  switch (unit) {
    case 's':
      return num * 1000;
    case 'm':
      return num * 60 * 1000;
    case 'h':
      return num * 60 * 60 * 1000;
    case 'd':
      return num * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Unknown duration unit: "${unit}". Supported units: s, m, h, d`);
  }
}

/**
 * Format milliseconds to human-readable duration
 *
 * @param ms - Milliseconds
 * @returns Human-readable duration string
 *
 * @example
 * ```typescript
 * formatDuration(7200000) // "2h"
 * formatDuration(1800000) // "30m"
 * ```
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}
