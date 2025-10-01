// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/**
 * Azure Key Vault Implementation
 *
 * Integrates with Azure Key Vault for production secret storage.
 * Supports versioning, soft delete, and Azure RBAC.
 *
 * Environment Variables:
 * - AZURE_KEYVAULT_URL or AZURE_KEY_VAULT_NAME (required): Key Vault URL or name
 * - AZURE_TENANT_ID (optional): Azure AD tenant ID
 * - AZURE_CLIENT_ID (optional): Service principal client ID
 * - AZURE_CLIENT_SECRET (optional): Service principal client secret
 * - AZURE_SECRET_PREFIX (optional): Prefix for all secret names (default: vibebox-)
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
 * Azure Key Vault implementation
 *
 * Uses Azure SDK for JavaScript.
 * Supports multiple authentication methods:
 * - DefaultAzureCredential (managed identity, Azure CLI, environment)
 * - Service Principal (client ID + secret)
 */
export class AzureKeyVaultManager extends SecretManager {
  private client: any; // SecretClient
  private vaultUrl: string;
  private prefix: string;

  constructor(cacheTTL?: number) {
    super(cacheTTL);

    // Construct vault URL
    if (process.env.AZURE_KEYVAULT_URL) {
      this.vaultUrl = process.env.AZURE_KEYVAULT_URL;
    } else if (process.env.AZURE_KEY_VAULT_NAME) {
      this.vaultUrl = `https://${process.env.AZURE_KEY_VAULT_NAME}.vault.azure.net`;
    } else {
      throw new Error(
        'AZURE_KEYVAULT_URL or AZURE_KEY_VAULT_NAME environment variable is required'
      );
    }

    this.prefix = process.env.AZURE_SECRET_PREFIX || 'vibebox-';
  }

  /**
   * Initialize the Azure Key Vault client
   *
   * Lazy initialization to avoid loading Azure SDK unless needed.
   */
  private async initClient(): Promise<void> {
    if (this.client) {
      return;
    }

    try {
      // Dynamic import to avoid loading Azure SDK unless this provider is used
      const { SecretClient } = await import('@azure/keyvault-secrets');
      const { DefaultAzureCredential, ClientSecretCredential } = await import('@azure/identity');

      let credential;

      // Use service principal if explicitly configured
      if (
        process.env.AZURE_TENANT_ID &&
        process.env.AZURE_CLIENT_ID &&
        process.env.AZURE_CLIENT_SECRET
      ) {
        credential = new ClientSecretCredential(
          process.env.AZURE_TENANT_ID,
          process.env.AZURE_CLIENT_ID,
          process.env.AZURE_CLIENT_SECRET
        );
      } else {
        // Use DefaultAzureCredential (tries multiple methods)
        credential = new DefaultAzureCredential();
      }

      this.client = new SecretClient(this.vaultUrl, credential);
      logger.info({ vaultUrl: this.vaultUrl, prefix: this.prefix }, 'Azure Key Vault initialized');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize Azure Key Vault');
      throw new Error(
        'Azure SDK not installed. Run: npm install @azure/keyvault-secrets @azure/identity'
      );
    }
  }

  /**
   * Normalize secret name for Azure Key Vault
   * Azure Key Vault names must be alphanumeric and hyphens only
   */
  private normalizeSecretName(name: string): string {
    return `${this.prefix}${name}`.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
  }

  protected async getSecret(name: string, options?: GetSecretOptions): Promise<Secret> {
    await this.initClient();

    try {
      const secretName = this.normalizeSecretName(name);

      const secret = options?.version
        ? await this.client.getSecret(secretName, { version: options.version })
        : await this.client.getSecret(secretName);

      if (!secret.value) {
        throw new Error(`Secret ${name} has no value`);
      }

      return {
        value: secret.value,
        metadata: {
          name,
          version: secret.properties.version,
          createdAt: secret.properties.createdOn,
          updatedAt: secret.properties.updatedOn,
          expiresAt: secret.properties.expiresOn,
          metadata: {
            id: secret.properties.id,
            enabled: secret.properties.enabled,
            contentType: secret.properties.contentType,
            tags: secret.properties.tags,
          },
        },
      };
    } catch (error: any) {
      if (error.code === 'SecretNotFound') {
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
      const secretName = this.normalizeSecretName(name);

      const secretOptions: any = {};

      if (options?.tags) {
        secretOptions.tags = options.tags;
      }

      if (options?.expiresAt) {
        secretOptions.expiresOn = options.expiresAt;
      }

      if (options?.description) {
        secretOptions.contentType = options.description;
      }

      await this.client.setSecret(secretName, value, secretOptions);

      logger.info({ secretName }, 'Set secret in Azure Key Vault');
    } catch (error: any) {
      throw new Error(`Failed to set secret ${name}: ${error.message}`);
    }
  }

  protected async deleteSecret(name: string): Promise<void> {
    await this.initClient();

    try {
      const secretName = this.normalizeSecretName(name);

      // Begin delete (soft delete by default)
      const poller = await this.client.beginDeleteSecret(secretName);

      // Wait for deletion to complete
      await poller.pollUntilDone();

      logger.info({ secretName }, 'Deleted secret from Azure Key Vault');
    } catch (error: any) {
      if (error.code === 'SecretNotFound') {
        throw new Error(`Secret not found: ${name}`);
      }
      throw new Error(`Failed to delete secret ${name}: ${error.message}`);
    }
  }

  protected async listSecrets(): Promise<SecretMetadata[]> {
    await this.initClient();

    try {
      const secrets: SecretMetadata[] = [];

      for await (const properties of this.client.listPropertiesOfSecrets()) {
        // Only include secrets with our prefix
        if (properties.name.startsWith(this.prefix)) {
          const name = properties.name.substring(this.prefix.length);
          secrets.push({
            name,
            version: properties.version,
            createdAt: properties.createdOn,
            updatedAt: properties.updatedOn,
            expiresAt: properties.expiresOn,
            metadata: {
              id: properties.id,
              enabled: properties.enabled,
              contentType: properties.contentType,
              tags: properties.tags,
            },
          });
        }
      }

      return secrets;
    } catch (error: any) {
      throw new Error(`Failed to list secrets: ${error.message}`);
    }
  }

  /**
   * Purge a deleted secret permanently
   *
   * @param name - Secret name
   */
  async purgeDeletedSecret(name: string): Promise<void> {
    await this.initClient();

    try {
      const secretName = this.normalizeSecretName(name);

      await this.client.purgeDeletedSecret(secretName);

      logger.info({ secretName }, 'Purged deleted secret from Azure Key Vault');
    } catch (error: any) {
      throw new Error(`Failed to purge deleted secret ${name}: ${error.message}`);
    }
  }

  /**
   * Recover a soft-deleted secret
   *
   * @param name - Secret name
   */
  async recoverDeletedSecret(name: string): Promise<void> {
    await this.initClient();

    try {
      const secretName = this.normalizeSecretName(name);

      const poller = await this.client.beginRecoverDeletedSecret(secretName);
      await poller.pollUntilDone();

      logger.info({ secretName }, 'Recovered deleted secret in Azure Key Vault');
    } catch (error: any) {
      throw new Error(`Failed to recover deleted secret ${name}: ${error.message}`);
    }
  }

  /**
   * List all versions of a secret
   *
   * @param name - Secret name
   * @returns Array of version metadata
   */
  async listVersions(name: string): Promise<SecretMetadata[]> {
    await this.initClient();

    try {
      const secretName = this.normalizeSecretName(name);
      const versions: SecretMetadata[] = [];

      for await (const properties of this.client.listPropertiesOfSecretVersions(secretName)) {
        versions.push({
          name,
          version: properties.version,
          createdAt: properties.createdOn,
          updatedAt: properties.updatedOn,
          expiresAt: properties.expiresOn,
          metadata: {
            id: properties.id,
            enabled: properties.enabled,
          },
        });
      }

      return versions;
    } catch (error: any) {
      throw new Error(`Failed to list versions of ${name}: ${error.message}`);
    }
  }
}
