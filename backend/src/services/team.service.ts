/**
 * TeamService - Team and Member Management Service
 * Handles team CRUD operations, member management, and permissions
 * Tasks: T069, T033-T039
 */
import { PrismaClient } from '@prisma/client';
import type { Team, UserTeam, User } from '@prisma/client';
import { UserTeamRole } from '@/types/prisma-enums';
import { getPrismaClient } from '@/lib/db';
import { NotFoundError, ValidationError, ConflictError, ForbiddenError } from '@/lib/errors';

/**
 * Team Data Transfer Object
 */
export interface TeamDTO {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  avatarUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Team member with user details
 */
export interface TeamMemberDTO {
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  role: UserTeamRole;
  joinedAt: Date;
}

/**
 * Team creation data
 */
export interface CreateTeamData {
  name: string;
  slug: string;
  description?: string;
  avatarUrl?: string;
}

/**
 * Team update data
 */
export interface UpdateTeamData {
  name?: string;
  slug?: string;
  description?: string | null;
  avatarUrl?: string | null;
}

/**
 * TeamService - Manages teams and team memberships
 *
 * Provides methods for creating and managing teams, adding/removing members,
 * and handling team permissions.
 */
export class TeamService {
  /**
   * Creates a new TeamService instance
   *
   * @param prisma - Prisma client instance for database access
   */
  constructor(private prisma: PrismaClient = getPrismaClient()) {}

  /**
   * Create a new team
   *
   * Creates team and adds creator as admin
   *
   * @param data - Team creation data
   * @param creatorId - User ID of team creator
   * @returns Created team
   * @throws {ValidationError} If validation fails
   * @throws {ConflictError} If slug already exists
   *
   * @example
   * ```typescript
   * const teamService = new TeamService();
   * const team = await teamService.createTeam({
   *   name: 'Engineering Team',
   *   slug: 'engineering',
   *   description: 'Backend development team'
   * }, 'user-id-123');
   * ```
   */
  async createTeam(data: CreateTeamData, creatorId: string): Promise<TeamDTO> {
    // Validate name
    if (!data.name || data.name.length === 0 || data.name.length > 100) {
      throw new ValidationError('Team name must be between 1 and 100 characters');
    }

    // Validate slug
    if (!this.isValidSlug(data.slug)) {
      throw new ValidationError(
        'Team slug must be 3-50 lowercase alphanumeric characters with hyphens'
      );
    }

    // Check if slug already exists
    const existingTeam = await this.prisma.team.findUnique({
      where: { slug: data.slug },
    });

    if (existingTeam) {
      throw new ConflictError('Team slug already exists');
    }

    // Create team and add creator as admin in transaction
    const team = await this.prisma.$transaction(async (tx) => {
      const newTeam = await tx.team.create({
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          avatarUrl: data.avatarUrl,
        },
      });

      // Add creator as admin
      await tx.userTeam.create({
        data: {
          userId: creatorId,
          teamId: newTeam.id,
          role: UserTeamRole.admin,
        },
      });

      return newTeam;
    });

    return this.toTeamDTO(team);
  }

  /**
   * Get team by ID
   *
   * @param teamId - Team ID
   * @param userId - User ID requesting access (for permission check)
   * @returns Team data
   * @throws {NotFoundError} If team doesn't exist
   * @throws {ForbiddenError} If user is not a team member
   *
   * @example
   * ```typescript
   * const teamService = new TeamService();
   * const team = await teamService.getTeamById('team-id-123', 'user-id-456');
   * ```
   */
  async getTeamById(teamId: string, userId: string): Promise<TeamDTO> {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundError('Team not found');
    }

    // Check if user is team member
    await this.checkTeamMembership(teamId, userId);

    return this.toTeamDTO(team);
  }

  /**
   * Get team by slug
   *
   * @param slug - Team slug
   * @param userId - User ID requesting access (for permission check)
   * @returns Team data
   * @throws {NotFoundError} If team doesn't exist
   * @throws {ForbiddenError} If user is not a team member
   *
   * @example
   * ```typescript
   * const teamService = new TeamService();
   * const team = await teamService.getTeamBySlug('engineering', 'user-id-123');
   * ```
   */
  async getTeamBySlug(slug: string, userId: string): Promise<TeamDTO> {
    const team = await this.prisma.team.findUnique({
      where: { slug },
    });

    if (!team) {
      throw new NotFoundError('Team not found');
    }

    // Check if user is team member
    await this.checkTeamMembership(team.id, userId);

    return this.toTeamDTO(team);
  }

  /**
   * Update team
   *
   * Updates team information. Only admins can update teams.
   *
   * @param teamId - Team ID
   * @param data - Team update data
   * @param userId - User ID performing update
   * @returns Updated team
   * @throws {NotFoundError} If team doesn't exist
   * @throws {ForbiddenError} If user is not admin
   * @throws {ValidationError} If validation fails
   * @throws {ConflictError} If new slug already exists
   *
   * @example
   * ```typescript
   * const teamService = new TeamService();
   * const updated = await teamService.updateTeam('team-id-123', {
   *   name: 'New Team Name',
   *   description: 'Updated description'
   * }, 'admin-user-id');
   * ```
   */
  async updateTeam(teamId: string, data: UpdateTeamData, userId: string): Promise<TeamDTO> {
    // Check if team exists
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundError('Team not found');
    }

    // Check if user is admin
    await this.checkTeamAdmin(teamId, userId);

    // Validate name if provided
    if (data.name !== undefined) {
      if (data.name.length === 0 || data.name.length > 100) {
        throw new ValidationError('Team name must be between 1 and 100 characters');
      }
    }

    // Validate slug if provided
    if (data.slug !== undefined) {
      if (!this.isValidSlug(data.slug)) {
        throw new ValidationError(
          'Team slug must be 3-50 lowercase alphanumeric characters with hyphens'
        );
      }

      // Check if new slug already exists (and it's not the current slug)
      if (data.slug !== team.slug) {
        const existingTeam = await this.prisma.team.findUnique({
          where: { slug: data.slug },
        });

        if (existingTeam) {
          throw new ConflictError('Team slug already exists');
        }
      }
    }

    // Update team
    const updatedTeam = await this.prisma.team.update({
      where: { id: teamId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      },
    });

    return this.toTeamDTO(updatedTeam);
  }

  /**
   * Delete team
   *
   * Permanently deletes team and all memberships. Only admins can delete teams.
   *
   * @param teamId - Team ID
   * @param userId - User ID performing deletion
   * @throws {NotFoundError} If team doesn't exist
   * @throws {ForbiddenError} If user is not admin
   *
   * @example
   * ```typescript
   * const teamService = new TeamService();
   * await teamService.deleteTeam('team-id-123', 'admin-user-id');
   * ```
   */
  async deleteTeam(teamId: string, userId: string): Promise<void> {
    // Check if team exists
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundError('Team not found');
    }

    // Check if user is admin
    await this.checkTeamAdmin(teamId, userId);

    // Delete team (cascades to memberships and projects via Prisma schema)
    await this.prisma.team.delete({
      where: { id: teamId },
    });
  }

  /**
   * List teams for user
   *
   * Returns all teams the user is a member of
   *
   * @param userId - User ID
   * @param page - Page number (1-indexed)
   * @param limit - Items per page
   * @returns Array of teams
   *
   * @example
   * ```typescript
   * const teamService = new TeamService();
   * const teams = await teamService.listUserTeams('user-id-123', 1, 20);
   * ```
   */
  async listUserTeams(userId: string, page: number = 1, limit: number = 20): Promise<TeamDTO[]> {
    const skip = (page - 1) * limit;

    const userTeams = await this.prisma.userTeam.findMany({
      where: { userId },
      skip,
      take: limit,
      include: {
        team: true,
      },
      orderBy: { joinedAt: 'desc' },
    });

    return userTeams.map((ut) => this.toTeamDTO(ut.team));
  }

  /**
   * Add member to team
   *
   * Adds user to team with specified role. Only admins can add members.
   *
   * @param teamId - Team ID
   * @param userIdToAdd - User ID to add as member
   * @param role - Role to assign (admin, developer, viewer)
   * @param adminUserId - Admin user performing action
   * @throws {NotFoundError} If team or user doesn't exist
   * @throws {ForbiddenError} If admin user is not admin
   * @throws {ConflictError} If user is already a member
   *
   * @example
   * ```typescript
   * const teamService = new TeamService();
   * await teamService.addMember(
   *   'team-id-123',
   *   'new-user-id',
   *   UserTeamRole.developer,
   *   'admin-user-id'
   * );
   * ```
   */
  async addMember(
    teamId: string,
    userIdToAdd: string,
    role: UserTeamRole,
    adminUserId: string
  ): Promise<void> {
    // Check if team exists
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundError('Team not found');
    }

    // Check if user to add exists
    const userToAdd = await this.prisma.user.findUnique({
      where: { id: userIdToAdd },
    });

    if (!userToAdd) {
      throw new NotFoundError('User not found');
    }

    // Check if admin user is team admin
    await this.checkTeamAdmin(teamId, adminUserId);

    // Check if user is already a member
    const existingMembership = await this.prisma.userTeam.findUnique({
      where: {
        userId_teamId: {
          userId: userIdToAdd,
          teamId,
        },
      },
    });

    if (existingMembership) {
      throw new ConflictError('User is already a team member');
    }

    // Add member
    await this.prisma.userTeam.create({
      data: {
        userId: userIdToAdd,
        teamId,
        role,
      },
    });
  }

  /**
   * Remove member from team
   *
   * Removes user from team. Only admins can remove members.
   *
   * @param teamId - Team ID
   * @param userIdToRemove - User ID to remove
   * @param adminUserId - Admin user performing action
   * @throws {NotFoundError} If team or membership doesn't exist
   * @throws {ForbiddenError} If admin user is not admin
   * @throws {ValidationError} If trying to remove last admin
   *
   * @example
   * ```typescript
   * const teamService = new TeamService();
   * await teamService.removeMember('team-id-123', 'user-to-remove', 'admin-user-id');
   * ```
   */
  async removeMember(teamId: string, userIdToRemove: string, adminUserId: string): Promise<void> {
    // Check if team exists
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundError('Team not found');
    }

    // Check if admin user is team admin
    await this.checkTeamAdmin(teamId, adminUserId);

    // Check if membership exists
    const membership = await this.prisma.userTeam.findUnique({
      where: {
        userId_teamId: {
          userId: userIdToRemove,
          teamId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundError('User is not a team member');
    }

    // Check if removing last admin
    if (membership.role === UserTeamRole.admin) {
      const adminCount = await this.prisma.userTeam.count({
        where: {
          teamId,
          role: UserTeamRole.admin,
        },
      });

      if (adminCount <= 1) {
        throw new ValidationError('Cannot remove last admin from team');
      }
    }

    // Remove member
    await this.prisma.userTeam.delete({
      where: {
        userId_teamId: {
          userId: userIdToRemove,
          teamId,
        },
      },
    });
  }

  /**
   * List team members
   *
   * Returns all members of a team with their roles
   *
   * @param teamId - Team ID
   * @param userId - User ID requesting list (for permission check)
   * @param page - Page number (1-indexed)
   * @param limit - Items per page
   * @returns Array of team members
   * @throws {NotFoundError} If team doesn't exist
   * @throws {ForbiddenError} If user is not a team member
   *
   * @example
   * ```typescript
   * const teamService = new TeamService();
   * const members = await teamService.listMembers('team-id-123', 'user-id-456', 1, 20);
   * ```
   */
  async listMembers(
    teamId: string,
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<TeamMemberDTO[]> {
    // Check if team exists
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundError('Team not found');
    }

    // Check if user is team member
    await this.checkTeamMembership(teamId, userId);

    const skip = (page - 1) * limit;

    const members = await this.prisma.userTeam.findMany({
      where: { teamId },
      skip,
      take: limit,
      include: {
        user: true,
      },
      orderBy: { joinedAt: 'asc' },
    });

    return members.map((member) => this.toTeamMemberDTO(member));
  }

  /**
   * Update member role
   *
   * Changes a member's role. Only admins can update roles.
   *
   * @param teamId - Team ID
   * @param userIdToUpdate - User ID whose role to update
   * @param newRole - New role to assign
   * @param adminUserId - Admin user performing action
   * @throws {NotFoundError} If team or membership doesn't exist
   * @throws {ForbiddenError} If admin user is not admin
   * @throws {ValidationError} If trying to demote last admin
   *
   * @example
   * ```typescript
   * const teamService = new TeamService();
   * await teamService.updateMemberRole(
   *   'team-id-123',
   *   'user-id-456',
   *   UserTeamRole.admin,
   *   'admin-user-id'
   * );
   * ```
   */
  async updateMemberRole(
    teamId: string,
    userIdToUpdate: string,
    newRole: UserTeamRole,
    adminUserId: string
  ): Promise<void> {
    // Check if team exists
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundError('Team not found');
    }

    // Check if admin user is team admin
    await this.checkTeamAdmin(teamId, adminUserId);

    // Check if membership exists
    const membership = await this.prisma.userTeam.findUnique({
      where: {
        userId_teamId: {
          userId: userIdToUpdate,
          teamId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundError('User is not a team member');
    }

    // Check if demoting last admin
    if (membership.role === UserTeamRole.admin && newRole !== UserTeamRole.admin) {
      const adminCount = await this.prisma.userTeam.count({
        where: {
          teamId,
          role: UserTeamRole.admin,
        },
      });

      if (adminCount <= 1) {
        throw new ValidationError('Cannot demote last admin');
      }
    }

    // Update role
    await this.prisma.userTeam.update({
      where: {
        userId_teamId: {
          userId: userIdToUpdate,
          teamId,
        },
      },
      data: { role: newRole },
    });
  }

  /**
   * Check if user is team member
   *
   * @private
   * @param teamId - Team ID
   * @param userId - User ID
   * @throws {ForbiddenError} If user is not a team member
   */
  private async checkTeamMembership(teamId: string, userId: string): Promise<void> {
    const membership = await this.prisma.userTeam.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenError('You are not a member of this team');
    }
  }

  /**
   * Check if user is team admin
   *
   * @private
   * @param teamId - Team ID
   * @param userId - User ID
   * @throws {ForbiddenError} If user is not a team admin
   */
  private async checkTeamAdmin(teamId: string, userId: string): Promise<void> {
    const membership = await this.prisma.userTeam.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
    });

    if (!membership || membership.role !== UserTeamRole.admin) {
      throw new ForbiddenError('You must be a team admin to perform this action');
    }
  }

  /**
   * Validate slug format
   *
   * @private
   * @param slug - Slug to validate
   * @returns True if valid slug
   */
  private isValidSlug(slug: string): boolean {
    const slugRegex = /^[a-z0-9-]{3,50}$/;
    return slugRegex.test(slug);
  }

  /**
   * Convert Team entity to TeamDTO
   *
   * @private
   * @param team - Team entity from database
   * @returns Team DTO
   */
  private toTeamDTO(team: Team): TeamDTO {
    return {
      id: team.id,
      name: team.name,
      slug: team.slug,
      description: team.description,
      avatarUrl: team.avatarUrl,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    };
  }

  /**
   * Convert UserTeam entity to TeamMemberDTO
   *
   * @private
   * @param userTeam - UserTeam entity with user relation
   * @returns Team member DTO
   */
  private toTeamMemberDTO(userTeam: UserTeam & { user: User }): TeamMemberDTO {
    return {
      user: {
        id: userTeam.user.id,
        email: userTeam.user.email,
        displayName: userTeam.user.displayName,
        avatarUrl: userTeam.user.avatarUrl,
      },
      role: userTeam.role,
      joinedAt: userTeam.joinedAt,
    };
  }
}
