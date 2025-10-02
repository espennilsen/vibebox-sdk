/**
 * ProjectService - Project Management Service
 * Handles project CRUD operations, ownership, and archiving
 * Tasks: T070, T040-T045
 */
import { PrismaClient } from '@prisma/client';
import type { Project } from '@prisma/client';
import { getPrismaClient } from '@/lib/db';
import { NotFoundError, ValidationError, ConflictError, ForbiddenError } from '@/lib/errors';

/**
 * Project Data Transfer Object
 */
export interface ProjectDTO {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  ownerId?: string | null;
  teamId?: string | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Project creation data
 */
export interface CreateProjectData {
  name: string;
  slug: string;
  description?: string;
  ownerId?: string;
  teamId?: string;
}

/**
 * Project update data
 */
export interface UpdateProjectData {
  name?: string;
  slug?: string;
  description?: string | null;
  isArchived?: boolean;
}

/**
 * Type-safe subset of Project fields needed for DTO conversion
 * Ensures selected fields in queries match what toProjectDTO expects
 */
type ProjectForDTO = Pick<
  Project,
  | 'id'
  | 'name'
  | 'slug'
  | 'description'
  | 'ownerId'
  | 'teamId'
  | 'isArchived'
  | 'createdAt'
  | 'updatedAt'
>;

/**
 * ProjectService - Manages projects and their lifecycle
 *
 * Provides methods for creating and managing projects, handling ownership
 * (user or team), and archiving functionality.
 */
export class ProjectService {
  /**
   * Creates a new ProjectService instance
   *
   * @param prisma - Prisma client instance for database access
   */
  constructor(private prisma: PrismaClient = getPrismaClient()) {}

  /**
   * Create a new project
   *
   * Creates project owned by user or team. Validates ownership and slug uniqueness.
   *
   * @param data - Project creation data
   * @param creatorId - User ID creating the project
   * @returns Created project
   * @throws {ValidationError} If validation fails or ownership is invalid
   * @throws {ConflictError} If slug already exists for owner/team
   *
   * @example
   * ```typescript
   * const projectService = new ProjectService();
   * const project = await projectService.createProject({
   *   name: 'My App',
   *   slug: 'my-app',
   *   description: 'A great application',
   *   ownerId: 'user-id-123'
   * }, 'user-id-123');
   * ```
   */
  async createProject(data: CreateProjectData, creatorId: string): Promise<ProjectDTO> {
    // Validate name
    if (!data.name || data.name.length === 0 || data.name.length > 100) {
      throw new ValidationError('Project name must be between 1 and 100 characters');
    }

    // Validate slug
    if (!this.isValidSlug(data.slug)) {
      throw new ValidationError(
        'Project slug must be 3-50 lowercase alphanumeric characters with hyphens'
      );
    }

    // Validate ownership: must have either ownerId or teamId, not both
    if (data.ownerId && data.teamId) {
      throw new ValidationError('Project cannot have both owner and team');
    }

    if (!data.ownerId && !data.teamId) {
      throw new ValidationError('Project must have either owner or team');
    }

    // If team project, verify user is team member
    if (data.teamId) {
      const membership = await this.prisma.userTeam.findUnique({
        where: {
          userId_teamId: {
            userId: creatorId,
            teamId: data.teamId,
          },
        },
      });

      if (!membership) {
        throw new ForbiddenError('You must be a team member to create team projects');
      }
    }

    // If user project, verify owner matches creator
    if (data.ownerId && data.ownerId !== creatorId) {
      throw new ForbiddenError('You can only create projects for yourself');
    }

    // Check slug uniqueness for owner or team
    const existingProject = data.ownerId
      ? await this.prisma.project.findUnique({
          where: {
            slug_ownerId: {
              slug: data.slug,
              ownerId: data.ownerId,
            },
          },
        })
      : await this.prisma.project.findUnique({
          where: {
            slug_teamId: {
              slug: data.slug,
              teamId: data.teamId!,
            },
          },
        });

    if (existingProject) {
      throw new ConflictError('Project slug already exists for this owner/team');
    }

    // Create project
    const project = await this.prisma.project.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        ownerId: data.ownerId,
        teamId: data.teamId,
      },
    });

    return this.toProjectDTO(project);
  }

  /**
   * Get project by ID
   *
   * @param projectId - Project ID
   * @param userId - User ID requesting access (for permission check)
   * @returns Project data
   * @throws {NotFoundError} If project doesn't exist
   * @throws {ForbiddenError} If user lacks access
   *
   * @example
   * ```typescript
   * const projectService = new ProjectService();
   * const project = await projectService.getProjectById('project-id-123', 'user-id-456');
   * ```
   */
  async getProjectById(projectId: string, userId: string): Promise<ProjectDTO> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Check access
    await this.checkProjectAccess(project, userId);

    return this.toProjectDTO(project);
  }

  /**
   * Get project by slug and owner/team
   *
   * @param slug - Project slug
   * @param ownerId - Owner user ID (mutually exclusive with teamId)
   * @param teamId - Team ID (mutually exclusive with ownerId)
   * @param userId - User ID requesting access
   * @returns Project data
   * @throws {ValidationError} If both or neither ownerId/teamId provided
   * @throws {NotFoundError} If project doesn't exist
   * @throws {ForbiddenError} If user lacks access
   *
   * @example
   * ```typescript
   * const projectService = new ProjectService();
   * const project = await projectService.getProjectBySlug(
   *   'my-app',
   *   'user-id-123',
   *   undefined,
   *   'user-id-123'
   * );
   * ```
   */
  async getProjectBySlug(
    slug: string,
    ownerId: string | undefined,
    teamId: string | undefined,
    userId: string
  ): Promise<ProjectDTO> {
    if ((ownerId && teamId) || (!ownerId && !teamId)) {
      throw new ValidationError('Must provide either ownerId or teamId, not both');
    }

    const project = ownerId
      ? await this.prisma.project.findUnique({
          where: {
            slug_ownerId: {
              slug,
              ownerId,
            },
          },
        })
      : await this.prisma.project.findUnique({
          where: {
            slug_teamId: {
              slug,
              teamId: teamId!,
            },
          },
        });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Check access
    await this.checkProjectAccess(project, userId);

    return this.toProjectDTO(project);
  }

  /**
   * Update project
   *
   * Updates project information. Only owner or team members can update.
   *
   * @param projectId - Project ID
   * @param data - Project update data
   * @param userId - User ID performing update
   * @returns Updated project
   * @throws {NotFoundError} If project doesn't exist
   * @throws {ForbiddenError} If user lacks permission
   * @throws {ValidationError} If validation fails
   * @throws {ConflictError} If new slug already exists
   *
   * @example
   * ```typescript
   * const projectService = new ProjectService();
   * const updated = await projectService.updateProject('project-id-123', {
   *   name: 'Updated Name',
   *   isArchived: true
   * }, 'user-id-456');
   * ```
   */
  async updateProject(
    projectId: string,
    data: UpdateProjectData,
    userId: string
  ): Promise<ProjectDTO> {
    // Check if project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Check access
    await this.checkProjectAccess(project, userId);

    // Validate name if provided
    if (data.name !== undefined) {
      if (data.name.length === 0 || data.name.length > 100) {
        throw new ValidationError('Project name must be between 1 and 100 characters');
      }
    }

    // Validate slug if provided
    if (data.slug !== undefined) {
      if (!this.isValidSlug(data.slug)) {
        throw new ValidationError(
          'Project slug must be 3-50 lowercase alphanumeric characters with hyphens'
        );
      }

      // Check slug uniqueness if changed
      if (data.slug !== project.slug) {
        const existingProject = project.ownerId
          ? await this.prisma.project.findUnique({
              where: {
                slug_ownerId: {
                  slug: data.slug,
                  ownerId: project.ownerId,
                },
              },
            })
          : await this.prisma.project.findUnique({
              where: {
                slug_teamId: {
                  slug: data.slug,
                  teamId: project.teamId!,
                },
              },
            });

        if (existingProject) {
          throw new ConflictError('Project slug already exists for this owner/team');
        }
      }
    }

    // Update project
    const updatedProject = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isArchived !== undefined && { isArchived: data.isArchived }),
      },
    });

    return this.toProjectDTO(updatedProject);
  }

  /**
   * Delete project
   *
   * Permanently deletes project and all environments. Only owner or team admins can delete.
   *
   * @param projectId - Project ID
   * @param userId - User ID performing deletion
   * @throws {NotFoundError} If project doesn't exist
   * @throws {ForbiddenError} If user lacks permission
   *
   * @example
   * ```typescript
   * const projectService = new ProjectService();
   * await projectService.deleteProject('project-id-123', 'owner-user-id');
   * ```
   */
  async deleteProject(projectId: string, userId: string): Promise<void> {
    // Check if project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // For team projects, check if user is admin
    if (project.teamId) {
      const membership = await this.prisma.userTeam.findUnique({
        where: {
          userId_teamId: {
            userId,
            teamId: project.teamId,
          },
        },
      });

      if (!membership || membership.role !== 'admin') {
        throw new ForbiddenError('Only team admins can delete team projects');
      }
    } else if (project.ownerId !== userId) {
      // For user projects, must be owner
      throw new ForbiddenError('Only project owner can delete project');
    }

    // Delete project (cascades to environments via Prisma schema)
    await this.prisma.project.delete({
      where: { id: projectId },
    });
  }

  /**
   * Archive project
   *
   * Archives or unarchives a project. Convenience method for updating isArchived flag.
   *
   * @param projectId - Project ID
   * @param archived - True to archive, false to unarchive
   * @param userId - User ID performing action
   * @returns Updated project
   * @throws {NotFoundError} If project doesn't exist
   * @throws {ForbiddenError} If user lacks permission
   *
   * @example
   * ```typescript
   * const projectService = new ProjectService();
   * await projectService.archiveProject('project-id-123', true, 'user-id-456');
   * ```
   */
  async archiveProject(projectId: string, archived: boolean, userId: string): Promise<ProjectDTO> {
    return this.updateProject(projectId, { isArchived: archived }, userId);
  }

  /**
   * List projects for user
   *
   * Returns all projects user owns or has access to through teams
   *
   * @param userId - User ID
   * @param includeArchived - Include archived projects
   * @param page - Page number (1-indexed)
   * @param limit - Items per page
   * @returns Array of projects
   *
   * @example
   * ```typescript
   * const projectService = new ProjectService();
   * const projects = await projectService.listUserProjects('user-id-123', false, 1, 20);
   * ```
   */
  async listUserProjects(
    userId: string,
    includeArchived: boolean = false,
    page: number = 1,
    limit: number = 20
  ): Promise<ProjectDTO[]> {
    const skip = (page - 1) * limit;

    // Get user's team IDs with optimized query
    const userTeams = await this.prisma.userTeam.findMany({
      where: { userId },
      select: { teamId: true },
    });

    const teamIds = userTeams.map((ut) => ut.teamId);

    // Get projects with select to avoid fetching unnecessary fields
    const projects = await this.prisma.project.findMany({
      where: {
        OR: [{ ownerId: userId }, { teamId: { in: teamIds } }],
        ...(includeArchived ? {} : { isArchived: false }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        ownerId: true,
        teamId: true,
        isArchived: true,
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return projects.map((p) => this.toProjectDTO(p));
  }

  /**
   * List projects for team
   *
   * Returns all projects for a specific team
   *
   * @param teamId - Team ID
   * @param userId - User ID (for permission check)
   * @param includeArchived - Include archived projects
   * @param page - Page number (1-indexed)
   * @param limit - Items per page
   * @returns Array of projects
   * @throws {ForbiddenError} If user is not team member
   *
   * @example
   * ```typescript
   * const projectService = new ProjectService();
   * const projects = await projectService.listTeamProjects(
   *   'team-id-123',
   *   'user-id-456',
   *   false,
   *   1,
   *   20
   * );
   * ```
   */
  async listTeamProjects(
    teamId: string,
    userId: string,
    includeArchived: boolean = false,
    page: number = 1,
    limit: number = 20
  ): Promise<ProjectDTO[]> {
    // Check if user is team member (minimal select)
    const membership = await this.prisma.userTeam.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenError('You are not a member of this team');
    }

    const skip = (page - 1) * limit;

    // Use select to fetch only needed fields
    const projects = await this.prisma.project.findMany({
      where: {
        teamId,
        ...(includeArchived ? {} : { isArchived: false }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        ownerId: true,
        teamId: true,
        isArchived: true,
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return projects.map((p) => this.toProjectDTO(p));
  }

  /**
   * Check if user has access to project
   *
   * @private
   * @param project - Project entity
   * @param userId - User ID
   * @throws {ForbiddenError} If user lacks access
   */
  private async checkProjectAccess(project: Project, userId: string): Promise<void> {
    // If user project, check ownership
    if (project.ownerId) {
      if (project.ownerId !== userId) {
        throw new ForbiddenError('You do not have access to this project');
      }
      return;
    }

    // If team project, check team membership
    if (project.teamId) {
      const membership = await this.prisma.userTeam.findUnique({
        where: {
          userId_teamId: {
            userId,
            teamId: project.teamId,
          },
        },
      });

      if (!membership) {
        throw new ForbiddenError('You do not have access to this project');
      }
      return;
    }

    // Project has neither owner nor team (should not happen)
    throw new ForbiddenError('Invalid project ownership');
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
   * Convert Project entity to ProjectDTO
   *
   * @private
   * @param project - Project entity from database
   * @returns Project DTO
   */
  /**
   * Convert Project entity or selected fields to ProjectDTO
   * Accepts ProjectForDTO to ensure type-safe usage with Prisma select queries
   */
  private toProjectDTO(project: ProjectForDTO): ProjectDTO {
    return {
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description,
      ownerId: project.ownerId,
      teamId: project.teamId,
      isArchived: project.isArchived,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}
