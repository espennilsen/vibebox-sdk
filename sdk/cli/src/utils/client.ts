import { VibeBox } from '@vibebox/sdk';
import { config } from './config.js';
import { AuthenticationError, ConfigurationError } from './errors.js';
import { Output } from './output.js';

/**
 * Get or create the VibeBox SDK client
 *
 * @returns Configured VibeBox client instance
 * @throws {AuthenticationError} If API key is not configured
 * @throws {ConfigurationError} If configuration is invalid
 */
export function getClient(): VibeBox {
  const apiKey = config.getApiKey();
  const apiUrl = config.getApiUrl();

  if (!apiKey) {
    throw new AuthenticationError(
      'API key not found. Run "vibebox init" to configure authentication.'
    );
  }

  Output.debug(`Using API URL: ${apiUrl}`);
  Output.debug(`API key: ${apiKey.substring(0, 10)}...`);

  try {
    return new VibeBox({
      apiKey,
      baseUrl: apiUrl,
    });
  } catch (error) {
    throw new ConfigurationError(
      `Failed to initialize client: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Check if the client is configured
 */
export function isConfigured(): boolean {
  return !!config.getApiKey();
}
