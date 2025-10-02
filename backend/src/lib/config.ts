/**
 * Configuration - Enhanced with Secrets Management
 *
 * Centralized configuration management with support for:
 * - Environment variables
 * - Secret manager integration (AWS, GCP, Azure, Vault, K8s)
 * - Secret reference resolution (e.g., ${secret:database-password})
 * - Type-safe configuration interface
 * - Environment-specific overrides
 * - Validation on startup
 */
import dotenv from 'dotenv';
import { validateEnv } from './validate-env';
import { getSecretManager } from './secrets';
import { logger } from './logger';

// Load environment variables
dotenv.config();

// Validate required environment variables
validateEnv();

/**
 * Configuration interface
 */
export interface Config {
  // Server
  nodeEnv: string;
  port: number;
  host: string;

  // Database
  databaseUrl: string;
  databaseUrlTest?: string;

  // JWT
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };

  // OAuth
  oauth: {
    github: {
      clientId?: string;
      clientSecret?: string;
      callbackUrl: string;
    };
    google: {
      clientId?: string;
      clientSecret?: string;
      callbackUrl: string;
    };
  };

  // Frontend
  frontendUrl: string;

  // Docker
  dockerHost?: string;

  // Encryption
  encryptionKey: string;

  // Logging
  logLevel: string;

  // Security
  security: {
    enableSecurityHeaders: boolean;
    cspDirective?: string;
  };

  // Computed flags
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
}

/**
 * Resolve secret references in configuration values
 *
 * Supports the following formats:
 * - ${secret:secret-name} - Retrieve from secret manager
 * - ${env:ENV_VAR} - Retrieve from environment variable
 * - regular values - Use as-is
 *
 * @param value - Configuration value that may contain secret references
 * @returns Resolved value
 */
async function resolveSecretReferences(value: string): Promise<string> {
  if (!value || typeof value !== 'string') {
    return value;
  }

  // Pattern: ${secret:secret-name}
  const secretPattern = /\$\{secret:([^}]+)\}/g;
  // Pattern: ${env:ENV_VAR}
  const envPattern = /\$\{env:([^}]+)\}/g;

  let resolved = value;

  // Resolve secret references
  const secretMatches = [...value.matchAll(secretPattern)];
  if (secretMatches.length > 0) {
    const secretManager = await getSecretManager();

    for (const match of secretMatches) {
      const secretName = match[1];
      if (!secretName) continue;

      try {
        const secret = await secretManager.get(secretName);
        resolved = resolved.replace(match[0], secret.value);
        logger.debug({ secretName }, 'Resolved secret reference in configuration');
      } catch (error: unknown) {
        logger.error({ secretName, error }, 'Failed to resolve secret reference');
        throw new Error(`Failed to resolve secret reference: ${secretName}`);
      }
    }
  }

  // Resolve environment variable references
  const envMatches = [...resolved.matchAll(envPattern)];
  for (const match of envMatches) {
    const envVar = match[1];
    if (!envVar) {
      continue;
    }
    const envValue = process.env[envVar];
    if (!envValue) {
      throw new Error(`Environment variable not found: ${envVar}`);
    }
    resolved = resolved.replace(match[0], envValue);
  }

  return resolved;
}

/**
 * Load configuration with secret resolution
 *
 * This function should be called during application startup.
 * It resolves any secret references in the configuration.
 */
export async function loadConfig(): Promise<Config> {
  const startTime = Date.now();

  try {
    // Base configuration from environment variables
    const baseConfig: Config = {
      // Server
      nodeEnv: process.env.NODE_ENV || 'development',
      port: parseInt(process.env.PORT || '3000', 10),
      host: process.env.HOST || '0.0.0.0',

      // Database
      databaseUrl: process.env.DATABASE_URL!,
      databaseUrlTest: process.env.DATABASE_URL_TEST,

      // JWT
      jwt: {
        secret: process.env.JWT_SECRET!,
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        refreshSecret: process.env.JWT_REFRESH_SECRET!,
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      },

      // OAuth
      oauth: {
        github: {
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackUrl:
            process.env.GITHUB_CALLBACK_URL ||
            'http://localhost:3000/api/v1/auth/oauth/github/callback',
        },
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackUrl:
            process.env.GOOGLE_CALLBACK_URL ||
            'http://localhost:3000/api/v1/auth/oauth/google/callback',
        },
      },

      // Frontend
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

      // Docker
      dockerHost: process.env.DOCKER_HOST,

      // Encryption
      encryptionKey: process.env.ENCRYPTION_KEY || 'change-this-32-char-encryption-key',

      // Logging
      logLevel: process.env.LOG_LEVEL || 'info',

      // Security
      security: {
        enableSecurityHeaders: process.env.ENABLE_SECURITY_HEADERS !== 'false',
        cspDirective: process.env.CSP_DIRECTIVE,
      },

      // Computed flags
      isDevelopment: process.env.NODE_ENV === 'development',
      isProduction: process.env.NODE_ENV === 'production',
      isTest: process.env.NODE_ENV === 'test',
    };

    // Resolve secret references only in production
    if (baseConfig.isProduction && process.env.ENABLE_SECRET_MANAGER !== 'false') {
      logger.info('Resolving secret references in configuration...');

      // Resolve secrets in sensitive fields
      baseConfig.databaseUrl = await resolveSecretReferences(baseConfig.databaseUrl);
      if (baseConfig.databaseUrlTest) {
        baseConfig.databaseUrlTest = await resolveSecretReferences(baseConfig.databaseUrlTest);
      }

      baseConfig.jwt.secret = await resolveSecretReferences(baseConfig.jwt.secret);
      baseConfig.jwt.refreshSecret = await resolveSecretReferences(baseConfig.jwt.refreshSecret);

      if (baseConfig.oauth.github.clientSecret) {
        baseConfig.oauth.github.clientSecret = await resolveSecretReferences(
          baseConfig.oauth.github.clientSecret
        );
      }

      if (baseConfig.oauth.google.clientSecret) {
        baseConfig.oauth.google.clientSecret = await resolveSecretReferences(
          baseConfig.oauth.google.clientSecret
        );
      }

      baseConfig.encryptionKey = await resolveSecretReferences(baseConfig.encryptionKey);

      logger.info({ duration: Date.now() - startTime }, 'Secret references resolved successfully');
    }

    return baseConfig;
  } catch (error: unknown) {
    logger.error({ error, duration: Date.now() - startTime }, 'Failed to load configuration');
    throw error;
  }
}

// Synchronous config for backward compatibility (no secret resolution)
export const config: Config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',

  // Database
  databaseUrl: process.env.DATABASE_URL!,
  databaseUrlTest: process.env.DATABASE_URL_TEST,

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // OAuth
  oauth: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackUrl:
        process.env.GITHUB_CALLBACK_URL ||
        'http://localhost:3000/api/v1/auth/oauth/github/callback',
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl:
        process.env.GOOGLE_CALLBACK_URL ||
        'http://localhost:3000/api/v1/auth/oauth/google/callback',
    },
  },

  // Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Docker
  dockerHost: process.env.DOCKER_HOST,

  // Encryption
  encryptionKey: process.env.ENCRYPTION_KEY || 'change-this-32-char-encryption-key',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // Security
  security: {
    enableSecurityHeaders: process.env.ENABLE_SECURITY_HEADERS !== 'false',
    cspDirective: process.env.CSP_DIRECTIVE,
  },

  // Computed flags
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
};

export default config;
