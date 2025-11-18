/**
 * Retry utility with exponential backoff
 */

import type { RetryOptions } from '../types';

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic and exponential backoff
 *
 * @param fn - Function to execute
 * @param options - Retry options
 * @returns Result of the function
 * @throws Last error if all retries fail
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   async () => fetch('https://api.example.com'),
 *   {
 *     retries: 3,
 *     retryDelay: 1000,
 *     retryCondition: (error) => error.statusCode >= 500
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= options.retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if we've exhausted our attempts
      if (attempt >= options.retries) {
        break;
      }

      // Check if error is retryable
      if (options.retryCondition && !options.retryCondition(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = options.retryDelay * Math.pow(2, attempt);

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError;
}
