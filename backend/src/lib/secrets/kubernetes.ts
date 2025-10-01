// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/**
 * Kubernetes Secrets Implementation
 *
 * Integrates with Kubernetes Secrets for development and production secret storage.
 * Suitable for applications running inside Kubernetes clusters.
 *
 * Environment Variables:
 * - K8S_SECRET_NAMESPACE (optional): Kubernetes namespace (default: default)
 * - K8S_SECRET_NAME (optional): Name of the Secret resource (default: vibebox-secrets)
 * - KUBERNETES_SERVICE_HOST (auto-set in pods): Kubernetes API server host
 * - KUBERNETES_SERVICE_PORT (auto-set in pods): Kubernetes API server port
 */

import {
  SecretManager,
  Secret,
  SecretMetadata,
  GetSecretOptions,
  SetSecretOptions,
} from '../secrets';
import { logger } from '../logger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Kubernetes Secrets implementation
 *
 * Uses Kubernetes client library (@kubernetes/client-node).
 * Automatically detects in-cluster configuration.
 */
export class KubernetesSecretManager extends SecretManager {
  private k8sApi: any; // CoreV1Api
  private namespace: string;
  private secretName: string;

  constructor(cacheTTL?: number) {
    super(cacheTTL);

    this.namespace = process.env.K8S_SECRET_NAMESPACE || 'default';
    this.secretName = process.env.K8S_SECRET_NAME || 'vibebox-secrets';
  }

  /**
   * Initialize the Kubernetes client
   *
   * Lazy initialization to avoid loading K8s SDK unless needed.
   */
  private async initClient(): Promise<void> {
    if (this.k8sApi) {
      return;
    }

    try {
      // Dynamic import to avoid loading K8s SDK unless this provider is used
      const k8s = await import('@kubernetes/client-node');

      const kc = new k8s.KubeConfig();

      // Try in-cluster config first (when running in a pod)
      if (this.isInCluster()) {
        kc.loadFromCluster();
      }
      // Fall back to local kubeconfig
      else {
        kc.loadFromDefault();
      }

      this.k8sApi = kc.makeApiClient(k8s.CoreV1Api);

      logger.info(
        { namespace: this.namespace, secretName: this.secretName },
        'Kubernetes Secrets initialized'
      );
    } catch (error) {
      logger.error({ error }, 'Failed to initialize Kubernetes client');
      throw new Error('Kubernetes SDK not installed. Run: npm install @kubernetes/client-node');
    }
  }

  /**
   * Check if running inside a Kubernetes cluster
   */
  private isInCluster(): boolean {
    const serviceAccountPath = '/var/run/secrets/kubernetes.io/serviceaccount';
    return (
      !!process.env.KUBERNETES_SERVICE_HOST && fs.existsSync(path.join(serviceAccountPath, 'token'))
    );
  }

  /**
   * Get or create the Secret resource
   */
  private async getOrCreateSecret(): Promise<any> {
    try {
      const response = await this.k8sApi.readNamespacedSecret(this.secretName, this.namespace);
      return response.body;
    } catch (error: any) {
      // If secret doesn't exist, create it
      if (error.response?.statusCode === 404) {
        const secret = {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: {
            name: this.secretName,
            namespace: this.namespace,
          },
          type: 'Opaque',
          data: {},
        };

        const response = await this.k8sApi.createNamespacedSecret(this.namespace, secret);
        return response.body;
      }
      throw error;
    }
  }

  protected async getSecret(name: string, _options?: GetSecretOptions): Promise<Secret> {
    await this.initClient();

    try {
      const secret = await this.getOrCreateSecret();

      if (!secret.data || !(name in secret.data)) {
        throw new Error(`Secret not found: ${name}`);
      }

      // Kubernetes stores secrets as base64-encoded strings
      const value = Buffer.from(secret.data[name], 'base64').toString('utf8');

      return {
        value,
        metadata: {
          name,
          version: secret.metadata.resourceVersion,
          createdAt: secret.metadata.creationTimestamp
            ? new Date(secret.metadata.creationTimestamp)
            : undefined,
          metadata: {
            namespace: this.namespace,
            secretName: this.secretName,
            uid: secret.metadata.uid,
          },
        },
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
    _options?: SetSecretOptions
  ): Promise<void> {
    await this.initClient();

    try {
      const secret = await this.getOrCreateSecret();

      // Encode value as base64
      const encodedValue = Buffer.from(value, 'utf8').toString('base64');

      // Update the secret data
      secret.data[name] = encodedValue;

      // Patch the secret
      await this.k8sApi.replaceNamespacedSecret(this.secretName, this.namespace, secret);

      logger.info({ secretName: this.secretName, key: name }, 'Set secret in Kubernetes');
    } catch (error: any) {
      throw new Error(`Failed to set secret ${name}: ${error.message}`);
    }
  }

  protected async deleteSecret(name: string): Promise<void> {
    await this.initClient();

    try {
      const secret = await this.getOrCreateSecret();

      if (!secret.data || !(name in secret.data)) {
        throw new Error(`Secret not found: ${name}`);
      }

      // Remove the key from the secret data
      delete secret.data[name];

      // Patch the secret
      await this.k8sApi.replaceNamespacedSecret(this.secretName, this.namespace, secret);

      logger.info({ secretName: this.secretName, key: name }, 'Deleted secret from Kubernetes');
    } catch (error: any) {
      throw new Error(`Failed to delete secret ${name}: ${error.message}`);
    }
  }

  protected async listSecrets(): Promise<SecretMetadata[]> {
    await this.initClient();

    try {
      const secret = await this.getOrCreateSecret();

      const secrets: SecretMetadata[] = [];

      if (secret.data) {
        for (const key of Object.keys(secret.data)) {
          secrets.push({
            name: key,
            version: secret.metadata.resourceVersion,
            createdAt: secret.metadata.creationTimestamp
              ? new Date(secret.metadata.creationTimestamp)
              : undefined,
            metadata: {
              namespace: this.namespace,
              secretName: this.secretName,
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
   * Create a new Secret resource with multiple key-value pairs
   *
   * @param secretName - Name of the Secret resource
   * @param data - Key-value pairs to store
   * @param namespace - Kubernetes namespace (optional)
   */
  async createSecret(
    secretName: string,
    data: Record<string, string>,
    namespace?: string
  ): Promise<void> {
    await this.initClient();

    try {
      const ns = namespace || this.namespace;

      // Encode all values as base64
      const encodedData: Record<string, string> = {};
      for (const [key, value] of Object.entries(data)) {
        encodedData[key] = Buffer.from(value, 'utf8').toString('base64');
      }

      const secret = {
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
          name: secretName,
          namespace: ns,
        },
        type: 'Opaque',
        data: encodedData,
      };

      await this.k8sApi.createNamespacedSecret(ns, secret);

      logger.info({ secretName, namespace: ns }, 'Created Kubernetes Secret');
    } catch (error: any) {
      throw new Error(`Failed to create secret ${secretName}: ${error.message}`);
    }
  }

  /**
   * Delete an entire Secret resource
   *
   * @param secretName - Name of the Secret resource
   * @param namespace - Kubernetes namespace (optional)
   */
  async deleteSecretResource(secretName: string, namespace?: string): Promise<void> {
    await this.initClient();

    try {
      const ns = namespace || this.namespace;

      await this.k8sApi.deleteNamespacedSecret(secretName, ns);

      logger.info({ secretName, namespace: ns }, 'Deleted Kubernetes Secret');
    } catch (error: any) {
      if (error.response?.statusCode === 404) {
        throw new Error(`Secret resource not found: ${secretName}`);
      }
      throw new Error(`Failed to delete secret ${secretName}: ${error.message}`);
    }
  }
}
