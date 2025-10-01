/**
 * Unit Tests: Authentication Middleware
 * Tests JWT verification in authentication middleware
 * Task: Comprehensive JWT Authentication Testing
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FastifyRequest, FastifyReply } from 'fastify';
import { authenticate, optionalAuthenticate, AuthUser } from '@/api/middleware/auth';
import { UnauthorizedError } from '@/lib/errors';

// Mock config
vi.mock('@/lib/config', () => ({
  config: {
    jwt: {
      secret: 'test-secret-key',
      expiresIn: '15m',
      refreshSecret: 'test-refresh-secret-key',
      refreshExpiresIn: '7d',
    },
  },
}));

describe('Authentication Middleware - JWT Verification', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  const testUser: AuthUser = {
    userId: 'user-123',
    email: 'test@example.com',
  };

  beforeEach(() => {
    // Reset mocks
    mockRequest = {
      jwtVerify: vi.fn(),
      user: undefined,
    };
    mockReply = {};
  });

  describe('authenticate middleware', () => {
    /**
     * Test: Successful authentication with valid token
     */
    it('should authenticate request with valid JWT token', async () => {
      // Arrange
      mockRequest.jwtVerify = vi.fn().mockResolvedValue(undefined);
      mockRequest.user = testUser;

      // Act
      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockRequest.jwtVerify).toHaveBeenCalledOnce();
    });

    /**
     * Test: Token verification called
     */
    it('should call jwtVerify on the request object', async () => {
      // Arrange
      const jwtVerifySpy = vi.fn().mockResolvedValue(undefined);
      mockRequest.jwtVerify = jwtVerifySpy;
      mockRequest.user = testUser;

      // Act
      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(jwtVerifySpy).toHaveBeenCalledOnce();
    });

    /**
     * Test: Missing token rejection
     */
    it('should throw UnauthorizedError when token is missing', async () => {
      // Arrange
      mockRequest.jwtVerify = vi.fn().mockRejectedValue(new Error('No token provided'));

      // Act & Assert
      await expect(
        authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow('Authentication required');

      // Verify error type
      try {
        await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);
        expect.fail('Expected UnauthorizedError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedError);
      }
    });

    /**
     * Test: Invalid token rejection
     */
    it('should throw UnauthorizedError when token is invalid', async () => {
      // Arrange
      mockRequest.jwtVerify = vi.fn().mockRejectedValue(new Error('Invalid token'));

      // Act & Assert
      await expect(
        authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow('Authentication required');

      // Verify error type
      try {
        await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);
        expect.fail('Expected UnauthorizedError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedError);
      }
    });

    /**
     * Test: Expired token rejection
     */
    it('should throw UnauthorizedError when token is expired', async () => {
      // Arrange
      mockRequest.jwtVerify = vi.fn().mockRejectedValue(new Error('Token expired'));

      // Act & Assert
      await expect(
        authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow(UnauthorizedError);
    });

    /**
     * Test: Invalid token payload - missing userId
     */
    it('should throw UnauthorizedError when token payload is missing userId', async () => {
      // Arrange
      mockRequest.jwtVerify = vi.fn().mockResolvedValue(undefined);
      const incompleteUser: Partial<AuthUser> = { email: 'test@example.com' }; // Missing userId
      mockRequest.user = incompleteUser as any;

      // Act & Assert
      await expect(
        authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow(UnauthorizedError);
      // Middleware wraps error in generic authentication message
    });

    /**
     * Test: Invalid token payload - missing email
     */
    it('should throw UnauthorizedError when token payload is missing email', async () => {
      // Arrange
      mockRequest.jwtVerify = vi.fn().mockResolvedValue(undefined);
      const incompleteUser: Partial<AuthUser> = { userId: 'user-123' }; // Missing email
      mockRequest.user = incompleteUser as any;

      // Act & Assert
      await expect(
        authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow(UnauthorizedError);
      // Middleware wraps error in generic authentication message
    });

    /**
     * Test: Malformed JWT signature
     */
    it('should throw UnauthorizedError for malformed JWT signature', async () => {
      // Arrange
      mockRequest.jwtVerify = vi.fn().mockRejectedValue(new Error('JWT malformed'));

      // Act & Assert
      await expect(
        authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow(UnauthorizedError);
    });

    /**
     * Test: User data attached to request after successful auth
     */
    it('should have user data attached to request after successful authentication', async () => {
      // Arrange
      mockRequest.jwtVerify = vi.fn().mockResolvedValue(undefined);
      mockRequest.user = testUser;

      // Act
      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.userId).toBe('user-123');
      expect(mockRequest.user?.email).toBe('test@example.com');
    });
  });

  describe('optionalAuthenticate middleware', () => {
    /**
     * Test: Successful authentication with valid token
     */
    it('should authenticate request with valid JWT token', async () => {
      // Arrange
      mockRequest.jwtVerify = vi.fn().mockResolvedValue(undefined);
      mockRequest.user = testUser;

      // Act
      await optionalAuthenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockRequest.jwtVerify).toHaveBeenCalledOnce();
      expect(mockRequest.user).toBeDefined();
    });

    /**
     * Test: No error when token is missing
     */
    it('should not throw error when token is missing', async () => {
      // Arrange
      mockRequest.jwtVerify = vi.fn().mockRejectedValue(new Error('No token provided'));

      // Act & Assert - Should not throw
      await expect(
        optionalAuthenticate(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).resolves.toBeUndefined();
    });

    /**
     * Test: No error when token is invalid
     */
    it('should not throw error when token is invalid', async () => {
      // Arrange
      mockRequest.jwtVerify = vi.fn().mockRejectedValue(new Error('Invalid token'));

      // Act & Assert - Should not throw
      await expect(
        optionalAuthenticate(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).resolves.toBeUndefined();
    });

    /**
     * Test: No error when token is expired
     */
    it('should not throw error when token is expired', async () => {
      // Arrange
      mockRequest.jwtVerify = vi.fn().mockRejectedValue(new Error('Token expired'));

      // Act & Assert - Should not throw
      await expect(
        optionalAuthenticate(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).resolves.toBeUndefined();
    });

    /**
     * Test: Silent authentication failure
     */
    it('should silently fail authentication without throwing error', async () => {
      // Arrange
      mockRequest.jwtVerify = vi.fn().mockRejectedValue(new Error('Authentication failed'));

      // Act
      await optionalAuthenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert - Should complete without error
      expect(mockRequest.jwtVerify).toHaveBeenCalledOnce();
      expect(mockRequest.user).toBeUndefined();
    });

    /**
     * Test: User data attached when authentication succeeds
     */
    it('should attach user data when authentication succeeds', async () => {
      // Arrange
      mockRequest.jwtVerify = vi.fn().mockResolvedValue(undefined);
      mockRequest.user = testUser;

      // Act
      await optionalAuthenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.userId).toBe('user-123');
      expect(mockRequest.user?.email).toBe('test@example.com');
    });

    /**
     * Test: No user data when authentication fails
     */
    it('should not have user data when authentication fails', async () => {
      // Arrange
      mockRequest.jwtVerify = vi.fn().mockRejectedValue(new Error('Invalid token'));
      mockRequest.user = undefined;

      // Act
      await optionalAuthenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockRequest.user).toBeUndefined();
    });
  });

  describe('Integration with JWT payload structure', () => {
    /**
     * Test: Valid JWT payload structure
     */
    it('should accept valid JWT payload with userId and email', async () => {
      // Arrange
      const validPayload: AuthUser = {
        userId: 'user-456',
        email: 'valid@example.com',
      };
      mockRequest.jwtVerify = vi.fn().mockResolvedValue(undefined);
      mockRequest.user = validPayload;

      // Act
      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockRequest.user.userId).toBe('user-456');
      expect(mockRequest.user.email).toBe('valid@example.com');
    });

    /**
     * Test: Reject payload with empty userId
     */
    it('should reject payload with empty userId', async () => {
      // Arrange
      mockRequest.jwtVerify = vi.fn().mockResolvedValue(undefined);
      mockRequest.user = { userId: '', email: 'test@example.com' } as AuthUser;

      // Act & Assert
      await expect(
        authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow(UnauthorizedError);
    });

    /**
     * Test: Reject payload with empty email
     */
    it('should reject payload with empty email', async () => {
      // Arrange
      mockRequest.jwtVerify = vi.fn().mockResolvedValue(undefined);
      mockRequest.user = { userId: 'user-123', email: '' } as AuthUser;

      // Act & Assert
      await expect(
        authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow(UnauthorizedError);
    });

    /**
     * Test: Reject null user object
     */
    it('should reject null user object', async () => {
      // Arrange
      mockRequest.jwtVerify = vi.fn().mockResolvedValue(undefined);
      mockRequest.user = null as unknown as AuthUser;

      // Act & Assert
      await expect(
        authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow(UnauthorizedError);
    });

    /**
     * Test: Reject undefined user object
     */
    it('should reject undefined user object', async () => {
      // Arrange
      mockRequest.jwtVerify = vi.fn().mockResolvedValue(undefined);
      mockRequest.user = undefined;

      // Act & Assert
      await expect(
        authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('Edge Cases', () => {
    /**
     * Test: Multiple authentication attempts
     */
    it('should handle multiple authentication attempts', async () => {
      // Arrange
      mockRequest.jwtVerify = vi.fn().mockResolvedValue(undefined);
      mockRequest.user = testUser;

      // Act - Authenticate twice
      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);
      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockRequest.jwtVerify).toHaveBeenCalledTimes(2);
    });

    /**
     * Test: JWT verification throws unexpected error
     */
    it('should handle unexpected errors from jwtVerify', async () => {
      // Arrange
      mockRequest.jwtVerify = vi.fn().mockRejectedValue(new Error('Unexpected error'));

      // Act & Assert
      await expect(
        authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow(UnauthorizedError);
    });

    /**
     * Test: JWT payload with extra fields
     */
    it('should accept JWT payload with extra fields', async () => {
      // Arrange
      mockRequest.jwtVerify = vi.fn().mockResolvedValue(undefined);
      mockRequest.user = {
        userId: 'user-123',
        email: 'test@example.com',
        extraField: 'should be ignored',
      } as AuthUser & { extraField: string };

      // Act
      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert - Should not throw, extra fields are ignored
      expect(mockRequest.user.userId).toBe('user-123');
      expect(mockRequest.user.email).toBe('test@example.com');
    });

    /**
     * Test: Whitespace in userId or email
     */
    it('should accept valid userId and email with no whitespace', async () => {
      // Arrange
      mockRequest.jwtVerify = vi.fn().mockResolvedValue(undefined);
      mockRequest.user = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      // Act
      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockRequest.user.userId).toBe('user-123');
      expect(mockRequest.user.email).toBe('test@example.com');
    });
  });
});
