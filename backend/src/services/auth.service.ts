/**
 * AuthService - Authentication and Authorization Service
 * Handles user authentication, JWT token generation, and OAuth integration
 * Tasks: T067, T027-T030
 */
import { PrismaClient } from '@prisma/client';
import type { User } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { getPrismaClient } from '@/lib/db';
import { ConflictError, UnauthorizedError, ValidationError, NotFoundError } from '@/lib/errors';
import { config } from '@/lib/config';

/**
 * JWT token payload structure
 */
export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Authentication token structure
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Authentication response structure
 */
export interface AuthResponse {
  tokens: AuthTokens;
  user: UserDTO;
}

/**
 * User Data Transfer Object (without sensitive data)
 */
export interface UserDTO {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  timezone: string;
  locale: string;
  sshPublicKey?: string | null;
  notificationSettings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date | null;
}

/**
 * OAuth provider types
 */
export type OAuthProvider = 'github' | 'google';

/**
 * OAuth profile data
 */
export interface OAuthProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

/**
 * AuthService - Handles all authentication operations
 *
 * Provides methods for user registration, login, token management,
 * and OAuth integration. Uses bcrypt for password hashing and JWT
 * for token-based authentication.
 */
export class AuthService {
  private readonly SALT_ROUNDS = 10;
  private readonly ACCESS_TOKEN_EXPIRY = '15m';
  private readonly REFRESH_TOKEN_EXPIRY = '7d';

  /**
   * Creates a new AuthService instance
   *
   * @param prisma - Prisma client instance for database access
   */
  constructor(private prisma: PrismaClient = getPrismaClient()) {}

  /**
   * Register a new user with email and password
   *
   * Validates input, checks for existing email, hashes password,
   * and creates user record in database.
   *
   * @param email - User's email address
   * @param password - User's password (plain text, will be hashed)
   * @param displayName - User's display name
   * @returns Authentication response with tokens and user data
   * @throws {ValidationError} If email format is invalid or password is too short
   * @throws {ConflictError} If email already exists
   *
   * @example
   * ```typescript
   * const authService = new AuthService();
   * const result = await authService.register(
   *   'user@example.com',
   *   'SecurePass123!',
   *   'John Doe'
   * );
   * console.log(result.accessToken); // JWT token
   * ```
   */
  async register(email: string, password: string, displayName: string): Promise<AuthResponse> {
    // Validate email format
    if (!this.isValidEmail(email)) {
      throw new ValidationError('Invalid email format');
    }

    // Validate password length
    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    // Validate displayName length
    if (displayName.length === 0 || displayName.length > 100) {
      throw new ValidationError('Display name must be between 1 and 100 characters');
    }

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictError('Email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName,
        timezone: 'UTC',
        locale: 'en-US',
        notificationSettings: {},
      },
    });

    // Update last login
    await this.updateLastLogin(user.id);

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      tokens: {
        accessToken,
        refreshToken,
      },
      user: this.toUserDTO(user),
    };
  }

  /**
   * Login user with email and password
   *
   * Authenticates user credentials and returns JWT tokens
   *
   * @param email - User's email address
   * @param password - User's password
   * @returns Authentication response with tokens and user data
   * @throws {ValidationError} If email or password is missing
   * @throws {UnauthorizedError} If credentials are invalid
   *
   * @example
   * ```typescript
   * const authService = new AuthService();
   * const result = await authService.login('user@example.com', 'password123');
   * ```
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    // Validate input
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Update last login
    await this.updateLastLogin(user.id);

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      tokens: {
        accessToken,
        refreshToken,
      },
      user: this.toUserDTO(user),
    };
  }

  /**
   * Refresh access token using refresh token
   *
   * Validates refresh token and issues new access and refresh tokens
   *
   * @param refreshToken - Valid refresh token
   * @returns New tokens object with access and refresh tokens
   * @throws {UnauthorizedError} If refresh token is invalid or expired
   *
   * @example
   * ```typescript
   * const authService = new AuthService();
   * const result = await authService.refreshToken('old-refresh-token');
   * console.log(result.tokens.accessToken);
   * ```
   */
  async refreshToken(refreshToken: string): Promise<{ tokens: AuthTokens }> {
    try {
      // Validate and decode refresh token (using refresh secret)
      const payload = this.verifyToken(refreshToken, true);

      // Find user
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      // Generate new tokens (both access and refresh for better security)
      const accessToken = this.generateAccessToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      return {
        tokens: {
          accessToken,
          refreshToken: newRefreshToken,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  /**
   * Handle OAuth authentication
   *
   * Creates or updates user based on OAuth provider profile
   *
   * @param provider - OAuth provider ('github' or 'google')
   * @param profile - OAuth profile data
   * @returns Authentication response with tokens and user data
   *
   * @example
   * ```typescript
   * const authService = new AuthService();
   * const result = await authService.handleOAuth('github', {
   *   id: 'github-123',
   *   email: 'user@example.com',
   *   displayName: 'John Doe',
   *   avatarUrl: 'https://example.com/avatar.jpg'
   * });
   * ```
   */
  async handleOAuth(provider: OAuthProvider, profile: OAuthProfile): Promise<AuthResponse> {
    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (!user) {
      // Create new user from OAuth profile
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          timezone: 'UTC',
          locale: 'en-US',
          notificationSettings: {},
        },
      });
    } else {
      // Update existing user with latest profile data
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
        },
      });
    }

    // Update last login
    await this.updateLastLogin(user.id);

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      tokens: {
        accessToken,
        refreshToken,
      },
      user: this.toUserDTO(user),
    };
  }

  /**
   * Verify JWT token and extract payload
   *
   * @param token - JWT token to verify
   * @param isRefreshToken - Whether this is a refresh token (uses refresh secret)
   * @returns Decoded JWT payload
   * @throws {UnauthorizedError} If token is invalid or expired
   *
   * @example
   * ```typescript
   * const authService = new AuthService();
   * const payload = authService.verifyToken('jwt-token-here');
   * console.log(payload.userId);
   * ```
   */
  verifyToken(token: string, isRefreshToken = false): JWTPayload {
    try {
      // Remove 'Bearer ' prefix if present
      const cleanToken = token.replace(/^Bearer\s+/i, '');

      // Select the appropriate secret
      const secret = isRefreshToken ? config.jwt.refreshSecret : config.jwt.secret;

      // Verify and decode JWT
      const payload = jwt.verify(cleanToken, secret) as JWTPayload;

      // Validate payload structure
      if (!payload.userId || !payload.email) {
        throw new UnauthorizedError('Invalid token payload');
      }

      return payload;
    } catch (error) {
      // Check for TokenExpiredError first - don't try fallback for expired tokens
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Token expired');
      }

      // Support for JWT secret rotation: try old secret if primary fails with other JWT errors
      if (error instanceof jwt.JsonWebTokenError) {
        try {
          const cleanToken = token.replace(/^Bearer\s+/i, '');
          const oldSecret = isRefreshToken
            ? process.env.JWT_REFRESH_SECRET_OLD
            : process.env.JWT_SECRET_OLD;

          // Only attempt fallback if old secret is configured
          if (oldSecret) {
            const payload = jwt.verify(cleanToken, oldSecret) as JWTPayload;

            // Validate payload structure
            if (!payload.userId || !payload.email) {
              throw new UnauthorizedError('Invalid token payload');
            }

            // Token verified with old secret - still valid during rotation period
            return payload;
          }
        } catch (fallbackError) {
          // If fallback throws TokenExpiredError, propagate it
          if (fallbackError instanceof jwt.TokenExpiredError) {
            throw new UnauthorizedError('Token expired');
          }
          // Fallback failed or no old secret configured - throw original error
        }
        // If we get here, both primary and fallback failed
        throw new UnauthorizedError('Invalid token');
      }

      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new UnauthorizedError('Token verification failed');
    }
  }

  /**
   * Get user by ID
   *
   * @param userId - User ID
   * @returns User data
   * @throws {NotFoundError} If user doesn't exist
   *
   * @example
   * ```typescript
   * const authService = new AuthService();
   * const user = await authService.getUserById('user-id-123');
   * ```
   */
  async getUserById(userId: string): Promise<UserDTO> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return this.toUserDTO(user);
  }

  /**
   * Generate access token for user
   *
   * @private
   * @param user - User entity
   * @returns JWT access token
   */
  private generateAccessToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
    };

    const options: SignOptions = {
      expiresIn: config.jwt.expiresIn as StringValue,
      algorithm: 'HS256',
    };
    return jwt.sign(payload, config.jwt.secret, options);
  }

  /**
   * Generate refresh token for user
   *
   * @private
   * @param user - User entity
   * @returns JWT refresh token
   */
  private generateRefreshToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
    };

    const options: SignOptions = {
      expiresIn: config.jwt.refreshExpiresIn as StringValue,
      algorithm: 'HS256',
    };
    return jwt.sign(payload, config.jwt.refreshSecret, options);
  }

  /**
   * Update user's last login timestamp
   *
   * @private
   * @param userId - User ID
   */
  private async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * Validate email format
   *
   * @private
   * @param email - Email to validate
   * @returns True if valid, false otherwise
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Convert User entity to UserDTO (remove sensitive data)
   *
   * @private
   * @param user - User entity from database
   * @returns User DTO without sensitive fields
   */
  private toUserDTO(user: User): UserDTO {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      timezone: user.timezone,
      locale: user.locale,
      sshPublicKey: user.sshPublicKey,
      notificationSettings: user.notificationSettings as Record<string, unknown>,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
