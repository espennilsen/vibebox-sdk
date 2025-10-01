/**
 * Secrets Management - Production Secret Storage
 *
 * Provides a unified interface for managing secrets across multiple providers:
 * - AWS Secrets Manager
 * - Google Cloud Secret Manager
 * - Azure Key Vault
 * - HashiCorp Vault
 * - Kubernetes Secrets
 * - Environment Variables (fallback)
 *
 * Features:
 * - Automatic provider detection based on environment
 * - Caching layer with configurable TTL
 * - Secret rotation support
 * - Audit logging for secret access
 * - Type-safe secret retrieval
 */

import { logger } from './logger';

/**
 * Secret metadata returned with secret values
 */
export interface SecretMetadata {
  /** Secret name/key */
  name: string;
  /** Version/revision of the secret */
  version?: string;
  /** When the secret was created */
  createdAt?: Date;
  /** When the secret was last modified */
  updatedAt?: Date;
  /** When the secret will expire (if applicable) */
  expiresAt?: Date;
  /** Additional provider-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Secret value with metadata
 */
export interface Secret {
  /** The secret value */
  value: string;
  /** Metadata about the secret */
  metadata: SecretMetadata;
}

/**
 * Options for secret retrieval
 */
export interface GetSecretOptions {
  /** Specific version to retrieve */
  version?: string;
  /** Whether to bypass cache */
  bypassCache?: boolean;
}

/**
 * Options for setting secrets
 */
export interface SetSecretOptions {
  /** Description of the secret */
  description?: string;
  /** Tags/labels for the secret */
  tags?: Record<string, string>;
  /** Expiration time for the secret */
  expiresAt?: Date;
  /** Whether to encrypt the secret (provider-dependent) */
  encrypt?: boolean;
}

/**
 * Audit log entry for secret operations
 */
export interface SecretAuditLog {
  /** Type of operation */
  operation: 'get' | 'set' | 'delete' | 'list' | 'rotate';
  /** Secret name */
  secretName: string;
  /** Timestamp of operation */
  timestamp: Date;
  /** User/service that performed the operation */
  actor?: string;
  /** Whether the operation succeeded */
  success: boolean;
  /** Error message if operation failed */
  error?: string;
  /** Additional context */
  metadata?: Record<string, unknown>;
}

/**
 * Abstract base class for secret manager implementations
 */
export abstract class SecretManager {
  protected cache: Map<string, { value: Secret; expiresAt: number }> = new Map();
  protected cacheTTL: number; // milliseconds
  protected auditLogs: SecretAuditLog[] = [];
  protected maxAuditLogs: number = 10000;

  constructor(cacheTTL: number = 300000) {
    // Default 5 minutes
    this.cacheTTL = cacheTTL;
  }

  /**
   * Retrieve a secret by name
   *
   * @param name - Secret name/key
   * @param options - Retrieval options
   * @returns The secret value and metadata
   * @throws Error if secret not found or retrieval fails
   */
  async get(name: string, options?: GetSecretOptions): Promise<Secret> {
    const startTime = Date.now();

    try {
      // Check cache first unless bypassed
      if (!options?.bypassCache) {
        const cached = this.getFromCache(name);
        if (cached) {
          this.logAudit({
            operation: 'get',
            secretName: name,
            timestamp: new Date(),
            success: true,
            metadata: { cached: true, duration: Date.now() - startTime },
          });
          return cached;
        }
      }

      // Retrieve from provider
      const secret = await this.getSecret(name, options);

      // Cache the result
      this.setCache(name, secret);

      this.logAudit({
        operation: 'get',
        secretName: name,
        timestamp: new Date(),
        success: true,
        metadata: { cached: false, duration: Date.now() - startTime },
      });

      return secret;
    } catch (error) {
      this.logAudit({
        operation: 'get',
        secretName: name,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: { duration: Date.now() - startTime },
      });
      throw error;
    }
  }

  /**
   * Set or update a secret
   *
   * @param name - Secret name/key
   * @param value - Secret value
   * @param options - Set options
   */
  async set(name: string, value: string, options?: SetSecretOptions): Promise<void> {
    const startTime = Date.now();

    try {
      await this.setSecret(name, value, options);

      // Invalidate cache
      this.cache.delete(name);

      this.logAudit({
        operation: 'set',
        secretName: name,
        timestamp: new Date(),
        success: true,
        metadata: { duration: Date.now() - startTime },
      });
    } catch (error) {
      this.logAudit({
        operation: 'set',
        secretName: name,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: { duration: Date.now() - startTime },
      });
      throw error;
    }
  }

  /**
   * Delete a secret
   *
   * @param name - Secret name/key
   */
  async delete(name: string): Promise<void> {
    const startTime = Date.now();

    try {
      await this.deleteSecret(name);

      // Invalidate cache
      this.cache.delete(name);

      this.logAudit({
        operation: 'delete',
        secretName: name,
        timestamp: new Date(),
        success: true,
        metadata: { duration: Date.now() - startTime },
      });
    } catch (error) {
      this.logAudit({
        operation: 'delete',
        secretName: name,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: { duration: Date.now() - startTime },
      });
      throw error;
    }
  }

  /**
   * List all secrets
   *
   * @returns Array of secret metadata
   */
  async list(): Promise<SecretMetadata[]> {
    const startTime = Date.now();

    try {
      const secrets = await this.listSecrets();

      this.logAudit({
        operation: 'list',
        secretName: '*',
        timestamp: new Date(),
        success: true,
        metadata: { count: secrets.length, duration: Date.now() - startTime },
      });

      return secrets;
    } catch (error) {
      this.logAudit({
        operation: 'list',
        secretName: '*',
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: { duration: Date.now() - startTime },
      });
      throw error;
    }
  }

  /**
   * Rotate a secret (generate new value and update)
   *
   * @param name - Secret name/key
   * @param generator - Function to generate new secret value
   */
  async rotate(name: string, generator: () => Promise<string>): Promise<void> {
    const startTime = Date.now();

    try {
      const newValue = await generator();
      await this.setSecret(name, newValue, {
        description: `Rotated on ${new Date().toISOString()}`,
      });

      // Invalidate cache
      this.cache.delete(name);

      this.logAudit({
        operation: 'rotate',
        secretName: name,
        timestamp: new Date(),
        success: true,
        metadata: { duration: Date.now() - startTime },
      });
    } catch (error) {
      this.logAudit({
        operation: 'rotate',
        secretName: name,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: { duration: Date.now() - startTime },
      });
      throw error;
    }
  }

  /**
   * Get audit logs
   *
   * @param limit - Maximum number of logs to return
   * @returns Array of audit log entries
   */
  getAuditLogs(limit?: number): SecretAuditLog[] {
    const logs = [...this.auditLogs].reverse(); // Most recent first
    return limit ? logs.slice(0, limit) : logs;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  // Protected methods to be implemented by providers

  /**
   * Provider-specific implementation to retrieve a secret
   */
  protected abstract getSecret(name: string, options?: GetSecretOptions): Promise<Secret>;

  /**
   * Provider-specific implementation to set a secret
   */
  protected abstract setSecret(
    name: string,
    value: string,
    options?: SetSecretOptions
  ): Promise<void>;

  /**
   * Provider-specific implementation to delete a secret
   */
  protected abstract deleteSecret(name: string): Promise<void>;

  /**
   * Provider-specific implementation to list secrets
   */
  protected abstract listSecrets(): Promise<SecretMetadata[]>;

  // Private helper methods

  private getFromCache(name: string): Secret | null {
    const cached = this.cache.get(name);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
    if (cached) {
      this.cache.delete(name);
    }
    return null;
  }

  private setCache(name: string, value: Secret): void {
    this.cache.set(name, {
      value,
      expiresAt: Date.now() + this.cacheTTL,
    });
  }

  private logAudit(log: SecretAuditLog): void {
    this.auditLogs.push(log);

    // Trim logs if exceeding max
    if (this.auditLogs.length > this.maxAuditLogs) {
      this.auditLogs = this.auditLogs.slice(-this.maxAuditLogs);
    }

    // Log to application logger
    logger.info(
      {
        operation: log.operation,
        secretName: log.secretName,
        success: log.success,
        error: log.error,
        metadata: log.metadata,
      },
      `Secret operation: ${log.operation} ${log.secretName}`
    );
  }
}

/**
 * Environment Variables Secret Manager (Fallback)
 *
 * Simple implementation that reads from environment variables.
 * Suitable for development and as a fallback provider.
 */
export class EnvironmentSecretManager extends SecretManager {
  private prefix: string;

  constructor(cacheTTL?: number, prefix: string = 'SECRET_') {
    super(cacheTTL);
    this.prefix = prefix;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async getSecret(name: string, _options?: GetSecretOptions): Promise<Secret> {
    const envKey = `${this.prefix}${name.toUpperCase().replace(/[^A-Z0-9_]/g, '_')}`;
    const value = process.env[envKey];

    if (!value) {
      throw new Error(`Secret not found: ${name} (env var: ${envKey})`);
    }

    return {
      value,
      metadata: {
        name,
        version: '1',
        metadata: { source: 'environment', envKey },
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async setSecret(
    name: string,
    value: string,
    _options?: SetSecretOptions
  ): Promise<void> {
    const envKey = `${this.prefix}${name.toUpperCase().replace(/[^A-Z0-9_]/g, '_')}`;
    process.env[envKey] = value;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async deleteSecret(name: string): Promise<void> {
    const envKey = `${this.prefix}${name.toUpperCase().replace(/[^A-Z0-9_]/g, '_')}`;
    delete process.env[envKey];
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async listSecrets(): Promise<SecretMetadata[]> {
    const secrets: SecretMetadata[] = [];

    for (const key of Object.keys(process.env)) {
      if (key.startsWith(this.prefix)) {
        const name = key.substring(this.prefix.length).toLowerCase().replace(/_/g, '-');
        secrets.push({
          name,
          version: '1',
          metadata: { source: 'environment', envKey: key },
        });
      }
    }

    return secrets;
  }
}

/**
 * Secret Manager Factory
 *
 * Automatically detects and creates the appropriate secret manager
 * based on the environment and available credentials.
 */
export class SecretManagerFactory {
  /**
   * Create a secret manager instance based on environment detection
   *
   * Detection order:
   * 1. Explicit SECRET_PROVIDER env var
   * 2. AWS Secrets Manager (if AWS credentials available)
   * 3. Google Cloud Secret Manager (if GCP credentials available)
   * 4. Azure Key Vault (if Azure credentials available)
   * 5. HashiCorp Vault (if Vault address configured)
   * 6. Kubernetes Secrets (if running in K8s)
   * 7. Environment Variables (fallback)
   */
  static async create(): Promise<SecretManager> {
    const provider = process.env.SECRET_PROVIDER?.toLowerCase();

    // Explicit provider selection
    if (provider) {
      switch (provider) {
        case 'aws':
          return this.createAWSSecretsManager();
        case 'gcp':
          return this.createGCPSecretManager();
        case 'azure':
          return this.createAzureKeyVault();
        case 'vault':
          return this.createHashiCorpVault();
        case 'k8s':
        case 'kubernetes':
          return this.createKubernetesSecrets();
        case 'env':
        case 'environment':
          return new EnvironmentSecretManager();
        default:
          throw new Error(`Unknown secret provider: ${provider}`);
      }
    }

    // Auto-detect provider
    if (await this.isAWSAvailable()) {
      logger.info('Auto-detected AWS Secrets Manager');
      return this.createAWSSecretsManager();
    }

    if (await this.isGCPAvailable()) {
      logger.info('Auto-detected Google Cloud Secret Manager');
      return this.createGCPSecretManager();
    }

    if (await this.isAzureAvailable()) {
      logger.info('Auto-detected Azure Key Vault');
      return this.createAzureKeyVault();
    }

    if (await this.isVaultAvailable()) {
      logger.info('Auto-detected HashiCorp Vault');
      return this.createHashiCorpVault();
    }

    if (await this.isKubernetesAvailable()) {
      logger.info('Auto-detected Kubernetes Secrets');
      return this.createKubernetesSecrets();
    }

    logger.info('Using Environment Variables as secret provider (fallback)');
    return new EnvironmentSecretManager();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  private static async isAWSAvailable(): Promise<boolean> {
    return !!(
      process.env.AWS_SECRET_MANAGER_REGION ||
      (process.env.AWS_REGION && process.env.AWS_ACCESS_KEY_ID)
    );
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  private static async isGCPAvailable(): Promise<boolean> {
    return !!(process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  private static async isAzureAvailable(): Promise<boolean> {
    return !!(process.env.AZURE_KEYVAULT_URL || process.env.AZURE_KEY_VAULT_NAME);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  private static async isVaultAvailable(): Promise<boolean> {
    return !!process.env.VAULT_ADDR;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  private static async isKubernetesAvailable(): Promise<boolean> {
    return !!(process.env.KUBERNETES_SERVICE_HOST || process.env.K8S_SECRET_NAMESPACE);
  }

  private static async createAWSSecretsManager(): Promise<SecretManager> {
    const { AWSSecretsManager } = await import('./secrets/aws');
    return new AWSSecretsManager();
  }

  private static async createGCPSecretManager(): Promise<SecretManager> {
    const { GCPSecretManager } = await import('./secrets/gcp');
    return new GCPSecretManager();
  }

  private static async createAzureKeyVault(): Promise<SecretManager> {
    const { AzureKeyVaultManager } = await import('./secrets/azure');
    return new AzureKeyVaultManager();
  }

  private static async createHashiCorpVault(): Promise<SecretManager> {
    const { HashiCorpVaultManager } = await import('./secrets/vault');
    return new HashiCorpVaultManager();
  }

  private static async createKubernetesSecrets(): Promise<SecretManager> {
    const { KubernetesSecretManager } = await import('./secrets/kubernetes');
    return new KubernetesSecretManager();
  }
}

// Singleton instance
let secretManagerInstance: SecretManager | null = null;

/**
 * Get the singleton secret manager instance
 *
 * @returns The secret manager instance
 */
export async function getSecretManager(): Promise<SecretManager> {
  if (!secretManagerInstance) {
    secretManagerInstance = await SecretManagerFactory.create();
  }
  return secretManagerInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetSecretManager(): void {
  secretManagerInstance = null;
}
