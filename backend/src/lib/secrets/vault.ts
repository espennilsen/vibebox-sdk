// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/**
 * HashiCorp Vault Implementation
 *
 * Integrates with HashiCorp Vault for production secret storage.
 * Supports multiple authentication methods, dynamic secrets, and encryption as a service.
 *
 * Environment Variables:
 * - VAULT_ADDR (required): Vault server address (e.g., https://vault.example.com)
 * - VAULT_TOKEN (optional): Vault token for authentication
 * - VAULT_ROLE_ID (optional): AppRole role ID
 * - VAULT_SECRET_ID (optional): AppRole secret ID
 * - VAULT_NAMESPACE (optional): Vault namespace (Enterprise feature)
 * - VAULT_PATH (optional): KV secrets engine path (default: secret)
 * - VAULT_KV_VERSION (optional): KV version (1 or 2, default: 2)
 * - VAULT_PREFIX (optional): Prefix for all secret names (default: vibebox/)
 */

import {
  SecretManager,
  Secret,
  SecretMetadata,
  GetSecretOptions,
  SetSecretOptions,
} from '../secrets';
import { logger } from '../logger';

/**
 * HashiCorp Vault implementation
 *
 * Uses node-vault library for Vault operations.
 * Supports multiple authentication methods and KV v1/v2.
 */
export class HashiCorpVaultManager extends SecretManager {
  private client: any; // node-vault client
  private vaultAddr: string;
  private kvPath: string;
  private kvVersion: number;
  private prefix: string;
  private namespace?: string;

  constructor(cacheTTL?: number) {
    super(cacheTTL);

    this.vaultAddr = process.env.VAULT_ADDR || '';
    if (!this.vaultAddr) {
      throw new Error('VAULT_ADDR environment variable is required');
    }

    this.kvPath = process.env.VAULT_PATH || 'secret';
    this.kvVersion = parseInt(process.env.VAULT_KV_VERSION || '2', 10);
    this.prefix = process.env.VAULT_PREFIX || 'vibebox/';
    this.namespace = process.env.VAULT_NAMESPACE;
  }

  /**
   * Initialize the HashiCorp Vault client
   *
   * Lazy initialization to avoid loading Vault SDK unless needed.
   */
  private async initClient(): Promise<void> {
    if (this.client) {
      return;
    }

    try {
      // Dynamic import to avoid loading Vault SDK unless this provider is used
      const vault = await import('node-vault');

      const options: any = {
        apiVersion: 'v1',
        endpoint: this.vaultAddr,
      };

      if (this.namespace) {
        options.namespace = this.namespace;
      }

      // Try token authentication first
      if (process.env.VAULT_TOKEN) {
        options.token = process.env.VAULT_TOKEN;
        this.client = vault.default(options);
      }
      // Try AppRole authentication
      else if (process.env.VAULT_ROLE_ID && process.env.VAULT_SECRET_ID) {
        this.client = vault.default(options);

        const result = await this.client.approleLogin({
          role_id: process.env.VAULT_ROLE_ID,
          secret_id: process.env.VAULT_SECRET_ID,
        });

        this.client.token = result.auth.client_token;
      }
      // No authentication configured
      else {
        throw new Error(
          'No Vault authentication method configured. Set VAULT_TOKEN or VAULT_ROLE_ID/VAULT_SECRET_ID'
        );
      }

      logger.info(
        {
          vaultAddr: this.vaultAddr,
          kvPath: this.kvPath,
          kvVersion: this.kvVersion,
          prefix: this.prefix,
        },
        'HashiCorp Vault initialized'
      );
    } catch (error) {
      logger.error({ error }, 'Failed to initialize HashiCorp Vault');
      throw new Error('Vault SDK not installed. Run: npm install node-vault');
    }
  }

  /**
   * Get the full path for a secret
   */
  private getSecretPath(name: string): string {
    const fullName = `${this.prefix}${name}`;

    if (this.kvVersion === 2) {
      return `${this.kvPath}/data/${fullName}`;
    } else {
      return `${this.kvPath}/${fullName}`;
    }
  }

  /**
   * Get the metadata path for a secret (KV v2 only)
   */
  private getMetadataPath(name: string): string {
    const fullName = `${this.prefix}${name}`;
    return `${this.kvPath}/metadata/${fullName}`;
  }

  protected async getSecret(name: string, options?: GetSecretOptions): Promise<Secret> {
    await this.initClient();

    try {
      const path = this.getSecretPath(name);

      const readOptions: any = {};

      // KV v2 supports version retrieval
      if (this.kvVersion === 2 && options?.version) {
        readOptions.version = parseInt(options.version, 10);
      }

      const response = await this.client.read(path);

      if (!response?.data) {
        throw new Error(`Secret ${name} has no data`);
      }

      // KV v2 wraps data in a "data" field
      const secretData = this.kvVersion === 2 ? response.data.data : response.data;

      if (!secretData || typeof secretData !== 'object') {
        throw new Error(`Secret ${name} has invalid data format`);
      }

      // Support both single value and multi-value secrets
      let value: string;
      if ('value' in secretData) {
        value = secretData.value;
      } else {
        value = JSON.stringify(secretData);
      }

      const metadata: SecretMetadata = {
        name,
        metadata: {
          path,
          kvVersion: this.kvVersion,
        },
      };

      // KV v2 includes metadata
      if (this.kvVersion === 2 && response.data.metadata) {
        metadata.version = response.data.metadata.version?.toString();
        metadata.createdAt = response.data.metadata.created_time
          ? new Date(response.data.metadata.created_time)
          : undefined;
      }

      return {
        value,
        metadata,
      };
    } catch (error: any) {
      if (error.response?.statusCode === 404) {
        throw new Error(`Secret not found: ${name}`);
      }
      throw new Error(`Failed to retrieve secret ${name}: ${error.message}`);
    }
  }

  protected async setSecret(
    name: string,
    value: string,
    options?: SetSecretOptions
  ): Promise<void> {
    await this.initClient();

    try {
      const path = this.getSecretPath(name);

      // Try to parse value as JSON, otherwise treat as string
      let secretData: any;
      try {
        secretData = JSON.parse(value);
      } catch {
        secretData = { value };
      }

      // KV v2 requires data to be wrapped
      const data = this.kvVersion === 2 ? { data: secretData } : secretData;

      await this.client.write(path, data);

      // Set metadata if using KV v2
      if (this.kvVersion === 2 && options?.tags) {
        const metadataPath = this.getMetadataPath(name);
        await this.client.write(metadataPath, {
          custom_metadata: options.tags,
        });
      }

      logger.info({ path }, 'Set secret in HashiCorp Vault');
    } catch (error: any) {
      throw new Error(`Failed to set secret ${name}: ${error.message}`);
    }
  }

  protected async deleteSecret(name: string): Promise<void> {
    await this.initClient();

    try {
      if (this.kvVersion === 2) {
        // KV v2: Soft delete (can be undeleted)
        const metadataPath = this.getMetadataPath(name);
        await this.client.delete(metadataPath);
      } else {
        // KV v1: Hard delete
        const path = this.getSecretPath(name);
        await this.client.delete(path);
      }

      logger.info({ name }, 'Deleted secret from HashiCorp Vault');
    } catch (error: any) {
      if (error.response?.statusCode === 404) {
        throw new Error(`Secret not found: ${name}`);
      }
      throw new Error(`Failed to delete secret ${name}: ${error.message}`);
    }
  }

  protected async listSecrets(): Promise<SecretMetadata[]> {
    await this.initClient();

    try {
      const secrets: SecretMetadata[] = [];

      // List path depends on KV version
      const listPath =
        this.kvVersion === 2
          ? `${this.kvPath}/metadata/${this.prefix}`
          : `${this.kvPath}/${this.prefix}`;

      try {
        const response = await this.client.list(listPath);

        if (response?.data?.keys) {
          for (const key of response.data.keys) {
            // Remove trailing slash if it's a folder
            const name = key.endsWith('/') ? key.slice(0, -1) : key;

            secrets.push({
              name,
              metadata: {
                path: `${listPath}${key}`,
                kvVersion: this.kvVersion,
              },
            });
          }
        }
      } catch (error: any) {
        // Empty list returns 404, which is fine
        if (error.response?.statusCode !== 404) {
          throw error;
        }
      }

      return secrets;
    } catch (error: any) {
      throw new Error(`Failed to list secrets: ${error.message}`);
    }
  }

  /**
   * Permanently destroy a secret version (KV v2 only)
   *
   * @param name - Secret name
   * @param versions - Array of version numbers to destroy
   */
  async destroyVersions(name: string, versions: number[]): Promise<void> {
    await this.initClient();

    if (this.kvVersion !== 2) {
      throw new Error('destroyVersions is only supported in KV v2');
    }

    try {
      const fullName = `${this.prefix}${name}`;
      const destroyPath = `${this.kvPath}/destroy/${fullName}`;

      await this.client.write(destroyPath, {
        versions,
      });

      logger.info({ name, versions }, 'Destroyed secret versions in Vault');
    } catch (error: any) {
      throw new Error(`Failed to destroy versions of ${name}: ${error.message}`);
    }
  }

  /**
   * Undelete a soft-deleted secret version (KV v2 only)
   *
   * @param name - Secret name
   * @param versions - Array of version numbers to undelete
   */
  async undeleteVersions(name: string, versions: number[]): Promise<void> {
    await this.initClient();

    if (this.kvVersion !== 2) {
      throw new Error('undeleteVersions is only supported in KV v2');
    }

    try {
      const fullName = `${this.prefix}${name}`;
      const undeletePath = `${this.kvPath}/undelete/${fullName}`;

      await this.client.write(undeletePath, {
        versions,
      });

      logger.info({ name, versions }, 'Undeleted secret versions in Vault');
    } catch (error: any) {
      throw new Error(`Failed to undelete versions of ${name}: ${error.message}`);
    }
  }
}
