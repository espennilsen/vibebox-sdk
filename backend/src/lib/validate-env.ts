/**
 * Environment Validation - Task T012
 * Comprehensive environment variable validation on startup
 * Validates presence, format, and security requirements
 */

const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'] as const;

/**
 * Environment validation error details
 */
export interface ValidationError {
  variable: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Validate DATABASE_URL format
 *
 * @param url - Database URL to validate
 * @returns Validation errors if any
 */
function validateDatabaseUrl(url: string): ValidationError[] {
  const errors: ValidationError[] = [];

  try {
    const parsed = new URL(url);

    // Check protocol
    if (!['postgresql:', 'postgres:'].includes(parsed.protocol)) {
      errors.push({
        variable: 'DATABASE_URL',
        message: `Invalid database protocol: ${parsed.protocol}. Expected postgresql: or postgres:`,
        severity: 'error',
      });
    }

    // Check for password
    if (!parsed.password && process.env.NODE_ENV === 'production') {
      errors.push({
        variable: 'DATABASE_URL',
        message: 'Database URL missing password in production environment',
        severity: 'error',
      });
    }

    // Warn about localhost in production
    if (
      process.env.NODE_ENV === 'production' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    ) {
      errors.push({
        variable: 'DATABASE_URL',
        message: 'Database URL points to localhost in production environment',
        severity: 'warning',
      });
    }
  } catch (error) {
    errors.push({
      variable: 'DATABASE_URL',
      message: `Invalid database URL format: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'error',
    });
  }

  return errors;
}

/**
 * Validate JWT secret strength
 *
 * @param secret - JWT secret to validate
 * @param varName - Environment variable name
 * @returns Validation errors if any
 */
function validateJwtSecret(secret: string, varName: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // Minimum length check
  if (secret.length < 32) {
    errors.push({
      variable: varName,
      message: `${varName} must be at least 32 characters long (current: ${secret.length})`,
      severity: 'error',
    });
  }

  // Check for weak/default secrets
  const weakSecrets = [
    'secret',
    'your-secret-key',
    'change-me',
    'default',
    'test',
    '12345678901234567890123456789012',
  ];

  if (weakSecrets.some((weak) => secret.toLowerCase().includes(weak))) {
    errors.push({
      variable: varName,
      message: `${varName} appears to be a weak or default secret. Please use a strong, random secret.`,
      severity: process.env.NODE_ENV === 'production' ? 'error' : 'warning',
    });
  }

  return errors;
}

/**
 * Validate encryption key
 *
 * @param key - Encryption key to validate
 * @returns Validation errors if any
 */
function validateEncryptionKey(key: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check length (must be 32 chars for AES-256)
  if (key.length !== 32) {
    errors.push({
      variable: 'ENCRYPTION_KEY',
      message: `ENCRYPTION_KEY must be exactly 32 characters for AES-256 (current: ${key.length})`,
      severity: 'error',
    });
  }

  // Check for default value
  if (key === 'change-this-32-char-encryption-key') {
    errors.push({
      variable: 'ENCRYPTION_KEY',
      message: 'ENCRYPTION_KEY is using the default value. Please change it immediately!',
      severity: process.env.NODE_ENV === 'production' ? 'error' : 'warning',
    });
  }

  return errors;
}

/**
 * Validate port number
 *
 * @param port - Port string to validate
 * @returns Validation errors if any
 */
function validatePort(port: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const portNum = parseInt(port, 10);

  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    errors.push({
      variable: 'PORT',
      message: `PORT must be a valid number between 1 and 65535 (current: ${port})`,
      severity: 'error',
    });
  }

  return errors;
}

/**
 * Validate all environment variables
 * Checks for presence, format, and security requirements
 *
 * @throws Error if critical validation errors are found
 */
export function validateEnv(): void {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Check for missing required variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      errors.push({
        variable: envVar,
        message: `Missing required environment variable: ${envVar}`,
        severity: 'error',
      });
    }
  }

  // If critical variables are missing, throw immediately
  if (errors.length > 0) {
    const errorMessage =
      'Environment validation failed:\n' +
      errors.map((e) => `  ❌ ${e.variable}: ${e.message}`).join('\n') +
      '\n\nPlease check your .env file and ensure all required variables are set.';
    throw new Error(errorMessage);
  }

  // Validate DATABASE_URL
  if (process.env.DATABASE_URL) {
    const dbErrors = validateDatabaseUrl(process.env.DATABASE_URL);
    errors.push(...dbErrors.filter((e) => e.severity === 'error'));
    warnings.push(...dbErrors.filter((e) => e.severity === 'warning'));
  }

  // Validate JWT secrets
  if (process.env.JWT_SECRET) {
    const jwtErrors = validateJwtSecret(process.env.JWT_SECRET, 'JWT_SECRET');
    errors.push(...jwtErrors.filter((e) => e.severity === 'error'));
    warnings.push(...jwtErrors.filter((e) => e.severity === 'warning'));
  }

  if (process.env.JWT_REFRESH_SECRET) {
    const refreshErrors = validateJwtSecret(process.env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET');
    errors.push(...refreshErrors.filter((e) => e.severity === 'error'));
    warnings.push(...refreshErrors.filter((e) => e.severity === 'warning'));
  }

  // Validate encryption key
  if (process.env.ENCRYPTION_KEY) {
    const encErrors = validateEncryptionKey(process.env.ENCRYPTION_KEY);
    errors.push(...encErrors.filter((e) => e.severity === 'error'));
    warnings.push(...encErrors.filter((e) => e.severity === 'warning'));
  }

  // Validate PORT
  if (process.env.PORT) {
    const portErrors = validatePort(process.env.PORT);
    errors.push(...portErrors.filter((e) => e.severity === 'error'));
    warnings.push(...portErrors.filter((e) => e.severity === 'warning'));
  }

  // Production-specific validations
  if (process.env.NODE_ENV === 'production') {
    // Ensure FRONTEND_URL is set
    if (!process.env.FRONTEND_URL) {
      warnings.push({
        variable: 'FRONTEND_URL',
        message: 'FRONTEND_URL not set in production. Using default may cause CORS issues.',
        severity: 'warning',
      });
    }

    // Ensure security headers are enabled
    if (process.env.ENABLE_SECURITY_HEADERS === 'false') {
      warnings.push({
        variable: 'ENABLE_SECURITY_HEADERS',
        message: 'Security headers are disabled in production. This is not recommended.',
        severity: 'warning',
      });
    }

    // Warn if LOG_LEVEL is debug in production
    if (process.env.LOG_LEVEL === 'debug') {
      warnings.push({
        variable: 'LOG_LEVEL',
        message: 'LOG_LEVEL is set to debug in production. This may expose sensitive information.',
        severity: 'warning',
      });
    }
  }

  // Log warnings
  if (warnings.length > 0) {
    console.warn('\n⚠️  Environment validation warnings:');
    for (const warning of warnings) {
      console.warn(`   ${warning.variable}: ${warning.message}`);
    }
    console.warn('');
  }

  // Throw if there are errors
  if (errors.length > 0) {
    const errorMessage =
      '\n❌ Environment validation failed:\n' +
      errors.map((e) => `   ${e.variable}: ${e.message}`).join('\n') +
      '\n\nPlease fix these issues before starting the application.\n';
    throw new Error(errorMessage);
  }

  // Success message (using console.log is acceptable for startup messages)
  if (warnings.length === 0) {
    // eslint-disable-next-line no-console
    console.log('✅ Environment validation passed');
  }
}

export type RequiredEnvVar = (typeof requiredEnvVars)[number];
export type OptionalEnvVar =
  | 'NODE_ENV'
  | 'HOST'
  | 'PORT'
  | 'JWT_EXPIRES_IN'
  | 'JWT_REFRESH_EXPIRES_IN'
  | 'GITHUB_CLIENT_ID'
  | 'GITHUB_CLIENT_SECRET'
  | 'GITHUB_CALLBACK_URL'
  | 'GOOGLE_CLIENT_ID'
  | 'GOOGLE_CLIENT_SECRET'
  | 'GOOGLE_CALLBACK_URL'
  | 'FRONTEND_URL'
  | 'DOCKER_HOST'
  | 'ENCRYPTION_KEY'
  | 'LOG_LEVEL';
export type EnvVar = RequiredEnvVar | OptionalEnvVar;
