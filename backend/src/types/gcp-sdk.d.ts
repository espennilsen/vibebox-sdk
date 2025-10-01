/**
 * Type definitions for optional GCP Secret Manager dependency
 *
 * These types are only used when @google-cloud/secret-manager is installed.
 * The actual imports are done dynamically at runtime.
 */

declare module '@google-cloud/secret-manager' {
  export interface SecretManagerServiceClientOptions {
    keyFilename?: string;
    projectId?: string;
    credentials?: {
      client_email?: string;
      private_key?: string;
    };
  }

  export class SecretManagerServiceClient {
    constructor(options?: SecretManagerServiceClientOptions);
    accessSecretVersion(request: AccessSecretVersionRequest): Promise<AccessSecretVersionResponse>;
    addSecretVersion(request: AddSecretVersionRequest): Promise<AddSecretVersionResponse>;
    createSecret(request: CreateSecretRequest): Promise<CreateSecretResponse>;
    deleteSecret(request: DeleteSecretRequest): Promise<[void, unknown, unknown]>;
    listSecrets(request: ListSecretsRequest): Promise<ListSecretsResponse>;
    destroySecretVersion(request: DestroySecretVersionRequest): Promise<[void, unknown, unknown]>;
    listSecretVersions(request: ListSecretVersionsRequest): Promise<ListSecretVersionsResponse>;
  }

  export interface AccessSecretVersionRequest {
    name: string;
  }

  export type AccessSecretVersionResponse = [ISecretVersion];

  export interface ISecretVersion {
    name?: string | null;
    createTime?: {
      seconds?: string | number | null;
      nanos?: number | null;
    } | null;
    destroyTime?: {
      seconds?: string | number | null;
      nanos?: number | null;
    } | null;
    state?: string | null;
    replicationStatus?: unknown;
    etag?: string | null;
    payload?: {
      data?: string | Uint8Array | null;
      dataCrc32c?: string | number | null;
    } | null;
  }

  export interface AddSecretVersionRequest {
    parent: string;
    payload?: {
      data?: string | Uint8Array;
      dataCrc32c?: string | number;
    };
  }

  export type AddSecretVersionResponse = [ISecretVersion];

  export interface CreateSecretRequest {
    parent: string;
    secretId: string;
    secret?: ISecret;
  }

  export type CreateSecretResponse = [ISecret];

  export interface ISecret {
    name?: string | null;
    replication?: {
      automatic?: Record<string, never>;
      userManaged?: {
        replicas?: Array<{
          location?: string;
          customerManagedEncryption?: unknown;
        }>;
      };
    } | null;
    createTime?: {
      seconds?: string | number | null;
      nanos?: number | null;
    } | null;
    labels?: { [key: string]: string } | null;
    topics?: Array<{ name?: string }> | null;
    expireTime?: {
      seconds?: string | number | null;
      nanos?: number | null;
    } | null;
    ttl?: {
      seconds?: string | number | null;
      nanos?: number | null;
    } | null;
    etag?: string | null;
    rotation?: {
      nextRotationTime?: {
        seconds?: string | number | null;
        nanos?: number | null;
      };
      rotationPeriod?: {
        seconds?: string | number | null;
        nanos?: number | null;
      };
    } | null;
    versionAliases?: { [key: string]: string } | null;
  }

  export interface DeleteSecretRequest {
    name: string;
    etag?: string;
  }

  export interface ListSecretsRequest {
    parent: string;
    pageSize?: number;
    pageToken?: string;
    filter?: string;
  }

  export type ListSecretsResponse = [ISecret[]];

  export interface DestroySecretVersionRequest {
    name: string;
    etag?: string;
  }

  export interface ListSecretVersionsRequest {
    parent: string;
    pageSize?: number;
    pageToken?: string;
    filter?: string;
  }

  export type ListSecretVersionsResponse = [ISecretVersion[]];
}
