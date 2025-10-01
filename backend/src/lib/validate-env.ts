/**
 * Environment Validation - Task T012
 * Validate required environment variables on startup
 */

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'PORT',
] as const;

const optionalEnvVars = [
  'NODE_ENV',
  'HOST',
  'JWT_EXPIRES_IN',
  'JWT_REFRESH_EXPIRES_IN',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'GITHUB_CALLBACK_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
  'FRONTEND_URL',
  'DOCKER_HOST',
  'ENCRYPTION_KEY',
  'LOG_LEVEL',
] as const;

export function validateEnv(): void {
  const missingVars: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missingVars.push(envVar);
    }
  }

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
        'Please check your .env file and ensure all required variables are set.'
    );
  }
}

export type RequiredEnvVar = (typeof requiredEnvVars)[number];
export type OptionalEnvVar = (typeof optionalEnvVars)[number];
export type EnvVar = RequiredEnvVar | OptionalEnvVar;
