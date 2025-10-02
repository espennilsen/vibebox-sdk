/**
 * Security Middleware Tests
 * Comprehensive tests for security headers, sanitization, and CORS
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FastifyRequest, FastifyReply } from 'fastify';
import {
  securityHeaders,
  sanitize,
  getAllowedOrigins,
  isOriginAllowed,
  securityPresets,
} from '@/api/middleware/security';

// Mock config
vi.mock('@/lib/config', () => ({
  config: {
    frontendUrl: 'http://localhost:5173',
    isDevelopment: true,
    isProduction: false,
    security: {
      corsAllowedOrigins: ['http://localhost:3000', 'https://example.com'],
      enableHsts: false,
      enableSecurityHeaders: true,
    },
  },
}));

describe('Security Headers Middleware', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let headers: Record<string, string>;

  beforeEach(() => {
    headers = {};
    mockRequest = {};
    mockReply = {
      header: vi.fn((key: string, value: string | number) => {
        headers[key] = String(value);
        return mockReply as FastifyReply;
      }),
      removeHeader: vi.fn((key: string) => {
        delete headers[key];
        return mockReply as FastifyReply;
      }),
    };
  });

  it('should apply default security headers', async () => {
    const middleware = securityHeaders();
    await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(headers['Content-Security-Policy']).toBeDefined();
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-XSS-Protection']).toBe('1; mode=block');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['Permissions-Policy']).toBeDefined();
  });

  it('should apply HSTS header when enabled', async () => {
    const middleware = securityHeaders({ hsts: true, hstsMaxAge: 31536000 });
    await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(headers['Strict-Transport-Security']).toBe(
      'max-age=31536000; includeSubDomains; preload'
    );
  });

  it('should not apply HSTS header when disabled', async () => {
    const middleware = securityHeaders({ hsts: false });
    await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(headers['Strict-Transport-Security']).toBeUndefined();
  });

  it('should use custom CSP directive', async () => {
    const customCSP = "default-src 'self'; script-src 'none';";
    const middleware = securityHeaders({ contentSecurityPolicy: customCSP });
    await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(headers['Content-Security-Policy']).toBe(customCSP);
  });

  it('should remove X-Powered-By header', async () => {
    const middleware = securityHeaders();
    await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(mockReply.removeHeader).toHaveBeenCalledWith('X-Powered-By');
  });

  it('should apply production preset correctly', async () => {
    const middleware = securityPresets.production;
    await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(headers['Strict-Transport-Security']).toContain('max-age=63072000');
    expect(headers['X-Frame-Options']).toBe('DENY');
  });

  it('should apply development preset correctly', async () => {
    const middleware = securityPresets.development;
    await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(headers['Strict-Transport-Security']).toBeUndefined();
    expect(headers['Content-Security-Policy']).toBeUndefined();
  });

  it('should apply API preset correctly', async () => {
    const middleware = securityPresets.api;
    await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Content-Security-Policy']).toContain("default-src 'none'");
  });
});

describe('Input Sanitization', () => {
  describe('sanitize.string', () => {
    it('should remove null bytes', () => {
      expect(sanitize.string('test\0value')).toBe('testvalue');
    });

    it('should remove control characters', () => {
      expect(sanitize.string('test\x00\x01\x1Fvalue')).toBe('testvalue');
    });

    it('should trim whitespace', () => {
      expect(sanitize.string('  test value  ')).toBe('test value');
    });

    it('should preserve newlines and tabs', () => {
      expect(sanitize.string('test\nvalue\tdata')).toBe('test\nvalue\tdata');
    });

    it('should handle non-string input', () => {
      expect(sanitize.string(123 as unknown as string)).toBe('');
    });
  });

  describe('sanitize.html', () => {
    it('should remove HTML tags', () => {
      expect(sanitize.html('<script>alert("xss")</script>')).toBe('alert("xss")');
    });

    it('should remove complex HTML structures', () => {
      expect(sanitize.html('<div><p>Test</p><span>Value</span></div>')).toBe('TestValue');
    });

    it('should decode HTML entities', () => {
      expect(sanitize.html('&lt;test&gt;')).toBe('<test>');
      expect(sanitize.html('&amp;&quot;&#x27;')).toBe('&"\'');
    });

    it('should handle non-string input', () => {
      expect(sanitize.html(null as unknown as string)).toBe('');
    });
  });

  describe('sanitize.email', () => {
    it('should lowercase email', () => {
      expect(sanitize.email('Test@Example.COM')).toBe('test@example.com');
    });

    it('should trim whitespace', () => {
      expect(sanitize.email('  test@example.com  ')).toBe('test@example.com');
    });

    it('should handle non-string input', () => {
      expect(sanitize.email(undefined as unknown as string)).toBe('');
    });
  });

  describe('sanitize.url', () => {
    it('should accept valid HTTPS URLs', () => {
      const url = 'https://example.com/path';
      expect(sanitize.url(url)).toBe(url);
    });

    it('should accept valid HTTP URLs', () => {
      const url = 'http://example.com/path';
      expect(sanitize.url(url)).toBe(url);
    });

    it('should reject invalid URLs', () => {
      expect(sanitize.url('not-a-url')).toBe('');
    });

    it('should reject dangerous protocols', () => {
      expect(sanitize.url('javascript:alert(1)')).toBe('');
      expect(sanitize.url('data:text/html,<script>alert(1)</script>')).toBe('');
      expect(sanitize.url('file:///etc/passwd')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(sanitize.url(123 as unknown as string)).toBe('');
    });
  });

  describe('sanitize.filename', () => {
    it('should remove path separators', () => {
      expect(sanitize.filename('../../../etc/passwd')).toBe('etcpasswd');
      expect(sanitize.filename('..\\..\\windows\\system32')).toBe('windowssystem32');
    });

    it('should remove dangerous characters', () => {
      expect(sanitize.filename('file<>:"|?*.txt')).toBe('file.txt');
    });

    it('should replace spaces with underscores', () => {
      expect(sanitize.filename('my file name.txt')).toBe('my_file_name.txt');
    });

    it('should remove null bytes', () => {
      expect(sanitize.filename('test\0file.txt')).toBe('testfile.txt');
    });

    it('should handle non-string input', () => {
      expect(sanitize.filename([] as unknown as string)).toBe('');
    });
  });

  describe('sanitize.sql', () => {
    it('should remove SQL special characters', () => {
      expect(sanitize.sql("'; DROP TABLE users; --")).toBe(' DROP TABLE users -');
    });

    it('should remove quotes and semicolons', () => {
      expect(sanitize.sql('test"value\'data;')).toBe('testvaluedata');
    });

    it('should handle non-string input', () => {
      expect(sanitize.sql(null as unknown as string)).toBe('');
    });
  });

  describe('sanitize.object', () => {
    it('should sanitize all string values in object', () => {
      const input = {
        name: '  test  ',
        email: 'Test@Example.COM',
        description: 'text\x00value',
      };
      const result = sanitize.object(input);
      expect(result.name).toBe('test');
      expect(result.email).toBe('Test@Example.COM'); // Uses default string sanitizer
      expect(result.description).toBe('textvalue');
    });

    it('should sanitize nested objects', () => {
      const input = {
        user: {
          name: '  test  ',
          data: '\x00value',
        },
      };
      const result = sanitize.object(input);
      expect(result.user).toBeDefined();
      expect((result.user as Record<string, unknown>).name).toBe('test');
      expect((result.user as Record<string, unknown>).data).toBe('value');
    });

    it('should sanitize arrays of strings', () => {
      const input = {
        tags: ['  tag1  ', 'tag2\x00', '  tag3  '],
      };
      const result = sanitize.object(input);
      expect(result.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should preserve non-string values', () => {
      const input = {
        name: 'test',
        age: 25,
        active: true,
        created: new Date(),
      };
      const result = sanitize.object(input);
      expect(result.age).toBe(25);
      expect(result.active).toBe(true);
      expect(result.created).toEqual(input.created);
    });

    it('should apply custom sanitizer', () => {
      const input = {
        email: 'Test@Example.COM',
      };
      const result = sanitize.object(input, sanitize.email);
      expect(result.email).toBe('test@example.com');
    });
  });
});

describe('CORS Origin Validation', () => {
  it('should allow configured origins', () => {
    expect(isOriginAllowed('http://localhost:5173', ['http://localhost:5173'])).toBe(true);
    expect(isOriginAllowed('https://example.com', ['https://example.com'])).toBe(true);
  });

  it('should reject non-configured origins', () => {
    expect(isOriginAllowed('https://evil.com', ['https://example.com'])).toBe(false);
  });

  it('should allow requests with no origin header', () => {
    expect(isOriginAllowed('', ['https://example.com'])).toBe(true);
  });

  it('should support wildcard patterns', () => {
    expect(isOriginAllowed('https://app.example.com', ['https://*.example.com'])).toBe(true);
    expect(isOriginAllowed('https://api.example.com', ['https://*.example.com'])).toBe(true);
    expect(isOriginAllowed('https://example.com', ['https://*.example.com'])).toBe(false);
  });

  it('should support multiple allowed origins', () => {
    const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173', 'https://example.com'];
    expect(isOriginAllowed('http://localhost:3000', allowedOrigins)).toBe(true);
    expect(isOriginAllowed('http://localhost:5173', allowedOrigins)).toBe(true);
    expect(isOriginAllowed('https://example.com', allowedOrigins)).toBe(true);
    expect(isOriginAllowed('https://evil.com', allowedOrigins)).toBe(false);
  });

  it('should get allowed origins from config', () => {
    const origins = getAllowedOrigins();
    expect(origins).toContain('http://localhost:5173');
    expect(origins.length).toBeGreaterThan(0);
  });
});
