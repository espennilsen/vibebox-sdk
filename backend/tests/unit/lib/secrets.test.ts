/**
 * Unit Tests for Secrets Management
 *
 * Tests the SecretManager base class and EnvironmentSecretManager implementation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SecretManager,
  EnvironmentSecretManager,
  SecretManagerFactory,
  getSecretManager,
  resetSecretManager,
} from '../../../src/lib/secrets';

describe('EnvironmentSecretManager', () => {
  let secretManager: EnvironmentSecretManager;

  beforeEach(() => {
    secretManager = new EnvironmentSecretManager(1000, 'TEST_SECRET_');
    // Clear environment
    Object.keys(process.env)
      .filter((key) => key.startsWith('TEST_SECRET_'))
      .forEach((key) => delete process.env[key]);
  });

  afterEach(() => {
    secretManager.clearCache();
  });

  describe('get', () => {
    it('should retrieve a secret from environment variable', async () => {
      process.env.TEST_SECRET_DATABASE_PASSWORD = 'test-password';

      const secret = await secretManager.get('database-password');

      expect(secret.value).toBe('test-password');
      expect(secret.metadata.name).toBe('database-password');
      expect(secret.metadata.version).toBe('1');
    });

    it('should throw error if secret not found', async () => {
      await expect(secretManager.get('nonexistent')).rejects.toThrow('Secret not found');
    });

    it('should cache secrets', async () => {
      process.env.TEST_SECRET_API_KEY = 'original-key';

      // First retrieval
      const secret1 = await secretManager.get('api-key');
      expect(secret1.value).toBe('original-key');

      // Change environment variable
      process.env.TEST_SECRET_API_KEY = 'new-key';

      // Second retrieval should return cached value
      const secret2 = await secretManager.get('api-key');
      expect(secret2.value).toBe('original-key');

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Third retrieval should get new value
      const secret3 = await secretManager.get('api-key');
      expect(secret3.value).toBe('new-key');
    });

    it('should bypass cache when requested', async () => {
      process.env.TEST_SECRET_JWT_SECRET = 'original-jwt';

      // First retrieval
      await secretManager.get('jwt-secret');

      // Change environment variable
      process.env.TEST_SECRET_JWT_SECRET = 'new-jwt';

      // Bypass cache
      const secret = await secretManager.get('jwt-secret', { bypassCache: true });
      expect(secret.value).toBe('new-jwt');
    });
  });

  describe('set', () => {
    it('should set a secret in environment', async () => {
      await secretManager.set('new-secret', 'secret-value');

      expect(process.env.TEST_SECRET_NEW_SECRET).toBe('secret-value');
    });

    it('should invalidate cache after setting', async () => {
      process.env.TEST_SECRET_CACHE_TEST = 'old-value';

      // Cache the secret
      await secretManager.get('cache-test');

      // Update the secret
      await secretManager.set('cache-test', 'new-value');

      // Retrieve again - should get new value
      const secret = await secretManager.get('cache-test');
      expect(secret.value).toBe('new-value');
    });
  });

  describe('delete', () => {
    it('should delete a secret from environment', async () => {
      process.env.TEST_SECRET_TO_DELETE = 'delete-me';

      await secretManager.delete('to-delete');

      expect(process.env.TEST_SECRET_TO_DELETE).toBeUndefined();
    });

    it('should invalidate cache after deletion', async () => {
      process.env.TEST_SECRET_DELETE_CACHE = 'value';

      // Cache the secret
      await secretManager.get('delete-cache');

      // Delete the secret
      await secretManager.delete('delete-cache');

      // Should throw error
      await expect(secretManager.get('delete-cache')).rejects.toThrow('Secret not found');
    });
  });

  describe('list', () => {
    it('should list all secrets with prefix', async () => {
      process.env.TEST_SECRET_SECRET1 = 'value1';
      process.env.TEST_SECRET_SECRET2 = 'value2';
      process.env.TEST_SECRET_SECRET3 = 'value3';
      process.env.OTHER_SECRET = 'ignored';

      const secrets = await secretManager.list();

      expect(secrets.length).toBe(3);
      expect(secrets.map((s) => s.name).sort()).toEqual(['secret1', 'secret2', 'secret3']);
    });

    it('should return empty array if no secrets exist', async () => {
      const secrets = await secretManager.list();

      expect(secrets).toEqual([]);
    });
  });

  describe('rotate', () => {
    it('should rotate a secret', async () => {
      process.env.TEST_SECRET_ROTATE_ME = 'old-value';

      await secretManager.rotate('rotate-me', async () => 'new-value');

      const secret = await secretManager.get('rotate-me');
      expect(secret.value).toBe('new-value');
    });

    it('should invalidate cache after rotation', async () => {
      process.env.TEST_SECRET_ROTATE_CACHE = 'old';

      // Cache the secret
      await secretManager.get('rotate-cache');

      // Rotate
      await secretManager.rotate('rotate-cache', async () => 'rotated');

      // Should get new value
      const secret = await secretManager.get('rotate-cache');
      expect(secret.value).toBe('rotated');
    });
  });

  describe('audit logs', () => {
    it('should log successful operations', async () => {
      process.env.TEST_SECRET_AUDIT_TEST = 'value';

      await secretManager.get('audit-test');

      const logs = secretManager.getAuditLogs();
      expect(logs.length).toBeGreaterThan(0);

      const lastLog = logs[0];
      expect(lastLog.operation).toBe('get');
      expect(lastLog.secretName).toBe('audit-test');
      expect(lastLog.success).toBe(true);
    });

    it('should log failed operations', async () => {
      try {
        await secretManager.get('nonexistent');
      } catch {
        // Expected
      }

      const logs = secretManager.getAuditLogs();
      const lastLog = logs[0];

      expect(lastLog.operation).toBe('get');
      expect(lastLog.secretName).toBe('nonexistent');
      expect(lastLog.success).toBe(false);
      expect(lastLog.error).toBeDefined();
    });

    it('should limit audit log size', async () => {
      // Set a small max size for testing
      const sm = new EnvironmentSecretManager(1000, 'TEST_SECRET_');
      (sm as any).maxAuditLogs = 10;

      process.env.TEST_SECRET_LIMIT_TEST = 'value';

      // Generate more logs than the limit
      for (let i = 0; i < 15; i++) {
        await sm.get('limit-test');
      }

      const logs = sm.getAuditLogs();
      expect(logs.length).toBeLessThanOrEqual(10);
    });
  });

  describe('cache management', () => {
    it('should clear all cached secrets', async () => {
      process.env.TEST_SECRET_CACHE1 = 'value1';
      process.env.TEST_SECRET_CACHE2 = 'value2';

      // Cache secrets
      await secretManager.get('cache1');
      await secretManager.get('cache2');

      // Clear cache
      secretManager.clearCache();

      // Change values
      process.env.TEST_SECRET_CACHE1 = 'new1';
      process.env.TEST_SECRET_CACHE2 = 'new2';

      // Should get new values
      const secret1 = await secretManager.get('cache1');
      const secret2 = await secretManager.get('cache2');

      expect(secret1.value).toBe('new1');
      expect(secret2.value).toBe('new2');
    });
  });
});

describe('SecretManagerFactory', () => {
  beforeEach(() => {
    // Clear provider environment variables
    delete process.env.SECRET_PROVIDER;
    delete process.env.AWS_SECRET_MANAGER_REGION;
    delete process.env.GCP_PROJECT_ID;
    delete process.env.AZURE_KEYVAULT_URL;
    delete process.env.VAULT_ADDR;
    delete process.env.KUBERNETES_SERVICE_HOST;
  });

  it('should create environment secret manager by default', async () => {
    const secretManager = await SecretManagerFactory.create();

    expect(secretManager).toBeInstanceOf(EnvironmentSecretManager);
  });

  it('should respect explicit SECRET_PROVIDER', async () => {
    process.env.SECRET_PROVIDER = 'env';

    const secretManager = await SecretManagerFactory.create();

    expect(secretManager).toBeInstanceOf(EnvironmentSecretManager);
  });

  it('should throw error for unknown provider', async () => {
    process.env.SECRET_PROVIDER = 'unknown';

    await expect(SecretManagerFactory.create()).rejects.toThrow('Unknown secret provider');
  });

  it('should auto-detect AWS when credentials available', async () => {
    process.env.AWS_SECRET_MANAGER_REGION = 'us-east-1';

    const isAvailable = await (SecretManagerFactory as any).isAWSAvailable();

    expect(isAvailable).toBe(true);
  });

  it('should auto-detect GCP when project ID available', async () => {
    process.env.GCP_PROJECT_ID = 'test-project';

    const isAvailable = await (SecretManagerFactory as any).isGCPAvailable();

    expect(isAvailable).toBe(true);
  });

  it('should auto-detect Azure when Key Vault URL available', async () => {
    process.env.AZURE_KEYVAULT_URL = 'https://test.vault.azure.net';

    const isAvailable = await (SecretManagerFactory as any).isAzureAvailable();

    expect(isAvailable).toBe(true);
  });

  it('should auto-detect Vault when address available', async () => {
    process.env.VAULT_ADDR = 'https://vault.example.com';

    const isAvailable = await (SecretManagerFactory as any).isVaultAvailable();

    expect(isAvailable).toBe(true);
  });

  it('should auto-detect Kubernetes when service host available', async () => {
    process.env.KUBERNETES_SERVICE_HOST = '10.0.0.1';

    const isAvailable = await (SecretManagerFactory as any).isKubernetesAvailable();

    expect(isAvailable).toBe(true);
  });
});

describe('getSecretManager singleton', () => {
  beforeEach(() => {
    resetSecretManager();
  });

  afterEach(() => {
    resetSecretManager();
  });

  it('should return the same instance on multiple calls', async () => {
    const sm1 = await getSecretManager();
    const sm2 = await getSecretManager();

    expect(sm1).toBe(sm2);
  });

  it('should create new instance after reset', async () => {
    const sm1 = await getSecretManager();

    resetSecretManager();

    const sm2 = await getSecretManager();

    expect(sm1).not.toBe(sm2);
  });
});

describe('SecretManager error handling', () => {
  let secretManager: EnvironmentSecretManager;

  beforeEach(() => {
    secretManager = new EnvironmentSecretManager(1000, 'TEST_SECRET_');
  });

  it('should handle errors in get operation', async () => {
    await expect(secretManager.get('nonexistent')).rejects.toThrow();

    const logs = secretManager.getAuditLogs();
    const lastLog = logs[0];

    expect(lastLog.success).toBe(false);
    expect(lastLog.error).toContain('not found');
  });

  it('should handle errors in rotation', async () => {
    process.env.TEST_SECRET_ERROR_TEST = 'value';

    await expect(
      secretManager.rotate('error-test', async () => {
        throw new Error('Rotation failed');
      })
    ).rejects.toThrow('Rotation failed');

    const logs = secretManager.getAuditLogs();
    const lastLog = logs[0];

    expect(lastLog.operation).toBe('rotate');
    expect(lastLog.success).toBe(false);
  });
});

describe('Secret metadata', () => {
  let secretManager: EnvironmentSecretManager;

  beforeEach(() => {
    secretManager = new EnvironmentSecretManager(1000, 'TEST_SECRET_');
  });

  it('should include metadata in secret response', async () => {
    process.env.TEST_SECRET_METADATA_TEST = 'value';

    const secret = await secretManager.get('metadata-test');

    expect(secret.metadata).toBeDefined();
    expect(secret.metadata.name).toBe('metadata-test');
    expect(secret.metadata.version).toBe('1');
    expect(secret.metadata.metadata).toBeDefined();
    expect(secret.metadata.metadata?.source).toBe('environment');
  });
});

describe('Performance tests', () => {
  let secretManager: EnvironmentSecretManager;

  beforeEach(() => {
    secretManager = new EnvironmentSecretManager(10000, 'TEST_SECRET_');
    process.env.TEST_SECRET_PERF_TEST = 'value';
  });

  it('should cache secrets for performance', async () => {
    const iterations = 100;
    const start = Date.now();

    for (let i = 0; i < iterations; i++) {
      await secretManager.get('perf-test');
    }

    const duration = Date.now() - start;

    // All but first should be cached, should be fast
    expect(duration).toBeLessThan(100); // Less than 1ms per iteration
  });

  it('should log operation duration in metadata', async () => {
    await secretManager.get('perf-test');

    const logs = secretManager.getAuditLogs();
    const lastLog = logs[0];

    expect(lastLog.metadata?.duration).toBeDefined();
    expect(typeof lastLog.metadata?.duration).toBe('number');
    expect(lastLog.metadata?.duration).toBeGreaterThanOrEqual(0);
  });
});
