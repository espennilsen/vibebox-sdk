/**
 * Environment variables resource
 *
 * Provides methods for managing environment variables within a sandbox:
 * - Set environment variables
 * - Get environment variables
 * - Delete environment variables
 */

import type { HttpClient } from '../utils/http-client';
import { isValidEnvKey } from '../utils/validation';
import { ValidationError } from '../errors';

/**
 * Environment variables resource class
 */
export class EnvironmentVariablesResource {
  constructor(
    private readonly environmentId: string,
    private readonly http: HttpClient
  ) {}

  /**
   * Set an environment variable
   *
   * @param key - Variable name (must be uppercase with underscores)
   * @param value - Variable value
   *
   * @example
   * ```typescript
   * await sandbox.env.set('NODE_ENV', 'production');
   * await sandbox.env.set('API_KEY', 'secret-key');
   * ```
   */
  async set(key: string, value: string): Promise<void>;

  /**
   * Set multiple environment variables at once
   *
   * @param variables - Object with key-value pairs
   *
   * @example
   * ```typescript
   * await sandbox.env.set({
   *   NODE_ENV: 'production',
   *   API_KEY: 'secret-key',
   *   PORT: '3000'
   * });
   * ```
   */
  async set(variables: Record<string, string>): Promise<void>;

  async set(keyOrVariables: string | Record<string, string>, value?: string): Promise<void> {
    if (typeof keyOrVariables === 'string') {
      // Single variable
      if (!isValidEnvKey(keyOrVariables)) {
        throw new ValidationError(
          `Invalid environment variable key: "${keyOrVariables}". Must be uppercase letters, numbers, and underscores.`,
          { key: 'Invalid format' }
        );
      }

      await this.http.post(
        `/api/v1/environments/${this.environmentId}/variables`,
        {
          key: keyOrVariables,
          value,
        }
      );
    } else {
      // Multiple variables
      for (const [key] of Object.entries(keyOrVariables)) {
        if (!isValidEnvKey(key)) {
          throw new ValidationError(
            `Invalid environment variable key: "${key}". Must be uppercase letters, numbers, and underscores.`,
            { key: 'Invalid format' }
          );
        }
      }

      // Set each variable
      await Promise.all(
        Object.entries(keyOrVariables).map(([k, val]) =>
          this.http.post(
            `/api/v1/environments/${this.environmentId}/variables`,
            { key: k, value: val }
          )
        )
      );
    }
  }

  /**
   * Get an environment variable value
   *
   * Note: This is currently not supported by the API.
   * Environment variables can only be set, not retrieved.
   *
   * @param key - Variable name
   * @returns Variable value (or undefined if not set)
   *
   * @example
   * ```typescript
   * const nodeEnv = await sandbox.env.get('NODE_ENV');
   * ```
   */
  async get(_key: string): Promise<string | undefined> {
    throw new Error(
      'Getting environment variables is not currently supported by the API. ' +
      'Environment variables can only be set.'
    );
  }

  /**
   * Delete an environment variable
   *
   * @param key - Variable name to delete
   *
   * @example
   * ```typescript
   * await sandbox.env.delete('TEMP_API_KEY');
   * ```
   */
  async delete(key: string): Promise<void> {
    await this.http.delete(
      `/api/v1/environments/${this.environmentId}/variables/${key}`
    );
  }
}
