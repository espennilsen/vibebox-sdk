/**
 * Security Middleware
 * Comprehensive security hardening with headers, CORS, and input sanitization
 * Task: Phase 3.5 - Security Hardening (#6)
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import { config } from '@/lib/config';

/**
 * Security headers configuration
 */
export interface SecurityHeadersConfig {
  /**
   * Content Security Policy directive
   * Helps prevent XSS attacks by controlling resource loading
   */
  contentSecurityPolicy?: string;

  /**
   * Enable HSTS (HTTP Strict Transport Security)
   * Forces HTTPS connections
   */
  hsts?: boolean;

  /**
   * HSTS max age in seconds (default: 1 year)
   */
  hstsMaxAge?: number;

  /**
   * Enable X-Frame-Options
   * Prevents clickjacking attacks
   */
  frameOptions?: 'DENY' | 'SAMEORIGIN';

  /**
   * Enable X-Content-Type-Options
   * Prevents MIME type sniffing
   */
  noSniff?: boolean;

  /**
   * Enable X-XSS-Protection
   * Enables browser XSS filtering
   */
  xssProtection?: boolean;

  /**
   * Referrer Policy
   * Controls referrer information
   */
  referrerPolicy?: string;

  /**
   * Permissions Policy (formerly Feature Policy)
   * Controls browser features
   */
  permissionsPolicy?: string;
}

/**
 * Default security headers configuration
 */
const DEFAULT_SECURITY_CONFIG: Required<SecurityHeadersConfig> = {
  contentSecurityPolicy:
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' ws: wss:; " +
    "frame-ancestors 'none';",
  hsts: true,
  hstsMaxAge: 31536000, // 1 year
  frameOptions: 'DENY',
  noSniff: true,
  xssProtection: true,
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy:
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
};

/**
 * Apply security headers to response
 *
 * @param config - Security headers configuration
 * @returns Middleware function that applies security headers
 *
 * @example
 * ```typescript
 * fastify.addHook('onRequest', securityHeaders());
 * ```
 */
export function securityHeaders(customConfig?: Partial<SecurityHeadersConfig>) {
  const config = { ...DEFAULT_SECURITY_CONFIG, ...customConfig };

  return async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Content Security Policy
    if (config.contentSecurityPolicy) {
      reply.header('Content-Security-Policy', config.contentSecurityPolicy);
    }

    // HTTP Strict Transport Security (HSTS)
    if (config.hsts) {
      reply.header(
        'Strict-Transport-Security',
        `max-age=${config.hstsMaxAge}; includeSubDomains; preload`
      );
    }

    // X-Frame-Options (clickjacking protection)
    if (config.frameOptions) {
      reply.header('X-Frame-Options', config.frameOptions);
    }

    // X-Content-Type-Options (MIME sniffing protection)
    if (config.noSniff) {
      reply.header('X-Content-Type-Options', 'nosniff');
    }

    // X-XSS-Protection (XSS filtering)
    if (config.xssProtection) {
      reply.header('X-XSS-Protection', '1; mode=block');
    }

    // Referrer Policy
    if (config.referrerPolicy) {
      reply.header('Referrer-Policy', config.referrerPolicy);
    }

    // Permissions Policy
    if (config.permissionsPolicy) {
      reply.header('Permissions-Policy', config.permissionsPolicy);
    }

    // Remove potentially dangerous headers
    reply.removeHeader('X-Powered-By');
  };
}

/**
 * Sanitization utilities interface
 */
interface SanitizationUtils {
  string(input: string): string;
  html(input: string): string;
  email(input: string): string;
  url(input: string): string;
  sql(input: string): string;
  filename(input: string): string;
  object<T extends Record<string, unknown>>(
    obj: T,
    sanitizer?: (input: string) => string
  ): T;
}

/**
 * Input sanitization utilities
 */
export const sanitize: SanitizationUtils = {
  /**
   * Sanitize string input to prevent XSS
   *
   * @param input - Raw string input
   * @returns Sanitized string
   */
  string(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return (
      input
        // Remove null bytes
        .replace(/\0/g, '')
        // Remove control characters except newline, carriage return, tab
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // Trim whitespace
        .trim()
    );
  },

  /**
   * Sanitize HTML input (aggressive - strips all HTML)
   *
   * @param input - Raw HTML string
   * @returns Text content only
   */
  html(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .trim();
  },

  /**
   * Sanitize email input
   *
   * @param input - Raw email string
   * @returns Sanitized email
   */
  email(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input.trim().toLowerCase();
  },

  /**
   * Sanitize URL input
   *
   * @param input - Raw URL string
   * @returns Sanitized URL or empty string if invalid
   */
  url(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    try {
      const url = new URL(input);
      // Only allow http and https protocols
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return '';
      }
      return url.toString();
    } catch {
      return '';
    }
  },

  /**
   * Sanitize SQL input (basic - prefer parameterized queries)
   *
   * @param input - Raw SQL input
   * @returns Sanitized string
   */
  sql(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input.replace(/['";\\]/g, '').replace(/--/g, '-'); // Remove SQL comment markers
  },

  /**
   * Sanitize filename
   *
   * @param input - Raw filename
   * @returns Safe filename
   */
  filename(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return (
      input
        // Remove path separators
        .replace(/[/\\]/g, '')
        // Remove path traversal attempts (../)
        .replace(/\.\./g, '')
        // Remove null bytes
        .replace(/\0/g, '')
        // Remove control characters
        .replace(/[\x00-\x1F\x7F]/g, '')
        // Replace spaces with underscores
        .replace(/\s+/g, '_')
        // Remove potentially dangerous characters
        .replace(/[<>:"|?*]/g, '')
        .trim()
    );
  },

  /**
   * Sanitize object by applying sanitization to all string values
   *
   * @param obj - Object to sanitize
   * @param sanitizer - Sanitization function to apply (default: string)
   * @returns Sanitized object
   */
  object<T extends Record<string, unknown>>(
    obj: T,
    sanitizer: (input: string) => string = sanitize.string
  ): T {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = sanitizer(value);
      } else if (Array.isArray(value)) {
        result[key] = value.map((item) => (typeof item === 'string' ? sanitizer(item) : item));
      } else if (value instanceof Date) {
        // Preserve Date objects
        result[key] = value;
      } else if (value && typeof value === 'object') {
        result[key] = sanitize.object(value as Record<string, unknown>, sanitizer);
      } else {
        result[key] = value;
      }
    }

    return result as T;
  },
};

/**
 * Get allowed CORS origins from environment
 *
 * @returns Array of allowed origins
 */
export function getAllowedOrigins(): string[] {
  const frontendUrl = config.frontendUrl;
  const additionalOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',').map((s) => s.trim()) || [];

  // Always include the configured frontend URL
  const origins = [frontendUrl, ...additionalOrigins].filter(Boolean);

  return origins;
}

/**
 * Validate origin against allowed origins
 *
 * @param origin - Origin to validate
 * @param allowedOrigins - List of allowed origins
 * @returns True if origin is allowed
 */
export function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  // Allow same-origin requests (no origin header)
  if (!origin) {
    return true;
  }

  // Check exact matches
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Check wildcard patterns (e.g., *.example.com)
  for (const allowed of allowedOrigins) {
    if (allowed.includes('*')) {
      const pattern = allowed.replace(/\./g, '\\.').replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(origin)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * CORS origin validator for Fastify
 *
 * @param origin - Origin header value
 * @param callback - Callback function
 */
export function corsOriginValidator(
  origin: string,
  callback: (error: Error | null, allow?: boolean) => void
): void {
  const allowedOrigins = getAllowedOrigins();

  if (isOriginAllowed(origin, allowedOrigins)) {
    callback(null, true);
  } else {
    callback(new Error('Not allowed by CORS'));
  }
}

/**
 * Security middleware presets
 */
export const securityPresets = {
  /**
   * Development preset - relaxed security for local development
   */
  development: securityHeaders({
    hsts: false, // No HSTS in development (not using HTTPS)
    contentSecurityPolicy: undefined, // Disable CSP for easier debugging
  }),

  /**
   * Production preset - strict security headers
   */
  production: securityHeaders({
    hsts: true,
    hstsMaxAge: 63072000, // 2 years
    frameOptions: 'DENY',
  }),

  /**
   * API preset - security headers optimized for API responses
   */
  api: securityHeaders({
    frameOptions: 'DENY',
    contentSecurityPolicy: "default-src 'none'; frame-ancestors 'none';",
  }),
};
