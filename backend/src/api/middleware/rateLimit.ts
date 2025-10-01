/**
 * Rate Limiting Middleware
 * Configuration for rate limiting across different route groups
 * Task: Phase 3.5 - API Layer
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
}

// Global rate limit store
const store = new RateLimitStore();

// Cleanup expired entries every minute
setInterval(() => store.cleanup(), 60000);

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
 * Pre-configured rate limits for different endpoint types
 */
export const rateLimits = {
  /**
   * Strict rate limit for authentication endpoints (5 requests per minute)
   */
  auth: createRateLimit({ max: 5, timeWindow: 60000 }),

  /**
   * Standard rate limit for API endpoints (100 requests per minute)
   */
  api: createRateLimit({ max: 100, timeWindow: 60000 }),

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
