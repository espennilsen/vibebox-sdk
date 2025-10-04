/**
 * CSRF Protection Middleware
 *
 * For JWT-based APIs, CSRF protection is primarily handled through:
 * 1. Bearer token authentication (tokens not automatically sent like cookies)
 * 2. CORS configuration (origin validation)
 * 3. Origin/Referer header validation for state-changing operations
 *
 * This middleware provides defense-in-depth by validating request origins
 * for state-changing operations (POST, PUT, PATCH, DELETE).
 *
 * Task: Security Hardening (#6)
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { ForbiddenError } from '@/lib/errors';
import { config } from '@/lib/config';

/**
 * Validate request origin for state-changing operations
 *
 * This provides CSRF protection by ensuring state-changing requests
 * originate from expected origins. For JWT-based APIs, this is a
 * defense-in-depth measure.
 *
 * @param request - Fastify request object
 * @param reply - Fastify reply object
 * @throws {ForbiddenError} If origin validation fails
 *
 * @example
 * ```typescript
 * // Apply to specific routes
 * fastify.post('/api/resource', { preHandler: csrfProtection }, handler);
 *
 * // Or apply globally to state-changing methods
 * fastify.addHook('onRequest', csrfProtection);
 * ```
 */
export function csrfProtection(request: FastifyRequest, _reply: FastifyReply): void {
  // Only validate state-changing methods
  const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!stateChangingMethods.includes(request.method)) {
    return;
  }

  // Skip validation for same-origin requests (no origin header)
  // These are typically server-to-server or same-origin requests
  const origin = request.headers.origin;
  const referer = request.headers.referer;

  // If neither origin nor referer is present, this might be:
  // 1. A same-origin request (browser may omit origin)
  // 2. A server-to-server API call
  // 3. A mobile app request
  // Allow these through as they're not subject to CSRF
  if (!origin && !referer) {
    return;
  }

  // Get allowed origins from configuration
  const allowedOrigins = getAllowedOrigins();

  // Validate origin header if present
  if (origin) {
    if (!isOriginAllowed(origin, allowedOrigins)) {
      throw new ForbiddenError('Invalid request origin');
    }
  }

  // Validate referer header if present
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;

      if (!isOriginAllowed(refererOrigin, allowedOrigins)) {
        throw new ForbiddenError('Invalid request referer');
      }
    } catch {
      // Invalid referer URL format
      throw new ForbiddenError('Invalid request referer');
    }
  }
}

/**
 * Get allowed origins from configuration
 *
 * @returns Array of allowed origins
 */
function getAllowedOrigins(): string[] {
  const frontendUrl = config.frontendUrl;
  const additionalOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',').map((s) => s.trim()) || [];

  // Always include the configured frontend URL
  const origins = [frontendUrl, ...additionalOrigins].filter(Boolean);

  return origins;
}

/**
 * Check if origin is in allowed list
 *
 * @param origin - Origin to validate
 * @param allowedOrigins - List of allowed origins
 * @returns True if origin is allowed
 */
function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
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
 * CSRF protection configuration options
 */
export interface CSRFProtectionOptions {
  /**
   * Additional allowed origins beyond config.frontendUrl
   */
  allowedOrigins?: string[];

  /**
   * Skip CSRF validation for specific paths
   */
  skipPaths?: string[];

  /**
   * Skip CSRF validation for API calls (no origin/referer header)
   * Default: true (allows server-to-server and mobile app requests)
   */
  allowApiCalls?: boolean;
}

/**
 * Create configurable CSRF protection middleware
 *
 * @param options - CSRF protection options
 * @returns CSRF protection middleware
 *
 * @example
 * ```typescript
 * const csrf = createCSRFProtection({
 *   skipPaths: ['/api/v1/webhooks'],
 *   allowedOrigins: ['https://admin.example.com']
 * });
 *
 * fastify.addHook('onRequest', csrf);
 * ```
 */
export function createCSRFProtection(options: CSRFProtectionOptions = {}) {
  return (request: FastifyRequest, _reply: FastifyReply): void => {
    // Skip if path is in skipPaths list
    if (options.skipPaths?.some((path) => request.url.startsWith(path))) {
      return;
    }

    // Only validate state-changing methods
    const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!stateChangingMethods.includes(request.method)) {
      return;
    }

    const origin = request.headers.origin;
    const referer = request.headers.referer;

    // Allow API calls without origin/referer (server-to-server, mobile apps)
    if (options.allowApiCalls !== false && !origin && !referer) {
      return;
    }

    // Get allowed origins (config + custom)
    const baseOrigins = getAllowedOrigins();
    const allowedOrigins = [...baseOrigins, ...(options.allowedOrigins || [])];

    // Validate origin
    if (origin && !isOriginAllowed(origin, allowedOrigins)) {
      throw new ForbiddenError('Invalid request origin');
    }

    // Validate referer
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;

        if (!isOriginAllowed(refererOrigin, allowedOrigins)) {
          throw new ForbiddenError('Invalid request referer');
        }
      } catch {
        throw new ForbiddenError('Invalid request referer');
      }
    }

    // If we get here with no origin/referer and allowApiCalls is false, reject
    if (options.allowApiCalls === false && !origin && !referer) {
      throw new ForbiddenError('Request origin required');
    }
  };
}
