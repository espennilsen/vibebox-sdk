/**
 * AWS Secrets Manager Implementation
 *
 * Integrates with AWS Secrets Manager for production secret storage.
 * Supports automatic rotation, versioning, and cross-region replication.
 *
 * Environment Variables:
 * - AWS_SECRET_MANAGER_REGION (required): AWS region for Secrets Manager
 * - AWS_ACCESS_KEY_ID (optional): AWS access key (or use IAM role)
 * - AWS_SECRET_ACCESS_KEY (optional): AWS secret key (or use IAM role)
 * - AWS_SESSION_TOKEN (optional): AWS session token for temporary credentials
 * - AWS_SECRET_PREFIX (optional): Prefix for all secret names (default: vibebox/)
 */

import type {
  SecretsManagerClient,
  SecretsManagerClientConfig,
  GetSecretValueCommandInput,
  GetSecretValueCommandOutput,
  CreateSecretCommandInput,
  UpdateSecretCommandInput,
  DeleteSecretCommandInput,
  ListSecretsCommandInput,
  ListSecretsCommandOutput,
  RotateSecretCommandInput,
  Tag,
} from '@aws-sdk/client-secrets-manager';
import {
  SecretManager,
  Secret,
  SecretMetadata,
  GetSecretOptions,
  SetSecretOptions,
} from '../secrets';
import { logger } from '../logger';

/**
 * AWS Secrets Manager implementation
 *
 * Uses AWS SDK v3 for Secrets Manager operations.
 * Supports automatic credential detection via IAM roles.
 */
export class AWSSecretsManager extends SecretManager {
  private client: SecretsManagerClient | null = null;
  private region: string;
  private prefix: string;

  constructor(cacheTTL?: number) {
    super(cacheTTL);
    this.region = process.env.AWS_SECRET_MANAGER_REGION || process.env.AWS_REGION || 'us-east-1';
    this.prefix = process.env.AWS_SECRET_PREFIX || 'vibebox/';
  }

  /**
   * Initialize the AWS Secrets Manager client
   *
   * Lazy initialization to avoid loading AWS SDK unless needed.
   */
  private async initClient(): Promise<void> {
    if (this.client) {
      return;
    }

    try {
      // Dynamic import to avoid loading AWS SDK unless this provider is used
      const { SecretsManagerClient } = await import('@aws-sdk/client-secrets-manager');

      const config: SecretsManagerClientConfig = {
        region: this.region,
      };

      // Explicit credentials if provided (otherwise uses IAM role)
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        config.credentials = {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          sessionToken: process.env.AWS_SESSION_TOKEN,
        };
      }

      this.client = new SecretsManagerClient(config);
      logger.info({ region: this.region, prefix: this.prefix }, 'AWS Secrets Manager initialized');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize AWS Secrets Manager');
      throw new Error('AWS SDK not installed. Run: npm install @aws-sdk/client-secrets-manager');
    }
  }

  protected async getSecret(name: string, options?: GetSecretOptions): Promise<Secret> {
    await this.initClient();

    if (!this.client) {
      throw new Error('AWS Secrets Manager client not initialized');
    }

    try {
      const { GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');

      const secretName = this.prefix + name;
      const commandInput: GetSecretValueCommandInput = {
        SecretId: secretName,
        VersionId: options?.version,
      };
      const command = new GetSecretValueCommand(commandInput);

      const response: GetSecretValueCommandOutput = await this.client.send(command);

      if (!response.SecretString) {
        throw new Error(`Secret ${secretName} has no value`);
      }

      return {
        value: response.SecretString,
        metadata: {
          name,
          version: response.VersionId,
          createdAt: response.CreatedDate,
          metadata: {
            arn: response.ARN,
            versionStages: response.VersionStages,
          },
        },
      };
    } catch (error: unknown) {
      const err = error as Error & { name?: string };
      if (err.name === 'ResourceNotFoundException') {
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
      throw new Error('AWS Secrets Manager client not initialized');
    }

    try {
      const { CreateSecretCommand, UpdateSecretCommand, ResourceNotFoundException } = await import(
        '@aws-sdk/client-secrets-manager'
      );

      const secretName = this.prefix + name;

      // Try to update first
      try {
        const updateInput: UpdateSecretCommandInput = {
          SecretId: secretName,
          SecretString: value,
          Description: options?.description,
        };
        const updateCommand = new UpdateSecretCommand(updateInput);

        await this.client.send(updateCommand);
        logger.info({ secretName }, 'Updated secret in AWS Secrets Manager');
      } catch (error: unknown) {
        const err = error as Error & { name?: string };
        // If secret doesn't exist, create it
        if (
          error instanceof ResourceNotFoundException ||
          err.name === 'ResourceNotFoundException'
        ) {
          const tags: Tag[] | undefined = options?.tags
            ? Object.entries(options.tags).map(([Key, Value]) => ({ Key, Value }))
            : undefined;

          const createInput: CreateSecretCommandInput = {
            Name: secretName,
            SecretString: value,
            Description: options?.description,
            Tags: tags,
          };
          const createCommand = new CreateSecretCommand(createInput);

          await this.client.send(createCommand);
          logger.info({ secretName }, 'Created secret in AWS Secrets Manager');
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
      throw new Error('AWS Secrets Manager client not initialized');
    }

    try {
      const { DeleteSecretCommand } = await import('@aws-sdk/client-secrets-manager');

      const secretName = this.prefix + name;
      const commandInput: DeleteSecretCommandInput = {
        SecretId: secretName,
        // Allow 7-day recovery window
        RecoveryWindowInDays: 7,
      };
      const command = new DeleteSecretCommand(commandInput);

      await this.client.send(command);
      logger.info({ secretName }, 'Deleted secret from AWS Secrets Manager');
    } catch (error: unknown) {
      const err = error as Error & { name?: string };
      if (err.name === 'ResourceNotFoundException') {
        throw new Error(`Secret not found: ${name}`);
      }
      throw new Error(`Failed to delete secret ${name}: ${err.message}`);
    }
  }

  protected async listSecrets(): Promise<SecretMetadata[]> {
    await this.initClient();

    if (!this.client) {
      throw new Error('AWS Secrets Manager client not initialized');
    }

    try {
      const { ListSecretsCommand } = await import('@aws-sdk/client-secrets-manager');

      const secrets: SecretMetadata[] = [];
      let nextToken: string | undefined;

      do {
        const commandInput: ListSecretsCommandInput = {
          MaxResults: 100,
          NextToken: nextToken,
        };
        const command = new ListSecretsCommand(commandInput);

        const response: ListSecretsCommandOutput = await this.client.send(command);

        for (const secret of response.SecretList || []) {
          // Only include secrets with our prefix
          if (secret.Name?.startsWith(this.prefix)) {
            const name = secret.Name.substring(this.prefix.length);
            secrets.push({
              name,
              createdAt: secret.CreatedDate,
              updatedAt: secret.LastChangedDate,
              metadata: {
                arn: secret.ARN,
                description: secret.Description,
                rotationEnabled: secret.RotationEnabled,
                lastRotatedDate: secret.LastRotatedDate,
              },
            });
          }
        }

        nextToken = response.NextToken;
      } while (nextToken);

      return secrets;
    } catch (error: unknown) {
      const err = error as Error;
      throw new Error(`Failed to list secrets: ${err.message}`);
    }
  }

  /**
   * Enable automatic rotation for a secret
   *
   * @param name - Secret name
   * @param rotationLambdaARN - ARN of Lambda function for rotation
   * @param rotationDays - Rotation frequency in days (default: 30)
   */
  async enableRotation(
    name: string,
    rotationLambdaARN: string,
    rotationDays: number = 30
  ): Promise<void> {
    await this.initClient();

    if (!this.client) {
      throw new Error('AWS Secrets Manager client not initialized');
    }

    try {
      const { RotateSecretCommand } = await import('@aws-sdk/client-secrets-manager');

      const secretName = this.prefix + name;
      const commandInput: RotateSecretCommandInput = {
        SecretId: secretName,
        RotationLambdaARN: rotationLambdaARN,
        RotationRules: {
          AutomaticallyAfterDays: rotationDays,
        },
      };
      const command = new RotateSecretCommand(commandInput);

      await this.client.send(command);
      logger.info({ secretName, rotationDays }, 'Enabled automatic rotation');
    } catch (error: unknown) {
      const err = error as Error;
      throw new Error(`Failed to enable rotation for ${name}: ${err.message}`);
    }
  }
}
