/**
 * Configuration management
 */

import type { VibeBoxConfig } from './types';
import { required } from './utils/validation';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<Omit<VibeBoxConfig, 'apiKey' | 'defaultProjectId'>> = {
  baseUrl: 'http://localhost:3000',
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  headers: {},
};

/**
 * Resolve configuration from multiple sources
 *
 * Priority order:
 * 1. Explicit config object
 * 2. Environment variables
 * 3. Default values
 *
 * @param config - User-provided configuration
 * @returns Resolved configuration
 * @throws Error if API key is not provided
 *
 * @example
 * ```typescript
 * // From config object
 * const config = resolveConfig({ apiKey: 'vbx_live_...' });
 *
 * // From environment variables
 * process.env.VIBEBOX_API_KEY = 'vbx_live_...';
 * const config = resolveConfig();
 * ```
 */
export function resolveConfig(config?: VibeBoxConfig): Required<VibeBoxConfig> {
  const apiKey = config?.apiKey || process.env.VIBEBOX_API_KEY;

  // API key is required
  if (!apiKey) {
    throw new Error(
      'API key is required. Provide it via config.apiKey or VIBEBOX_API_KEY environment variable.'
    );
  }

  return {
    apiKey,
    baseUrl: config?.baseUrl || process.env.VIBEBOX_BASE_URL || DEFAULT_CONFIG.baseUrl,
    defaultProjectId: config?.defaultProjectId || process.env.VIBEBOX_PROJECT_ID || '',
    timeout: config?.timeout ?? DEFAULT_CONFIG.timeout,
    retries: config?.retries ?? DEFAULT_CONFIG.retries,
    retryDelay: config?.retryDelay ?? DEFAULT_CONFIG.retryDelay,
    headers: {
      ...DEFAULT_CONFIG.headers,
      ...config?.headers,
    },
  };
}
