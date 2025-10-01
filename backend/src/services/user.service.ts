/**
 * UserService - User Profile Management Service
 * Handles user profile CRUD operations, SSH key management, and settings
 * Tasks: T068, T031-T032
 */
import { PrismaClient } from '@prisma/client';
import type { User } from '@prisma/client';
import { getPrismaClient } from '@/lib/db';
import { NotFoundError, ValidationError } from '@/lib/errors';

/**
 * User profile update data
 */
export interface UpdateUserProfile {
  displayName?: string;
  avatarUrl?: string | null;
  timezone?: string;
  locale?: string;
  sshPublicKey?: string | null;
  notificationSettings?: Record<string, unknown>;
}

/**
 * User Data Transfer Object
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
 * UserService - Manages user profiles and settings
 *
 * Provides methods for retrieving and updating user information,
 * managing SSH keys, and configuring notification settings.
 */
export class UserService {
  /**
   * Creates a new UserService instance
   *
   * @param prisma - Prisma client instance for database access
   */
  constructor(private prisma: PrismaClient = getPrismaClient()) {}

  /**
   * Get user by ID
   *
   * Retrieves complete user profile information
   *
   * @param userId - User ID (UUID)
   * @returns User profile data
   * @throws {NotFoundError} If user doesn't exist
   *
   * @example
   * ```typescript
   * const userService = new UserService();
   * const user = await userService.getUserById('user-id-123');
   * console.log(user.displayName);
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
   * Get user by email
   *
   * Retrieves user profile by email address
   *
   * @param email - User email address
   * @returns User profile data
   * @throws {NotFoundError} If user doesn't exist
   *
   * @example
   * ```typescript
   * const userService = new UserService();
   * const user = await userService.getUserByEmail('user@example.com');
   * ```
   */
  async getUserByEmail(email: string): Promise<UserDTO> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return this.toUserDTO(user);
  }

  /**
   * Update user profile
   *
   * Updates user profile fields. Only provided fields are updated.
   *
   * @param userId - User ID
   * @param data - Profile fields to update
   * @returns Updated user profile
   * @throws {NotFoundError} If user doesn't exist
   * @throws {ValidationError} If validation fails
   *
   * @example
   * ```typescript
   * const userService = new UserService();
   * const updated = await userService.updateProfile('user-id-123', {
   *   displayName: 'New Name',
   *   timezone: 'America/New_York'
   * });
   * ```
   */
  async updateProfile(userId: string, data: UpdateUserProfile): Promise<UserDTO> {
    // Validate user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    // Validate displayName if provided
    if (data.displayName !== undefined) {
      if (data.displayName.length === 0 || data.displayName.length > 100) {
        throw new ValidationError('Display name must be between 1 and 100 characters');
      }
    }

    // Validate timezone if provided
    if (data.timezone !== undefined) {
      if (!this.isValidTimezone(data.timezone)) {
        throw new ValidationError('Invalid timezone');
      }
    }

    // Validate locale if provided
    if (data.locale !== undefined) {
      if (!this.isValidLocale(data.locale)) {
        throw new ValidationError('Invalid locale format');
      }
    }

    // Validate SSH public key format if provided
    if (data.sshPublicKey !== undefined && data.sshPublicKey !== null) {
      if (!this.isValidSSHKey(data.sshPublicKey)) {
        throw new ValidationError('Invalid SSH public key format');
      }
    }

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.displayName !== undefined && { displayName: data.displayName }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.timezone !== undefined && { timezone: data.timezone }),
        ...(data.locale !== undefined && { locale: data.locale }),
        ...(data.sshPublicKey !== undefined && { sshPublicKey: data.sshPublicKey }),
        ...(data.notificationSettings !== undefined && {
          notificationSettings: data.notificationSettings as any,
        }),
      },
    });

    return this.toUserDTO(updatedUser);
  }

  /**
   * Update SSH public key
   *
   * Sets or updates the user's SSH public key for environment access
   *
   * @param userId - User ID
   * @param sshPublicKey - SSH public key string (null to remove)
   * @returns Updated user profile
   * @throws {NotFoundError} If user doesn't exist
   * @throws {ValidationError} If SSH key format is invalid
   *
   * @example
   * ```typescript
   * const userService = new UserService();
   * const updated = await userService.updateSSHKey(
   *   'user-id-123',
   *   'ssh-rsa AAAAB3NzaC1yc2EA... user@host'
   * );
   * ```
   */
  async updateSSHKey(userId: string, sshPublicKey: string | null): Promise<UserDTO> {
    // Validate SSH key format if not null
    if (sshPublicKey !== null && !this.isValidSSHKey(sshPublicKey)) {
      throw new ValidationError('Invalid SSH public key format');
    }

    return this.updateProfile(userId, { sshPublicKey });
  }

  /**
   * Update notification settings
   *
   * Updates user's notification preferences
   *
   * @param userId - User ID
   * @param settings - Notification settings object
   * @returns Updated user profile
   * @throws {NotFoundError} If user doesn't exist
   *
   * @example
   * ```typescript
   * const userService = new UserService();
   * const updated = await userService.updateNotificationSettings('user-id-123', {
   *   email: true,
   *   slack: false,
   *   environmentStatus: true
   * });
   * ```
   */
  async updateNotificationSettings(
    userId: string,
    settings: Record<string, unknown>
  ): Promise<UserDTO> {
    return this.updateProfile(userId, { notificationSettings: settings });
  }

  /**
   * List all users (admin function)
   *
   * Retrieves paginated list of all users
   *
   * @param page - Page number (1-indexed)
   * @param limit - Items per page
   * @returns Array of user profiles
   *
   * @example
   * ```typescript
   * const userService = new UserService();
   * const users = await userService.listUsers(1, 20);
   * ```
   */
  async listUsers(page: number = 1, limit: number = 20): Promise<UserDTO[]> {
    const skip = (page - 1) * limit;

    const users = await this.prisma.user.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => this.toUserDTO(user));
  }

  /**
   * Get total user count
   *
   * @returns Total number of registered users
   *
   * @example
   * ```typescript
   * const userService = new UserService();
   * const count = await userService.getUserCount();
   * ```
   */
  async getUserCount(): Promise<number> {
    return this.prisma.user.count();
  }

  /**
   * Delete user (soft delete recommended in production)
   *
   * Permanently deletes user and all associated data
   *
   * @param userId - User ID to delete
   * @throws {NotFoundError} If user doesn't exist
   *
   * @example
   * ```typescript
   * const userService = new UserService();
   * await userService.deleteUser('user-id-123');
   * ```
   */
  async deleteUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Delete user (cascades to related records via Prisma schema)
    await this.prisma.user.delete({
      where: { id: userId },
    });
  }

  /**
   * Validate timezone string
   *
   * @private
   * @param timezone - Timezone string (e.g., 'America/New_York')
   * @returns True if valid timezone
   */
  private isValidTimezone(timezone: string): boolean {
    // Basic validation - in production, use a library like moment-timezone
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate locale string
   *
   * @private
   * @param locale - Locale string (e.g., 'en-US')
   * @returns True if valid locale format
   */
  private isValidLocale(locale: string): boolean {
    // BCP 47 locale format: language[-region]
    const localeRegex = /^[a-z]{2,3}(-[A-Z]{2})?$/;
    return localeRegex.test(locale);
  }

  /**
   * Validate SSH public key format
   *
   * @private
   * @param key - SSH public key string
   * @returns True if valid SSH key format
   */
  private isValidSSHKey(key: string): boolean {
    // Basic SSH key validation (ssh-rsa, ssh-ed25519, ecdsa-sha2-nistp256, etc.)
    const sshKeyRegex =
      /^(ssh-rsa|ssh-ed25519|ecdsa-sha2-nistp256|ecdsa-sha2-nistp384|ecdsa-sha2-nistp521)\s+[A-Za-z0-9+/]+=*\s*.*$/;
    return sshKeyRegex.test(key.trim());
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
