/**
 * AuthService - Authentication and Authorization Service
 * Handles user authentication, JWT token generation, and OAuth integration
 * Tasks: T067, T027-T030
 */
import { PrismaClient } from '@prisma/client';
import type { User } from '@prisma/client';
import bcrypt from 'bcrypt';
import { getPrismaClient } from '@/lib/db';
import { ConflictError, UnauthorizedError, ValidationError, NotFoundError } from '@/lib/errors';

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
 * Authentication response structure
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
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
      accessToken,
      refreshToken,
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
      accessToken,
      refreshToken,
      user: this.toUserDTO(user),
    };
  }

  /**
   * Refresh access token using refresh token
   *
   * Validates refresh token and issues new access token
   *
   * @param refreshToken - Valid refresh token
   * @returns New access token
   * @throws {UnauthorizedError} If refresh token is invalid or expired
   *
   * @example
   * ```typescript
   * const authService = new AuthService();
   * const newToken = await authService.refreshToken('old-refresh-token');
   * ```
   */
  async refreshToken(refreshToken: string): Promise<string> {
    try {
      // Validate and decode refresh token
      const payload = this.verifyToken(refreshToken);

      // Find user
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      // Generate new access token
      return this.generateAccessToken(user);
    } catch {
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
      accessToken,
      refreshToken,
      user: this.toUserDTO(user),
    };
  }

  /**
   * Verify JWT token and extract payload
   *
   * @param token - JWT token to verify
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
  verifyToken(token: string): JWTPayload {
    // Note: In production, this should use a proper JWT library like jsonwebtoken
    // For now, we'll implement a basic version that can be replaced with Fastify JWT
    try {
      // Remove 'Bearer ' prefix if present
      const cleanToken = token.replace(/^Bearer\s+/i, '');

      // Decode JWT (simplified - in production use jsonwebtoken)
      const parts = cleanToken.split('.');
      if (parts.length !== 3) {
        throw new UnauthorizedError('Invalid token format');
      }

      const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString()) as JWTPayload;

      // Check expiration
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        throw new UnauthorizedError('Token expired');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new UnauthorizedError('Invalid token');
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
    // In production, use Fastify JWT or jsonwebtoken library
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes
    };

    // Simplified JWT generation (replace with proper library in production)
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = 'mock-signature'; // Replace with actual HMAC signature

    return `${header}.${body}.${signature}`;
  }

  /**
   * Generate refresh token for user
   *
   * @private
   * @param user - User entity
   * @returns JWT refresh token
   */
  private generateRefreshToken(user: User): string {
    // In production, use Fastify JWT or jsonwebtoken library
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
    };

    // Simplified JWT generation (replace with proper library in production)
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = 'mock-signature'; // Replace with actual HMAC signature

    return `${header}.${body}.${signature}`;
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
