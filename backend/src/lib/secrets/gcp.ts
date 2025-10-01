/**
 * Google Cloud Secret Manager Implementation
 *
 * Integrates with Google Cloud Secret Manager for production secret storage.
 * Supports automatic versioning, replication, and IAM-based access control.
 *
 * Environment Variables:
 * - GCP_PROJECT_ID or GOOGLE_CLOUD_PROJECT (required): GCP project ID
 * - GOOGLE_APPLICATION_CREDENTIALS (optional): Path to service account JSON
 * - GCP_SECRET_PREFIX (optional): Prefix for all secret names (default: vibebox-)
 */

import type {
  SecretManagerServiceClient,
  SecretManagerServiceClientOptions,
  AccessSecretVersionRequest,
  AccessSecretVersionResponse,
  AddSecretVersionRequest,
  CreateSecretRequest,
  DeleteSecretRequest,
  ListSecretsRequest,
  ListSecretsResponse,
  DestroySecretVersionRequest,
  ListSecretVersionsRequest,
  ListSecretVersionsResponse,
} from '@google-cloud/secret-manager';
import {
  SecretManager,
  Secret,
  SecretMetadata,
  GetSecretOptions,
  SetSecretOptions,
} from '../secrets';
import { logger } from '../logger';

/**
 * Google Cloud Secret Manager implementation
 *
 * Uses Google Cloud Secret Manager client library.
 * Supports automatic credential detection via Application Default Credentials (ADC).
 */
export class GCPSecretManager extends SecretManager {
  private client: SecretManagerServiceClient | null = null;
  private projectId: string;
  private prefix: string;

  constructor(cacheTTL?: number) {
    super(cacheTTL);
    this.projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || '';
    this.prefix = process.env.GCP_SECRET_PREFIX || 'vibebox-';

    if (!this.projectId) {
      throw new Error('GCP_PROJECT_ID or GOOGLE_CLOUD_PROJECT environment variable is required');
    }
  }

  /**
   * Initialize the GCP Secret Manager client
   *
   * Lazy initialization to avoid loading GCP SDK unless needed.
   */
  private async initClient(): Promise<void> {
    if (this.client) {
      return;
    }

    try {
      // Dynamic import to avoid loading GCP SDK unless this provider is used
      const { SecretManagerServiceClient } = await import('@google-cloud/secret-manager');

      const config: SecretManagerServiceClientOptions = {};

      // Use service account if GOOGLE_APPLICATION_CREDENTIALS is set
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        config.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      }
      // Otherwise uses Application Default Credentials (ADC)

      this.client = new SecretManagerServiceClient(config);
      logger.info(
        { projectId: this.projectId, prefix: this.prefix },
        'GCP Secret Manager initialized'
      );
    } catch (error) {
      logger.error({ error }, 'Failed to initialize GCP Secret Manager');
      throw new Error('GCP SDK not installed. Run: npm install @google-cloud/secret-manager');
    }
  }

  /**
   * Get the full resource name for a secret
   */
  private getSecretResourceName(name: string): string {
    return `projects/${this.projectId}/secrets/${this.prefix}${name}`;
  }

  /**
   * Get the full resource name for a secret version
   */
  private getSecretVersionResourceName(name: string, version: string = 'latest'): string {
    return `${this.getSecretResourceName(name)}/versions/${version}`;
  }

  protected async getSecret(name: string, options?: GetSecretOptions): Promise<Secret> {
    await this.initClient();

    if (!this.client) {
      throw new Error('GCP Secret Manager client not initialized');
    }

    try {
      const versionName = this.getSecretVersionResourceName(name, options?.version || 'latest');

      const request: AccessSecretVersionRequest = {
        name: versionName,
      };

      const [version]: AccessSecretVersionResponse = await this.client.accessSecretVersion(request);

      if (!version.payload?.data) {
        throw new Error(`Secret ${name} has no value`);
      }

      // Convert Buffer/Uint8Array to string
      const data = version.payload.data;
      const value = typeof data === 'string' ? data : Buffer.from(data).toString('utf8');

      const createTimeSeconds = version.createTime?.seconds;
      const createdAt = createTimeSeconds ? new Date(Number(createTimeSeconds) * 1000) : undefined;

      return {
        value,
        metadata: {
          name,
          version: version.name?.split('/').pop(),
          createdAt,
          metadata: {
            state: version.state,
            resourceName: version.name,
          },
        },
      };
    } catch (error: unknown) {
      const err = error as Error & { code?: number };
      if (err.code === 5) {
        // NOT_FOUND
        throw new Error(`Secret not found: ${name}`);
      }
      throw new Error(`Failed to retrieve secret ${name}: ${err.message}`);
    }
  }

  protected async setSecret(
    name: string,
    value: string,
    options?: SetSecretOptions
  ): Promise<void> {
    await this.initClient();

    if (!this.client) {
      throw new Error('GCP Secret Manager client not initialized');
    }

    try {
      const secretName = this.getSecretResourceName(name);

      // Try to add a new version first
      try {
        const addVersionRequest: AddSecretVersionRequest = {
          parent: secretName,
          payload: {
            data: Buffer.from(value, 'utf8'),
          },
        };

        await this.client.addSecretVersion(addVersionRequest);
        logger.info({ secretName }, 'Added new version to GCP Secret Manager');
      } catch (error: unknown) {
        const err = error as Error & { code?: number };
        // If secret doesn't exist, create it
        if (err.code === 5) {
          // NOT_FOUND
          const labels = options?.tags || {};

          const createRequest: CreateSecretRequest = {
            parent: `projects/${this.projectId}`,
            secretId: `${this.prefix}${name}`,
            secret: {
              replication: {
                automatic: {},
              },
              labels,
            },
          };

          await this.client.createSecret(createRequest);

          // Add the initial version
          const addVersionRequest: AddSecretVersionRequest = {
            parent: secretName,
            payload: {
              data: Buffer.from(value, 'utf8'),
            },
          };

          await this.client.addSecretVersion(addVersionRequest);
          logger.info({ secretName }, 'Created secret in GCP Secret Manager');
        } else {
          throw error;
        }
      }
    } catch (error: unknown) {
      const err = error as Error;
      throw new Error(`Failed to set secret ${name}: ${err.message}`);
    }
  }

  protected async deleteSecret(name: string): Promise<void> {
    await this.initClient();

    if (!this.client) {
      throw new Error('GCP Secret Manager client not initialized');
    }

    try {
      const secretName = this.getSecretResourceName(name);

      const request: DeleteSecretRequest = {
        name: secretName,
      };

      await this.client.deleteSecret(request);
      logger.info({ secretName }, 'Deleted secret from GCP Secret Manager');
    } catch (error: unknown) {
      const err = error as Error & { code?: number };
      if (err.code === 5) {
        // NOT_FOUND
        throw new Error(`Secret not found: ${name}`);
      }
      throw new Error(`Failed to delete secret ${name}: ${err.message}`);
    }
  }

  protected async listSecrets(): Promise<SecretMetadata[]> {
    await this.initClient();

    if (!this.client) {
      throw new Error('GCP Secret Manager client not initialized');
    }

    try {
      const secrets: SecretMetadata[] = [];

      const request: ListSecretsRequest = {
        parent: `projects/${this.projectId}`,
      };

      const [secretsList]: ListSecretsResponse = await this.client.listSecrets(request);

      for (const secret of secretsList) {
        // Only include secrets with our prefix
        const secretId = secret.name?.split('/').pop() || '';
        if (secretId.startsWith(this.prefix)) {
          const name = secretId.substring(this.prefix.length);

          const createTimeSeconds = secret.createTime?.seconds;
          const createdAt = createTimeSeconds
            ? new Date(Number(createTimeSeconds) * 1000)
            : undefined;

          secrets.push({
            name,
            createdAt,
            metadata: {
              resourceName: secret.name,
              labels: secret.labels,
              replication: secret.replication,
            },
          });
        }
      }

      return secrets;
    } catch (error: unknown) {
      const err = error as Error;
      throw new Error(`Failed to list secrets: ${err.message}`);
    }
  }

  /**
   * Destroy a specific version of a secret
   *
   * @param name - Secret name
   * @param version - Version to destroy
   */
  async destroyVersion(name: string, version: string): Promise<void> {
    await this.initClient();

    if (!this.client) {
      throw new Error('GCP Secret Manager client not initialized');
    }

    try {
      const versionName = this.getSecretVersionResourceName(name, version);

      const request: DestroySecretVersionRequest = {
        name: versionName,
      };

      await this.client.destroySecretVersion(request);
      logger.info({ secretName: name, version }, 'Destroyed secret version');
    } catch (error: unknown) {
      const err = error as Error;
      throw new Error(`Failed to destroy version ${version} of ${name}: ${err.message}`);
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

    if (!this.client) {
      throw new Error('GCP Secret Manager client not initialized');
    }

    try {
      const secretName = this.getSecretResourceName(name);
      const versions: SecretMetadata[] = [];

      const request: ListSecretVersionsRequest = {
        parent: secretName,
      };

      const [versionsList]: ListSecretVersionsResponse =
        await this.client.listSecretVersions(request);

      for (const version of versionsList) {
        const versionId = version.name?.split('/').pop();

        const createTimeSeconds = version.createTime?.seconds;
        const createdAt = createTimeSeconds
          ? new Date(Number(createTimeSeconds) * 1000)
          : undefined;

        versions.push({
          name,
          version: versionId,
          createdAt,
          metadata: {
            state: version.state,
            resourceName: version.name,
          },
        });
      }

      return versions;
    } catch (error: unknown) {
      const err = error as Error;
      throw new Error(`Failed to list versions of ${name}: ${err.message}`);
    }
  }
}
