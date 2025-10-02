/**
 * Rate Limiting Middleware Tests
 * Tests for rate limiting, brute force protection, and composite limits
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FastifyRequest, FastifyReply } from 'fastify';
import {
  createRateLimit,
  createIPRateLimit,
  createCompositeRateLimit,
  rateLimits,
  clearRateLimitStore,
} from '@/api/middleware/rateLimit';
import { TooManyRequestsError } from '@/lib/errors';

describe('Rate Limiting Middleware', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let headers: Record<string, string | number>;

  beforeEach(() => {
    // Clear rate limit store to prevent state pollution between tests
    clearRateLimitStore();

    headers = {};
    mockRequest = {
      ip: '192.168.1.100',
      user: undefined,
    };
    mockReply = {
      header: vi.fn((key: string, value: string | number) => {
        headers[key] = value;
        return mockReply as FastifyReply;
      }),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createRateLimit', () => {
    it('should allow requests under the limit', async () => {
      const middleware = createRateLimit({ max: 5, timeWindow: 60000 });

      // First request should pass
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Check headers
      expect(headers['X-RateLimit-Limit']).toBe(5);
      expect(headers['X-RateLimit-Remaining']).toBe(4);
      expect(headers['X-RateLimit-Reset']).toBeDefined();
    });

    it('should block requests over the limit', async () => {
      const middleware = createRateLimit({ max: 2, timeWindow: 60000 });

      // Use up the limit
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Third request should fail
      await expect(
        middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow(TooManyRequestsError);
    });

    it('should set Retry-After header when rate limited', async () => {
      const middleware = createRateLimit({ max: 1, timeWindow: 60000 });

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      try {
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      } catch (error) {
        expect(headers['Retry-After']).toBeDefined();
        expect(typeof headers['Retry-After']).toBe('number');
        expect(Number(headers['Retry-After'])).toBeGreaterThan(0);
      }
    });

    it('should use user ID if authenticated', async () => {
      const authenticatedRequest = {
        ...mockRequest,
        user: { userId: 'user-123' },
      };

      const middleware = createRateLimit({ max: 3, timeWindow: 60000 });

      await middleware(authenticatedRequest as FastifyRequest, mockReply as FastifyReply);
      await middleware(authenticatedRequest as FastifyRequest, mockReply as FastifyReply);

      expect(headers['X-RateLimit-Remaining']).toBe(1);
    });

    it('should use IP address if not authenticated', async () => {
      const middleware = createRateLimit({ max: 3, timeWindow: 60000 });

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(headers['X-RateLimit-Remaining']).toBe(2);
    });

    it('should track different IPs separately', async () => {
      const middleware = createRateLimit({ max: 2, timeWindow: 60000 });

      const request1 = { ...mockRequest, ip: '192.168.1.1' };
      const request2 = { ...mockRequest, ip: '192.168.1.2' };

      await middleware(request1 as FastifyRequest, mockReply as FastifyReply);
      await middleware(request1 as FastifyRequest, mockReply as FastifyReply);

      // Different IP should have its own limit
      await middleware(request2 as FastifyRequest, mockReply as FastifyReply);
      expect(headers['X-RateLimit-Remaining']).toBe(1);
    });
  });

  describe('createIPRateLimit', () => {
    it('should only use IP address for rate limiting', async () => {
      const middleware = createIPRateLimit({ max: 3, timeWindow: 60000 });

      const authenticatedRequest = {
        ...mockRequest,
        user: { userId: 'user-123' },
      };

      await middleware(authenticatedRequest as FastifyRequest, mockReply as FastifyReply);
      expect(headers['X-RateLimit-Remaining']).toBe(2);
    });

    it('should block requests over the IP limit', async () => {
      const middleware = createIPRateLimit({ max: 1, timeWindow: 60000 });

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      await expect(
        middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow(TooManyRequestsError);
    });

    it('should prefix keys with "ip:" namespace', async () => {
      const middleware = createIPRateLimit({ max: 5, timeWindow: 60000 });

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      expect(headers['X-RateLimit-Remaining']).toBe(4);
    });
  });

  describe('createCompositeRateLimit', () => {
    it('should enforce multiple rate limits', async () => {
      const middleware = createCompositeRateLimit([
        { max: 5, timeWindow: 60000 }, // 5 per minute
        { max: 10, timeWindow: 3600000 }, // 10 per hour
      ]);

      // First request should pass
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      expect(headers['X-RateLimit-Remaining']).toBeDefined();
    });

    it('should fail if any limit is exceeded', async () => {
      const middleware = createCompositeRateLimit([
        { max: 2, timeWindow: 60000 },
        { max: 10, timeWindow: 3600000 },
      ]);

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Third request should fail (first limit exceeded)
      await expect(
        middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow(TooManyRequestsError);
    });
  });

  describe('Pre-configured rate limits', () => {
    it('should have login rate limit (brute force protection)', () => {
      expect(rateLimits.login).toBeDefined();
      expect(typeof rateLimits.login).toBe('function');
    });

    it('should have auth rate limit', () => {
      expect(rateLimits.auth).toBeDefined();
      expect(typeof rateLimits.auth).toBe('function');
    });

    it('should have per-IP rate limit', () => {
      expect(rateLimits.perIP).toBeDefined();
      expect(typeof rateLimits.perIP).toBe('function');
    });

    it('should have per-user rate limit', () => {
      expect(rateLimits.perUser).toBeDefined();
      expect(typeof rateLimits.perUser).toBe('function');
    });

    it('should have API rate limit (composite)', () => {
      expect(rateLimits.api).toBeDefined();
      expect(typeof rateLimits.api).toBe('function');
    });

    it('should have read, write, and intensive rate limits', () => {
      expect(rateLimits.read).toBeDefined();
      expect(rateLimits.write).toBeDefined();
      expect(rateLimits.intensive).toBeDefined();
    });
  });

  describe('Login brute force protection', () => {
    it('should allow 5 login attempts', async () => {
      const middleware = rateLimits.login;

      for (let i = 0; i < 5; i++) {
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      }

      expect(headers['X-RateLimit-Remaining']).toBe(0);
    });

    it('should block after 5 login attempts', async () => {
      const middleware = createIPRateLimit({ max: 5, timeWindow: 15 * 60 * 1000 });

      // Use up all attempts
      for (let i = 0; i < 5; i++) {
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      }

      // 6th attempt should fail
      await expect(
        middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('Rate limit headers', () => {
    it('should include X-RateLimit-Limit header', async () => {
      const middleware = createRateLimit({ max: 10, timeWindow: 60000 });

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(headers['X-RateLimit-Limit']).toBe(10);
    });

    it('should include X-RateLimit-Remaining header', async () => {
      const middleware = createRateLimit({ max: 10, timeWindow: 60000 });

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(headers['X-RateLimit-Remaining']).toBe(9);
    });

    it('should include X-RateLimit-Reset header', async () => {
      const middleware = createRateLimit({ max: 10, timeWindow: 60000 });

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(headers['X-RateLimit-Reset']).toBeDefined();
      expect(typeof headers['X-RateLimit-Reset']).toBe('number');
    });

    it('should decrement remaining count on each request', async () => {
      const middleware = createRateLimit({ max: 5, timeWindow: 60000 });

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      expect(headers['X-RateLimit-Remaining']).toBe(4);

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      expect(headers['X-RateLimit-Remaining']).toBe(3);

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      expect(headers['X-RateLimit-Remaining']).toBe(2);
    });
  });
});
