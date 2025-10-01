/**
 * Unit Tests: AuthService - JWT Token Generation and Authentication
 * Tests JWT token generation, validation, and authentication flows
 * Task: Comprehensive JWT Authentication Testing
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthService } from '@/services/auth.service';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ValidationError, UnauthorizedError, ConflictError, NotFoundError } from '@/lib/errors';

/**
 * JWT Access Token Payload
 * Contains user identification and standard JWT claims
 */
interface JwtAccessPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * JWT Refresh Token Payload
 * Contains user identification and standard JWT claims
 */
interface JwtRefreshPayload {
  userId: string;
  iat: number;
  exp: number;
}

// Mock config module
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

// Mock Prisma Client
vi.mock('@/lib/db', () => ({
  getPrismaClient: () => mockPrisma,
}));

// Create mock Prisma instance
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  $connect: vi.fn(),
  $disconnect: vi.fn(),
} as unknown as PrismaClient;

describe('AuthService - JWT Token Generation', () => {
  let authService: AuthService;
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz',
    avatarUrl: null,
    timezone: 'UTC',
    locale: 'en-US',
    sshPublicKey: null,
    notificationSettings: {},
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    lastLoginAt: new Date('2025-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    authService = new AuthService(mockPrisma);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Token Generation - Success Cases', () => {
    /**
     * Test: Successful access token generation
     * Validates that access tokens are generated with correct payload structure
     */
    it('should generate access token with correct user info', async () => {
      // Arrange
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(null);
      mockPrisma.user.create = vi.fn().mockResolvedValue(mockUser);
      mockPrisma.user.update = vi.fn().mockResolvedValue(mockUser);

      // Act
      const result = await authService.register(
        'test@example.com',
        'SecurePass123!',
        'Test User'
      );

      // Assert
      expect(result.tokens.accessToken).toBeDefined();
      expect(typeof result.tokens.accessToken).toBe('string');
      expect(result.tokens.accessToken.split('.')).toHaveLength(3); // JWT has 3 parts

      // Decode token payload (without verification for testing)
      const payload = jwt.decode(result.tokens.accessToken) as JwtAccessPayload;
      expect(payload.userId).toBe('user-123');
      expect(payload.email).toBe('test@example.com');
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
    });

    /**
     * Test: Successful refresh token generation
     * Validates that refresh tokens are generated correctly
     */
    it('should generate refresh token', async () => {
      // Arrange
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(null);
      mockPrisma.user.create = vi.fn().mockResolvedValue(mockUser);
      mockPrisma.user.update = vi.fn().mockResolvedValue(mockUser);

      // Act
      const result = await authService.register(
        'test@example.com',
        'SecurePass123!',
        'Test User'
      );

      // Assert
      expect(result.tokens.refreshToken).toBeDefined();
      expect(typeof result.tokens.refreshToken).toBe('string');
      expect(result.tokens.refreshToken.split('.')).toHaveLength(3);
    });

    /**
     * Test: Access token expiration (15 minutes)
     * Validates that access tokens have correct expiration time
     */
    it('should set access token expiration to 15 minutes', async () => {
      // Arrange
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(null);
      mockPrisma.user.create = vi.fn().mockResolvedValue(mockUser);
      mockPrisma.user.update = vi.fn().mockResolvedValue(mockUser);

      // Act
      const result = await authService.register(
        'test@example.com',
        'SecurePass123!',
        'Test User'
      );

      // Assert - Decode and verify expiration
      const payload = jwt.decode(result.tokens.accessToken) as JwtAccessPayload;
      const expectedExp = payload.iat + 15 * 60; // 15 minutes in seconds
      expect(payload.exp).toBe(expectedExp);

      // Verify it expires in approximately 15 minutes from now
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = payload.exp - now;
      expect(expiresIn).toBeGreaterThan(14 * 60); // At least 14 minutes
      expect(expiresIn).toBeLessThanOrEqual(15 * 60); // At most 15 minutes
    });

    /**
     * Test: Refresh token expiration (7 days)
     * Validates that refresh tokens have correct expiration time
     */
    it('should set refresh token expiration to 7 days', async () => {
      // Arrange
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(null);
      mockPrisma.user.create = vi.fn().mockResolvedValue(mockUser);
      mockPrisma.user.update = vi.fn().mockResolvedValue(mockUser);

      // Act
      const result = await authService.register(
        'test@example.com',
        'SecurePass123!',
        'Test User'
      );

      // Assert - Decode and verify expiration
      const payload = jwt.decode(result.tokens.refreshToken) as JwtRefreshPayload;
      const expectedExp = payload.iat + 7 * 24 * 60 * 60; // 7 days in seconds
      expect(payload.exp).toBe(expectedExp);

      // Verify it expires in approximately 7 days from now
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = payload.exp - now;
      expect(expiresIn).toBeGreaterThan(6.9 * 24 * 60 * 60); // At least 6.9 days
      expect(expiresIn).toBeLessThanOrEqual(7 * 24 * 60 * 60); // At most 7 days
    });
  });

  describe('User Registration', () => {
    /**
     * Test: Successful registration
     */
    it('should register new user successfully', async () => {
      // Arrange
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(null);
      mockPrisma.user.create = vi.fn().mockResolvedValue(mockUser);
      mockPrisma.user.update = vi.fn().mockResolvedValue(mockUser);

      // Act
      const result = await authService.register(
        'test@example.com',
        'SecurePass123!',
        'Test User'
      );

      // Assert
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.displayName).toBe('Test User');
      expect(mockPrisma.user.create).toHaveBeenCalledOnce();
    });

    /**
     * Test: Email validation
     */
    it('should reject invalid email format', async () => {
      // Act & Assert
      await expect(
        authService.register('invalid-email', 'SecurePass123!', 'Test User')
      ).rejects.toThrow(ValidationError);
      await expect(
        authService.register('invalid-email', 'SecurePass123!', 'Test User')
      ).rejects.toThrow('Invalid email format');
    });

    /**
     * Test: Password length validation
     */
    it('should reject password shorter than 8 characters', async () => {
      // Act & Assert
      await expect(
        authService.register('test@example.com', 'short', 'Test User')
      ).rejects.toThrow(ValidationError);
      await expect(
        authService.register('test@example.com', 'short', 'Test User')
      ).rejects.toThrow('Password must be at least 8 characters');
    });

    /**
     * Test: Display name validation
     */
    it('should reject empty display name', async () => {
      // Act & Assert
      await expect(
        authService.register('test@example.com', 'SecurePass123!', '')
      ).rejects.toThrow(ValidationError);
      await expect(
        authService.register('test@example.com', 'SecurePass123!', '')
      ).rejects.toThrow('Display name must be between 1 and 100 characters');
    });

    /**
     * Test: Duplicate email
     */
    it('should reject duplicate email', async () => {
      // Arrange
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        authService.register('test@example.com', 'SecurePass123!', 'Test User')
      ).rejects.toThrow(ConflictError);
      await expect(
        authService.register('test@example.com', 'SecurePass123!', 'Test User')
      ).rejects.toThrow('Email already exists');
    });

    /**
     * Test: Password hashing
     */
    it('should hash password before storing', async () => {
      // Arrange
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(null);
      mockPrisma.user.create = vi.fn().mockResolvedValue(mockUser);
      mockPrisma.user.update = vi.fn().mockResolvedValue(mockUser);

      // Act
      await authService.register('test@example.com', 'SecurePass123!', 'Test User');

      // Assert
      const createCall = mockPrisma.user.create.mock.calls[0][0] as any;
      expect(createCall.data.passwordHash).toBeDefined();
      expect(createCall.data.passwordHash).not.toBe('SecurePass123!'); // Should be hashed
    });
  });

  describe('User Login', () => {
    /**
     * Test: Successful login
     */
    it('should login with valid credentials', async () => {
      // Arrange
      const hashedPassword = await bcrypt.hash('SecurePass123!', 10);
      const userWithPassword = { ...mockUser, passwordHash: hashedPassword };
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(userWithPassword);
      mockPrisma.user.update = vi.fn().mockResolvedValue(userWithPassword);

      // Act
      const result = await authService.login('test@example.com', 'SecurePass123!');

      // Assert
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
    });

    /**
     * Test: Invalid email
     */
    it('should reject invalid email', async () => {
      // Arrange
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(
        authService.login('nonexistent@example.com', 'SecurePass123!')
      ).rejects.toThrow(UnauthorizedError);
      await expect(
        authService.login('nonexistent@example.com', 'SecurePass123!')
      ).rejects.toThrow('Invalid credentials');
    });

    /**
     * Test: Invalid password
     */
    it('should reject invalid password', async () => {
      // Arrange
      const hashedPassword = await bcrypt.hash('CorrectPassword123!', 10);
      const userWithPassword = { ...mockUser, passwordHash: hashedPassword };
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(userWithPassword);

      // Act & Assert
      await expect(
        authService.login('test@example.com', 'WrongPassword123!')
      ).rejects.toThrow(UnauthorizedError);
      await expect(
        authService.login('test@example.com', 'WrongPassword123!')
      ).rejects.toThrow('Invalid credentials');
    });

    /**
     * Test: Missing credentials
     */
    it('should reject missing email or password', async () => {
      // Act & Assert
      await expect(
        authService.login('', 'SecurePass123!')
      ).rejects.toThrow(ValidationError);
      await expect(
        authService.login('test@example.com', '')
      ).rejects.toThrow(ValidationError);
    });

    /**
     * Test: Last login timestamp update
     */
    it('should update lastLoginAt on successful login', async () => {
      // Arrange
      const hashedPassword = await bcrypt.hash('SecurePass123!', 10);
      const userWithPassword = { ...mockUser, passwordHash: hashedPassword };
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(userWithPassword);
      mockPrisma.user.update = vi.fn().mockResolvedValue(userWithPassword);

      // Act
      await authService.login('test@example.com', 'SecurePass123!');

      // Assert
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { lastLoginAt: expect.any(Date) },
      });
    });
  });

  describe('Token Verification', () => {
    /**
     * Test: Valid token verification
     */
    it('should verify valid token', async () => {
      // Arrange - Create a valid token
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(null);
      mockPrisma.user.create = vi.fn().mockResolvedValue(mockUser);
      mockPrisma.user.update = vi.fn().mockResolvedValue(mockUser);
      const { tokens } = await authService.register(
        'test@example.com',
        'SecurePass123!',
        'Test User'
      );

      // Act
      const payload = authService.verifyToken(tokens.accessToken);

      // Assert
      expect(payload.userId).toBe('user-123');
      expect(payload.email).toBe('test@example.com');
    });

    /**
     * Test: Invalid token format
     */
    it('should reject invalid token format', () => {
      // Act & Assert
      expect(() => authService.verifyToken('invalid-token')).toThrow(UnauthorizedError);
      expect(() => authService.verifyToken('invalid-token')).toThrow('Invalid token');
    });

    /**
     * Test: Expired token
     */
    it('should reject expired token', () => {
      // Arrange - Create an expired token using real JWT library
      const expiredPayload = {
        userId: 'user-123',
        email: 'test@example.com',
      };
      const expiredToken = jwt.sign(expiredPayload, 'test-secret-key', { expiresIn: '-1h' });

      // Act & Assert
      expect(() => authService.verifyToken(expiredToken)).toThrow(UnauthorizedError);
      // Token expired error is thrown by JWT library
    });

    /**
     * Test: Bearer prefix handling
     */
    it('should handle Bearer prefix in token', async () => {
      // Arrange
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(null);
      mockPrisma.user.create = vi.fn().mockResolvedValue(mockUser);
      mockPrisma.user.update = vi.fn().mockResolvedValue(mockUser);
      const { tokens } = await authService.register(
        'test@example.com',
        'SecurePass123!',
        'Test User'
      );

      // Act
      const payload = authService.verifyToken(`Bearer ${tokens.accessToken}`);

      // Assert
      expect(payload.userId).toBe('user-123');
      expect(payload.email).toBe('test@example.com');
    });
  });

  describe('Token Refresh', () => {
    /**
     * Test: Successful token refresh
     */
    it('should refresh access token with valid refresh token', async () => {
      // Arrange
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(null);
      mockPrisma.user.create = vi.fn().mockResolvedValue(mockUser);
      mockPrisma.user.update = vi.fn().mockResolvedValue(mockUser);
      const { tokens } = await authService.register(
        'test@example.com',
        'SecurePass123!',
        'Test User'
      );

      // Update mock to return user for refresh
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(mockUser);

      // Act
      const result = await authService.refreshToken(tokens.refreshToken);

      // Assert
      expect(result.tokens.accessToken).toBeDefined();
      expect(typeof result.tokens.accessToken).toBe('string');
      expect(result.tokens.accessToken.split('.')).toHaveLength(3);

      // Verify the new token is valid and contains correct user info
      const payload = jwt.decode(result.tokens.accessToken) as JwtAccessPayload;
      expect(payload.userId).toBe('user-123');
      expect(payload.email).toBe('test@example.com');
    });

    /**
     * Test: Invalid refresh token
     */
    it('should reject invalid refresh token', async () => {
      // Act & Assert
      await expect(
        authService.refreshToken('invalid-token')
      ).rejects.toThrow(UnauthorizedError);
      // Error message varies based on JWT verification failure
    });

    /**
     * Test: Refresh token for non-existent user
     */
    it('should reject refresh token for deleted user', async () => {
      // Arrange
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(null);
      mockPrisma.user.create = vi.fn().mockResolvedValue(mockUser);
      mockPrisma.user.update = vi.fn().mockResolvedValue(mockUser);
      const { tokens } = await authService.register(
        'test@example.com',
        'SecurePass123!',
        'Test User'
      );

      // User gets deleted
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(
        authService.refreshToken(tokens.refreshToken)
      ).rejects.toThrow(UnauthorizedError);
      await expect(
        authService.refreshToken(tokens.refreshToken)
      ).rejects.toThrow('User not found');
    });
  });

  describe('OAuth Authentication', () => {
    /**
     * Test: New user via OAuth
     */
    it('should create new user from OAuth profile', async () => {
      // Arrange
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(null);
      mockPrisma.user.create = vi.fn().mockResolvedValue(mockUser);
      mockPrisma.user.update = vi.fn().mockResolvedValue(mockUser);

      // Act
      const result = await authService.handleOAuth('github', {
        id: 'github-123',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
      });

      // Assert
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(mockPrisma.user.create).toHaveBeenCalledOnce();
    });

    /**
     * Test: Existing user via OAuth
     */
    it('should update existing user from OAuth profile', async () => {
      // Arrange
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(mockUser);
      mockPrisma.user.update = vi.fn().mockResolvedValue({
        ...mockUser,
        displayName: 'Updated Name',
      });

      // Act
      const result = await authService.handleOAuth('github', {
        id: 'github-123',
        email: 'test@example.com',
        displayName: 'Updated Name',
        avatarUrl: 'https://example.com/new-avatar.jpg',
      });

      // Assert
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });
  });

  describe('Get User By ID', () => {
    /**
     * Test: Successful user retrieval
     */
    it('should get user by ID', async () => {
      // Arrange
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(mockUser);

      // Act
      const user = await authService.getUserById('user-123');

      // Assert
      expect(user.id).toBe('user-123');
      expect(user.email).toBe('test@example.com');
      expect(user).not.toHaveProperty('passwordHash'); // Should not include password
    });

    /**
     * Test: Non-existent user
     */
    it('should throw NotFoundError for non-existent user', async () => {
      // Arrange
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(authService.getUserById('non-existent')).rejects.toThrow(NotFoundError);
      await expect(authService.getUserById('non-existent')).rejects.toThrow('User not found');
    });

    /**
     * Test: Password hash exclusion
     */
    it('should not include passwordHash in user DTO', async () => {
      // Arrange
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(mockUser);

      // Act
      const user = await authService.getUserById('user-123');

      // Assert
      expect(user).not.toHaveProperty('passwordHash');
      expect(Object.keys(user)).toEqual([
        'id',
        'email',
        'displayName',
        'avatarUrl',
        'timezone',
        'locale',
        'sshPublicKey',
        'notificationSettings',
        'createdAt',
        'updatedAt',
        'lastLoginAt',
      ]);
    });
  });
});
