import Conf from 'conf';
import { homedir } from 'os';
import { join } from 'path';

/**
 * Configuration schema for VibeBox CLI
 */
export interface CliConfig {
  /**
   * API key for authentication
   */
  apiKey?: string;

  /**
   * Base URL for the VibeBox API
   */
  apiUrl?: string;

  /**
   * Default template for sandboxes
   */
  defaultTemplate?: string;

  /**
   * Default region for cloud deployments
   */
  defaultRegion?: string;

  /**
   * Enable verbose logging
   */
  verbose?: boolean;

  /**
   * Editor to use for file editing
   */
  editor?: string;
}

const schema = {
  apiKey: {
    type: 'string',
  },
  apiUrl: {
    type: 'string',
    default: 'http://localhost:3000',
  },
  defaultTemplate: {
    type: 'string',
    default: 'node-20',
  },
  defaultRegion: {
    type: 'string',
  },
  verbose: {
    type: 'boolean',
    default: false,
  },
  editor: {
    type: 'string',
    default: process.env.EDITOR || 'vim',
  },
} as const;

/**
 * Configuration manager for VibeBox CLI
 *
 * Stores configuration in ~/.config/vibebox/config.json
 */
class ConfigManager {
  private conf: Conf<CliConfig>;

  constructor() {
    this.conf = new Conf<CliConfig>({
      projectName: 'vibebox',
      schema: schema as any,
      configFileMode: 0o600, // Secure permissions for config file
      cwd: process.env.VIBEBOX_CONFIG_DIR || undefined, // Allow override for testing
    });
  }

  /**
   * Get a configuration value
   */
  get<K extends keyof CliConfig>(key: K): CliConfig[K] {
    return this.conf.get(key);
  }

  /**
   * Set a configuration value
   */
  set<K extends keyof CliConfig>(key: K, value: CliConfig[K]): void {
    this.conf.set(key, value);
  }

  /**
   * Delete a configuration value
   */
  delete<K extends keyof CliConfig>(key: K): void {
    this.conf.delete(key);
  }

  /**
   * Get all configuration values
   */
  getAll(): CliConfig {
    return this.conf.store;
  }

  /**
   * Check if a key exists
   */
  has<K extends keyof CliConfig>(key: K): boolean {
    return this.conf.has(key);
  }

  /**
   * Clear all configuration
   */
  clear(): void {
    this.conf.clear();
  }

  /**
   * Get the path to the config file
   */
  getPath(): string {
    return this.conf.path;
  }

  /**
   * Get API key from config or environment variable
   */
  getApiKey(): string | undefined {
    return process.env.VIBEBOX_API_KEY || this.get('apiKey');
  }

  /**
   * Get API URL from config or environment variable
   */
  getApiUrl(): string {
    return process.env.VIBEBOX_API_URL || this.get('apiUrl') || 'http://localhost:3000';
  }
}

// Export singleton instance
export const config = new ConfigManager();
