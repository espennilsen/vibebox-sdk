/**
 * WebSocket Authentication Tests
 * Tests JWT token verification for WebSocket connections
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { verifyWebSocketToken } from '@/lib/websocket-auth';
import { UnauthorizedError } from '@/lib/errors';

describe('WebSocket Authentication', () => {
  let mockFastify: FastifyInstance;

  beforeEach(() => {
    // Create mock Fastify instance with JWT plugin
    mockFastify = {
      jwt: {
        verify: vi.fn(),
      },
    } as unknown as FastifyInstance;
  });

  describe('verifyWebSocketToken', () => {
    it('should successfully verify valid JWT token', () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'test@vibebox.dev',
      };

      vi.mocked(mockFastify.jwt.verify).mockReturnValue(mockPayload);

      const result = verifyWebSocketToken(mockFastify, 'valid-token');

      expect(result).toEqual(mockPayload);
      expect(mockFastify.jwt.verify).toHaveBeenCalledWith('valid-token');
    });

    it('should throw UnauthorizedError when token is missing', () => {
      expect(() => verifyWebSocketToken(mockFastify, undefined)).toThrow(
        new UnauthorizedError('Authentication token is required')
      );

      expect(mockFastify.jwt.verify).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError when token is empty string', () => {
      expect(() => verifyWebSocketToken(mockFastify, '')).toThrow(
        new UnauthorizedError('Authentication token is required')
      );

      expect(mockFastify.jwt.verify).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError when token verification fails', () => {
      vi.mocked(mockFastify.jwt.verify).mockImplementation(() => {
        throw new Error('Token expired');
      });

      expect(() => verifyWebSocketToken(mockFastify, 'expired-token')).toThrow(
        new UnauthorizedError('Invalid or expired token')
      );
    });

    it('should throw UnauthorizedError when payload is not an object', () => {
      vi.mocked(mockFastify.jwt.verify).mockReturnValue('invalid-payload' as never);

      expect(() => verifyWebSocketToken(mockFastify, 'token')).toThrow(
        new UnauthorizedError('Invalid token payload')
      );
    });

    it('should throw UnauthorizedError when userId is missing from payload', () => {
      vi.mocked(mockFastify.jwt.verify).mockReturnValue({
        email: 'test@vibebox.dev',
      } as never);

      expect(() => verifyWebSocketToken(mockFastify, 'token')).toThrow(
        new UnauthorizedError('Invalid token payload')
      );
    });

    it('should throw UnauthorizedError when email is missing from payload', () => {
      vi.mocked(mockFastify.jwt.verify).mockReturnValue({
        userId: 'user-123',
      } as never);

      expect(() => verifyWebSocketToken(mockFastify, 'token')).toThrow(
        new UnauthorizedError('Invalid token payload')
      );
    });

    it('should throw UnauthorizedError when userId is empty', () => {
      vi.mocked(mockFastify.jwt.verify).mockReturnValue({
        userId: '',
        email: 'test@vibebox.dev',
      } as never);

      expect(() => verifyWebSocketToken(mockFastify, 'token')).toThrow(
        new UnauthorizedError('Invalid token payload structure')
      );
    });

    it('should throw UnauthorizedError when email is empty', () => {
      vi.mocked(mockFastify.jwt.verify).mockReturnValue({
        userId: 'user-123',
        email: '',
      } as never);

      expect(() => verifyWebSocketToken(mockFastify, 'token')).toThrow(
        new UnauthorizedError('Invalid token payload structure')
      );
    });

    it('should handle malformed JWT tokens', () => {
      vi.mocked(mockFastify.jwt.verify).mockImplementation(() => {
        throw new Error('Malformed JWT');
      });

      expect(() => verifyWebSocketToken(mockFastify, 'malformed.jwt.token')).toThrow(
        new UnauthorizedError('Invalid or expired token')
      );
    });

    it('should handle JWT signature verification failures', () => {
      vi.mocked(mockFastify.jwt.verify).mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      expect(() => verifyWebSocketToken(mockFastify, 'token-with-bad-signature')).toThrow(
        new UnauthorizedError('Invalid or expired token')
      );
    });
  });
});
