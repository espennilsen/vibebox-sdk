/**
 * Rate Limiting Middleware
 * Configuration for rate limiting across different route groups with brute force protection
 * Task: Phase 3.5 - API Layer + Security Hardening
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import { TooManyRequestsError } from '@/lib/errors';

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  max: number; // Maximum requests
  timeWindow: number; // Time window in milliseconds
}

/**
 * Rate limit store for tracking requests
 */
class RateLimitStore {
  private store = new Map<string, { count: number; resetAt: number }>();

  /**
   * Check if request is allowed under rate limit
   *
   * @param key - Unique key for rate limiting (e.g., user ID or IP)
   * @param config - Rate limit configuration
   * @returns True if request is allowed
   */
  check(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const entry = this.store.get(key);

    // No entry or expired entry
    if (!entry || entry.resetAt < now) {
      this.store.set(key, {
        count: 1,
        resetAt: now + config.timeWindow,
      });
      return true;
    }

    // Under limit
    if (entry.count < config.max) {
      entry.count++;
      return true;
    }

    // Over limit
    return false;
  }

  /**
   * Get remaining requests for a key
   *
   * @param key - Unique key for rate limiting
   * @returns Remaining requests or null if no limit set
   */
  getRemaining(key: string, config: RateLimitConfig): number | null {
    const entry = this.store.get(key);
    if (!entry || entry.resetAt < Date.now()) {
      return config.max;
    }
    return Math.max(0, config.max - entry.count);
  }

  /**
   * Get reset time for a key
   *
   * @param key - Unique key for rate limiting
   * @returns Reset timestamp or null if no limit set
   */
  getResetAt(key: string): number | null {
    const entry = this.store.get(key);
    if (!entry || entry.resetAt < Date.now()) {
      return null;
    }
    return entry.resetAt;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt < now) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear all entries (useful for testing)
   */
  clear(): void {
    this.store.clear();
  }
}

// Global rate limit store
const store = new RateLimitStore();

// Cleanup expired entries every minute
setInterval(() => store.cleanup(), 60000);

/**
 * Clear rate limit store (for testing)
 */
export function clearRateLimitStore(): void {
  store.clear();
}

/**
 * Create rate limit middleware
 *
 * @param config - Rate limit configuration
 * @returns Rate limit middleware function
 *
 * @example
 * ```typescript
 * const authRateLimit = createRateLimit({ max: 5, timeWindow: 60000 });
 * fastify.post('/auth/login', { preHandler: authRateLimit }, handler);
 * ```
 */
export function createRateLimit(config: RateLimitConfig) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Use user ID if authenticated, otherwise use IP address
    const key = (request as { user?: { userId: string } }).user?.userId || request.ip || 'unknown';

    const allowed = store.check(key, config);

    // Add rate limit headers
    const remaining = store.getRemaining(key, config);
    const resetAt = store.getResetAt(key);

    reply.header('X-RateLimit-Limit', config.max);
    reply.header('X-RateLimit-Remaining', remaining ?? config.max);
    if (resetAt) {
      reply.header('X-RateLimit-Reset', Math.ceil(resetAt / 1000));
    }

    if (!allowed) {
      const retryAfter = resetAt ? Math.ceil((resetAt - Date.now()) / 1000) : 60;
      reply.header('Retry-After', retryAfter);
      throw new TooManyRequestsError('Rate limit exceeded. Please try again later.');
    }
  };
}

/**
 * Create IP-based rate limit (doesn't use user ID)
 *
 * @param config - Rate limit configuration
 * @returns Rate limit middleware that only uses IP address
 *
 * @example
 * ```typescript
 * const ipLimit = createIPRateLimit({ max: 100, timeWindow: 60000 });
 * ```
 */
export function createIPRateLimit(config: RateLimitConfig) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const key = `ip:${request.ip || 'unknown'}`;
    const allowed = store.check(key, config);

    // Add rate limit headers
    const remaining = store.getRemaining(key, config);
    const resetAt = store.getResetAt(key);

    reply.header('X-RateLimit-Limit', config.max);
    reply.header('X-RateLimit-Remaining', remaining ?? config.max);
    if (resetAt) {
      reply.header('X-RateLimit-Reset', Math.ceil(resetAt / 1000));
    }

    if (!allowed) {
      const retryAfter = resetAt ? Math.ceil((resetAt - Date.now()) / 1000) : 60;
      reply.header('Retry-After', retryAfter);
      throw new TooManyRequestsError('Rate limit exceeded. Please try again later.');
    }
  };
}

/**
 * Composite rate limit middleware that enforces multiple limits
 *
 * @param limits - Array of rate limit configurations to enforce
 * @returns Composite rate limit middleware
 *
 * @example
 * ```typescript
 * const dualLimit = createCompositeRateLimit([
 *   { max: 100, timeWindow: 60000 },  // 100/min
 *   { max: 1000, timeWindow: 3600000 } // 1000/hour
 * ]);
 * ```
 */
export function createCompositeRateLimit(limits: RateLimitConfig[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Validate limits array is not empty
    if (limits.length === 0) {
      throw new Error('At least one rate limit configuration is required');
    }

    // Use user ID if authenticated, otherwise use IP address
    const baseKey =
      (request as { user?: { userId: string } }).user?.userId || request.ip || 'unknown';

    let minRemaining = Infinity;
    let limitToReport = limits[0];
    let resetToReport: number | null = null;

    // Execute all rate limit checks with unique keys per config
    for (const config of limits) {
      const key = `${baseKey}:${config.timeWindow}`;
      const allowed = store.check(key, config);

      // Track the most restrictive limit
      const remaining = store.getRemaining(key, config);
      const resetAt = store.getResetAt(key);

      if (remaining !== null && remaining < minRemaining) {
        minRemaining = remaining;
        limitToReport = config;
        resetToReport = resetAt;
      }

      if (!allowed) {
        const retryAfter = resetAt ? Math.ceil((resetAt - Date.now()) / 1000) : 60;
        reply.header('Retry-After', retryAfter);
        throw new TooManyRequestsError('Rate limit exceeded. Please try again later.');
      }
    }

    // Set headers based on the most restrictive limit
    // limitToReport is guaranteed to be defined because we check limits.length > 0
    reply.header('X-RateLimit-Limit', limitToReport!.max);
    reply.header(
      'X-RateLimit-Remaining',
      minRemaining === Infinity ? limitToReport!.max : minRemaining
    );
    if (resetToReport) {
      reply.header('X-RateLimit-Reset', Math.ceil(resetToReport / 1000));
    }
  };
}

/**
 * Pre-configured rate limits for different endpoint types
 */
export const rateLimits = {
  /**
   * Strict rate limit for login endpoint (5 requests per 15 minutes)
   * Provides brute force protection
   */
  login: createIPRateLimit({ max: 5, timeWindow: 15 * 60 * 1000 }), // 15 minutes

  /**
   * Standard rate limit for authentication endpoints (5 requests per minute)
   */
  auth: createRateLimit({ max: 5, timeWindow: 60000 }),

  /**
   * Per-IP rate limit (100 requests per minute)
   * Applied globally to all endpoints
   */
  perIP: createIPRateLimit({ max: 100, timeWindow: 60000 }),

  /**
   * Per-user rate limit (1000 requests per hour)
   * Applied to authenticated endpoints
   */
  perUser: createRateLimit({ max: 1000, timeWindow: 3600000 }), // 1 hour

  /**
   * Combined per-IP and per-user limits for API endpoints
   * 100 req/min per IP, 1000 req/hour per user
   */
  api: createCompositeRateLimit([
    { max: 100, timeWindow: 60000 }, // Per IP/user per minute
    { max: 1000, timeWindow: 3600000 }, // Per user per hour
  ]),

  /**
   * Relaxed rate limit for read operations (200 requests per minute)
   */
  read: createRateLimit({ max: 200, timeWindow: 60000 }),

  /**
   * Strict rate limit for write operations (50 requests per minute)
   */
  write: createRateLimit({ max: 50, timeWindow: 60000 }),

  /**
   * Very strict rate limit for resource-intensive operations (10 requests per minute)
   */
  intensive: createRateLimit({ max: 10, timeWindow: 60000 }),
};
