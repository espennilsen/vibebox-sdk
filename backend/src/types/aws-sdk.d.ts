/**
 * Type definitions for optional AWS SDK dependencies
 *
 * These types are only used when @aws-sdk/client-secrets-manager is installed.
 * The actual imports are done dynamically at runtime.
 */

declare module '@aws-sdk/client-secrets-manager' {
  export interface SecretsManagerClientConfig {
    region?: string;
    credentials?: {
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
    };
  }

  export class SecretsManagerClient {
    constructor(config: SecretsManagerClientConfig);
    send<Input, Output>(command: { input: Input }): Promise<Output>;
  }

  export interface GetSecretValueCommandInput {
    SecretId: string;
    VersionId?: string;
  }

  export interface GetSecretValueCommandOutput {
    ARN?: string;
    Name?: string;
    VersionId?: string;
    SecretBinary?: Uint8Array;
    SecretString?: string;
    VersionStages?: string[];
    CreatedDate?: Date;
  }

  export class GetSecretValueCommand {
    input: GetSecretValueCommandInput;
    constructor(input: GetSecretValueCommandInput);
  }

  export interface CreateSecretCommandInput {
    Name: string;
    SecretString?: string;
    SecretBinary?: Uint8Array;
    Description?: string;
    Tags?: Tag[];
  }

  export class CreateSecretCommand {
    input: CreateSecretCommandInput;
    constructor(input: CreateSecretCommandInput);
  }

  export interface UpdateSecretCommandInput {
    SecretId: string;
    SecretString?: string;
    SecretBinary?: Uint8Array;
    Description?: string;
  }

  export class UpdateSecretCommand {
    input: UpdateSecretCommandInput;
    constructor(input: UpdateSecretCommandInput);
  }

  export interface DeleteSecretCommandInput {
    SecretId: string;
    RecoveryWindowInDays?: number;
    ForceDeleteWithoutRecovery?: boolean;
  }

  export class DeleteSecretCommand {
    input: DeleteSecretCommandInput;
    constructor(input: DeleteSecretCommandInput);
  }

  export interface ListSecretsCommandInput {
    MaxResults?: number;
    NextToken?: string;
  }

  export interface SecretListEntry {
    ARN?: string;
    Name?: string;
    Description?: string;
    RotationEnabled?: boolean;
    RotationLambdaARN?: string;
    LastRotatedDate?: Date;
    LastChangedDate?: Date;
    CreatedDate?: Date;
  }

  export interface ListSecretsCommandOutput {
    SecretList?: SecretListEntry[];
    NextToken?: string;
  }

  export class ListSecretsCommand {
    input: ListSecretsCommandInput;
    constructor(input: ListSecretsCommandInput);
  }

  export interface RotateSecretCommandInput {
    SecretId: string;
    RotationLambdaARN?: string;
    RotationRules?: {
      AutomaticallyAfterDays?: number;
    };
  }

  export class RotateSecretCommand {
    input: RotateSecretCommandInput;
    constructor(input: RotateSecretCommandInput);
  }

  export interface Tag {
    Key?: string;
    Value?: string;
  }

  export class ResourceNotFoundException extends Error {
    name: 'ResourceNotFoundException';
  }
}
