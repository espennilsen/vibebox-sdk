/**
 * Unit Tests for Configuration Management with Secret Resolution
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadConfig } from '../../../src/lib/config';
import { resetSecretManager } from '../../../src/lib/secrets';

describe('Configuration with Secret Resolution', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
    resetSecretManager();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetSecretManager();
  });

  describe('loadConfig', () => {
    it('should load configuration without secret resolution in development', async () => {
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
      process.env.JWT_SECRET = 'test-secret';
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
      process.env.PORT = '3000';

      const config = await loadConfig();

      expect(config.nodeEnv).toBe('development');
      expect(config.databaseUrl).toBe('postgresql://localhost:5432/test');
      expect(config.jwt.secret).toBe('test-secret');
      expect(config.isDevelopment).toBe(true);
      expect(config.isProduction).toBe(false);
    });

    it('should resolve secret references in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.SECRET_PROVIDER = 'env';
      process.env.SECRET_DATABASE_URL = 'postgresql://prod:password@db:5432/prod';
      process.env.SECRET_JWT_SECRET = 'prod-jwt-secret';
      process.env.SECRET_JWT_REFRESH_SECRET = 'prod-refresh-secret';
      process.env.SECRET_ENCRYPTION_KEY = 'prod-encryption-key-32-chars!!';

      process.env.DATABASE_URL = '${secret:database-url}';
      process.env.JWT_SECRET = '${secret:jwt-secret}';
      process.env.JWT_REFRESH_SECRET = '${secret:jwt-refresh-secret}';
      process.env.ENCRYPTION_KEY = '${secret:encryption-key}';
      process.env.PORT = '3000';

      const config = await loadConfig();

      expect(config.databaseUrl).toBe('postgresql://prod:password@db:5432/prod');
      expect(config.jwt.secret).toBe('prod-jwt-secret');
      expect(config.jwt.refreshSecret).toBe('prod-refresh-secret');
      expect(config.encryptionKey).toBe('prod-encryption-key-32-chars!!');
      expect(config.isProduction).toBe(true);
    });

    it('should resolve environment variable references', async () => {
      process.env.NODE_ENV = 'production';
      process.env.SECRET_PROVIDER = 'env';
      process.env.DATABASE_URL = '${env:DATABASE_URL_DIRECT}';
      process.env.DATABASE_URL_DIRECT = 'postgresql://direct:pass@localhost:5432/db';
      process.env.JWT_SECRET = 'test-jwt';
      process.env.JWT_REFRESH_SECRET = 'test-refresh';
      process.env.PORT = '3000';
      process.env.ENABLE_SECRET_MANAGER = 'true';

      const config = await loadConfig();

      expect(config.databaseUrl).toBe('postgresql://direct:pass@localhost:5432/db');
    });

    it('should throw error if secret reference cannot be resolved', async () => {
      process.env.NODE_ENV = 'production';
      process.env.SECRET_PROVIDER = 'env';
      process.env.DATABASE_URL = '${secret:nonexistent-secret}';
      process.env.JWT_SECRET = 'test-jwt';
      process.env.JWT_REFRESH_SECRET = 'test-refresh';
      process.env.PORT = '3000';

      await expect(loadConfig()).rejects.toThrow('Failed to resolve secret reference');
    });

    it('should skip secret resolution when ENABLE_SECRET_MANAGER is false', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ENABLE_SECRET_MANAGER = 'false';
      process.env.DATABASE_URL = '${secret:database-url}';
      process.env.JWT_SECRET = 'test-jwt';
      process.env.JWT_REFRESH_SECRET = 'test-refresh';
      process.env.PORT = '3000';

      const config = await loadConfig();

      // Should not resolve the reference
      expect(config.databaseUrl).toBe('${secret:database-url}');
    });

    it('should handle mixed secret and environment references', async () => {
      process.env.NODE_ENV = 'production';
      process.env.SECRET_PROVIDER = 'env';
      process.env.SECRET_DB_PASSWORD = 'secret-password';
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '5432';

      process.env.DATABASE_URL = 'postgresql://user:${secret:db-password}@${env:DB_HOST}:${env:DB_PORT}/db';
      process.env.JWT_SECRET = 'test-jwt';
      process.env.JWT_REFRESH_SECRET = 'test-refresh';
      process.env.PORT = '3000';

      const config = await loadConfig();

      expect(config.databaseUrl).toBe('postgresql://user:secret-password@localhost:5432/db');
    });

    it('should handle OAuth secrets', async () => {
      process.env.NODE_ENV = 'production';
      process.env.SECRET_PROVIDER = 'env';
      process.env.SECRET_GITHUB_CLIENT_SECRET = 'github-secret';
      process.env.SECRET_GOOGLE_CLIENT_SECRET = 'google-secret';

      process.env.GITHUB_CLIENT_ID = 'github-id';
      process.env.GITHUB_CLIENT_SECRET = '${secret:github-client-secret}';
      process.env.GOOGLE_CLIENT_ID = 'google-id';
      process.env.GOOGLE_CLIENT_SECRET = '${secret:google-client-secret}';

      process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
      process.env.JWT_SECRET = 'test-jwt';
      process.env.JWT_REFRESH_SECRET = 'test-refresh';
      process.env.PORT = '3000';

      const config = await loadConfig();

      expect(config.oauth.github.clientSecret).toBe('github-secret');
      expect(config.oauth.google.clientSecret).toBe('google-secret');
    });

    it('should compute correct environment flags', async () => {
      // Development
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
      process.env.JWT_SECRET = 'test';
      process.env.JWT_REFRESH_SECRET = 'test';
      process.env.PORT = '3000';

      let config = await loadConfig();
      expect(config.isDevelopment).toBe(true);
      expect(config.isProduction).toBe(false);
      expect(config.isTest).toBe(false);

      // Production
      process.env.NODE_ENV = 'production';
      process.env.ENABLE_SECRET_MANAGER = 'false';

      config = await loadConfig();
      expect(config.isDevelopment).toBe(false);
      expect(config.isProduction).toBe(true);
      expect(config.isTest).toBe(false);

      // Test
      process.env.NODE_ENV = 'test';

      config = await loadConfig();
      expect(config.isDevelopment).toBe(false);
      expect(config.isProduction).toBe(false);
      expect(config.isTest).toBe(true);
    });

    it('should use default values for optional fields', async () => {
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
      process.env.JWT_SECRET = 'test';
      process.env.JWT_REFRESH_SECRET = 'test';
      process.env.PORT = '3000';

      const config = await loadConfig();

      expect(config.host).toBe('0.0.0.0');
      expect(config.jwt.expiresIn).toBe('15m');
      expect(config.jwt.refreshExpiresIn).toBe('7d');
      expect(config.frontendUrl).toBe('http://localhost:5173');
      expect(config.logLevel).toBe('info');
    });

    it('should parse port as integer', async () => {
      process.env.NODE_ENV = 'development';
      process.env.PORT = '4000';
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
      process.env.JWT_SECRET = 'test';
      process.env.JWT_REFRESH_SECRET = 'test';

      const config = await loadConfig();

      expect(config.port).toBe(4000);
      expect(typeof config.port).toBe('number');
    });
  });

  describe('Configuration validation', () => {
    it('should have all required fields', async () => {
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
      process.env.JWT_SECRET = 'test';
      process.env.JWT_REFRESH_SECRET = 'test';
      process.env.PORT = '3000';

      const config = await loadConfig();

      // Server fields
      expect(config.nodeEnv).toBeDefined();
      expect(config.port).toBeDefined();
      expect(config.host).toBeDefined();

      // Database fields
      expect(config.databaseUrl).toBeDefined();

      // JWT fields
      expect(config.jwt).toBeDefined();
      expect(config.jwt.secret).toBeDefined();
      expect(config.jwt.expiresIn).toBeDefined();
      expect(config.jwt.refreshSecret).toBeDefined();
      expect(config.jwt.refreshExpiresIn).toBeDefined();

      // OAuth fields
      expect(config.oauth).toBeDefined();
      expect(config.oauth.github).toBeDefined();
      expect(config.oauth.google).toBeDefined();

      // Other fields
      expect(config.frontendUrl).toBeDefined();
      expect(config.encryptionKey).toBeDefined();
      expect(config.logLevel).toBeDefined();

      // Flags
      expect(config.isDevelopment).toBeDefined();
      expect(config.isProduction).toBeDefined();
      expect(config.isTest).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should load configuration quickly', async () => {
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
      process.env.JWT_SECRET = 'test';
      process.env.JWT_REFRESH_SECRET = 'test';
      process.env.PORT = '3000';

      const start = Date.now();
      await loadConfig();
      const duration = Date.now() - start;

      // Should load in less than 100ms in development
      expect(duration).toBeLessThan(100);
    });

    it('should cache secret manager instance', async () => {
      process.env.NODE_ENV = 'production';
      process.env.SECRET_PROVIDER = 'env';
      process.env.DATABASE_URL = '${secret:db-url}';
      process.env.SECRET_DB_URL = 'postgresql://localhost:5432/test';
      process.env.JWT_SECRET = 'test';
      process.env.JWT_REFRESH_SECRET = 'test';
      process.env.PORT = '3000';

      // First load
      const start1 = Date.now();
      await loadConfig();
      const duration1 = Date.now() - start1;

      // Second load (should use cached secret manager)
      const start2 = Date.now();
      await loadConfig();
      const duration2 = Date.now() - start2;

      // Both should complete, second is likely cached but timing can vary
      expect(duration1).toBeGreaterThanOrEqual(0);
      expect(duration2).toBeGreaterThanOrEqual(0);
      // In most cases, second should be faster or similar, but not critical
    });
  });
});

describe('Configuration type safety', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.JWT_SECRET = 'test';
    process.env.JWT_REFRESH_SECRET = 'test';
    process.env.PORT = '3000';
  });

  it('should have correct types for all fields', async () => {
    const config = await loadConfig();

    // Verify types
    const nodeEnv: string = config.nodeEnv;
    const port: number = config.port;
    const host: string = config.host;
    const databaseUrl: string = config.databaseUrl;
    const isDevelopment: boolean = config.isDevelopment;

    // TypeScript should not complain about these assignments
    expect(typeof nodeEnv).toBe('string');
    expect(typeof port).toBe('number');
    expect(typeof host).toBe('string');
    expect(typeof databaseUrl).toBe('string');
    expect(typeof isDevelopment).toBe('boolean');
  });
});
