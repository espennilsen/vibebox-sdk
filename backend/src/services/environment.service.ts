/**
 * EnvironmentService - Development Environment Management Service
 * Orchestrates Docker containers, manages environment lifecycle and configuration
 * Tasks: T072, T046-T053
 */
import { PrismaClient } from '@prisma/client';
import { EnvironmentStatus, Protocol } from '@/types/prisma-enums';
import type { Environment } from '@prisma/client';
import { getPrismaClient } from '@/lib/db';
import { DockerService } from './docker.service';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
  BadRequestError,
} from '@/lib/errors';

/**
 * Environment Data Transfer Object
 */
export interface EnvironmentDTO {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  projectId: string;
  creatorId: string;
  baseImage: string;
  containerId?: string | null;
  status: EnvironmentStatus;
  errorMessage?: string | null;
  cpuLimit: number;
  memoryLimit: number;
  storageLimit: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date | null;
  stoppedAt?: Date | null;
}

/**
 * Environment creation data
 */
export interface CreateEnvironmentData {
  name: string;
  slug: string;
  description?: string;
  projectId: string;
  baseImage: string;
  cpuLimit?: number;
  memoryLimit?: number;
  storageLimit?: number;
}

/**
 * Environment update data
 */
export interface UpdateEnvironmentData {
  name?: string;
  slug?: string;
  description?: string | null;
  cpuLimit?: number;
  memoryLimit?: number;
  storageLimit?: number;
}

/**
 * Port mapping data
 */
export interface PortMapping {
  containerPort: number;
  hostPort?: number;
  protocol?: Protocol;
  description?: string;
}

/**
 * Environment variable data
 */
export interface EnvironmentVariableData {
  key: string;
  value: string;
  isEncrypted?: boolean;
}

/**
 * EnvironmentService - Manages development environments
 *
 * Provides methods for creating and managing Docker-based development
 * environments, including container orchestration, port management,
 * and environment variables.
 */
export class EnvironmentService {
  /**
   * Creates a new EnvironmentService instance
   *
   * @param prisma - Prisma client instance for database access
   * @param dockerService - Docker service instance for container management
   */
  constructor(
    private prisma: PrismaClient = getPrismaClient(),
    private dockerService: DockerService = new DockerService()
  ) {}

  /**
   * Create a new environment
   *
   * Creates environment record and Docker container
   *
   * @param data - Environment creation data
   * @param creatorId - User ID creating the environment
   * @returns Created environment
   * @throws {ValidationError} If validation fails
   * @throws {ConflictError} If slug already exists in project
   * @throws {NotFoundError} If project doesn't exist
   * @throws {ForbiddenError} If user lacks access to project
   *
   * @example
   * ```typescript
   * const envService = new EnvironmentService();
   * const env = await envService.createEnvironment({
   *   name: 'Development',
   *   slug: 'dev',
   *   projectId: 'project-id-123',
   *   baseImage: 'node:20-alpine'
   * }, 'user-id-456');
   * ```
   */
  async createEnvironment(data: CreateEnvironmentData, creatorId: string): Promise<EnvironmentDTO> {
    // Validate name
    if (!data.name || data.name.length === 0 || data.name.length > 100) {
      throw new ValidationError('Environment name must be between 1 and 100 characters');
    }

    // Validate slug
    if (!this.isValidSlug(data.slug)) {
      throw new ValidationError(
        'Environment slug must be 3-50 lowercase alphanumeric characters with hyphens'
      );
    }

    // Check if project exists and user has access
    const project = await this.prisma.project.findUnique({
      where: { id: data.projectId },
      include: { owner: true, team: { include: { userTeams: true } } },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Check access
    const hasAccess =
      project.ownerId === creatorId ||
      (project.team?.userTeams.some((ut) => ut.userId === creatorId) ?? false);

    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this project');
    }

    // Check slug uniqueness in project
    const existingEnv = await this.prisma.environment.findUnique({
      where: {
        projectId_slug: {
          projectId: data.projectId,
          slug: data.slug,
        },
      },
    });

    if (existingEnv) {
      throw new ConflictError('Environment slug already exists in this project');
    }

    // Create environment record (container will be created on start)
    const environment = await this.prisma.environment.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        projectId: data.projectId,
        creatorId,
        baseImage: data.baseImage,
        status: EnvironmentStatus.stopped,
        cpuLimit: data.cpuLimit || 2.0,
        memoryLimit: data.memoryLimit || 4096,
        storageLimit: data.storageLimit || 20480,
      },
    });

    return this.toEnvironmentDTO(environment);
  }

  /**
   * Get environment by ID
   *
   * @param environmentId - Environment ID
   * @param userId - User ID requesting access
   * @returns Environment data
   * @throws {NotFoundError} If environment doesn't exist
   * @throws {ForbiddenError} If user lacks access
   *
   * @example
   * ```typescript
   * const envService = new EnvironmentService();
   * const env = await envService.getEnvironmentById('env-id-123', 'user-id-456');
   * ```
   */
  async getEnvironmentById(environmentId: string, userId: string): Promise<EnvironmentDTO> {
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      include: {
        project: {
          include: {
            owner: true,
            team: { include: { userTeams: true } },
          },
        },
      },
    });

    if (!environment) {
      throw new NotFoundError('Environment not found');
    }

    // Check access
    await this.checkEnvironmentAccess(environment.project, userId);

    return this.toEnvironmentDTO(environment);
  }

  /**
   * Update environment
   *
   * Updates environment configuration (not container)
   *
   * @param environmentId - Environment ID
   * @param data - Environment update data
   * @param userId - User ID performing update
   * @returns Updated environment
   * @throws {NotFoundError} If environment doesn't exist
   * @throws {ForbiddenError} If user lacks access
   * @throws {ValidationError} If validation fails
   *
   * @example
   * ```typescript
   * const envService = new EnvironmentService();
   * const updated = await envService.updateEnvironment('env-id-123', {
   *   name: 'Production',
   *   memoryLimit: 8192
   * }, 'user-id-456');
   * ```
   */
  async updateEnvironment(
    environmentId: string,
    data: UpdateEnvironmentData,
    userId: string
  ): Promise<EnvironmentDTO> {
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      include: {
        project: {
          include: {
            owner: true,
            team: { include: { userTeams: true } },
          },
        },
      },
    });

    if (!environment) {
      throw new NotFoundError('Environment not found');
    }

    // Check access
    await this.checkEnvironmentAccess(environment.project, userId);

    // Validate name if provided
    if (data.name !== undefined) {
      if (data.name.length === 0 || data.name.length > 100) {
        throw new ValidationError('Environment name must be between 1 and 100 characters');
      }
    }

    // Validate slug if provided
    if (data.slug !== undefined) {
      if (!this.isValidSlug(data.slug)) {
        throw new ValidationError(
          'Environment slug must be 3-50 lowercase alphanumeric characters with hyphens'
        );
      }

      // Check slug uniqueness if changed
      if (data.slug !== environment.slug) {
        const existingEnv = await this.prisma.environment.findUnique({
          where: {
            projectId_slug: {
              projectId: environment.projectId,
              slug: data.slug,
            },
          },
        });

        if (existingEnv) {
          throw new ConflictError('Environment slug already exists in this project');
        }
      }
    }

    // Update environment
    const updatedEnvironment = await this.prisma.environment.update({
      where: { id: environmentId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.cpuLimit !== undefined && { cpuLimit: data.cpuLimit }),
        ...(data.memoryLimit !== undefined && { memoryLimit: data.memoryLimit }),
        ...(data.storageLimit !== undefined && { storageLimit: data.storageLimit }),
      },
    });

    return this.toEnvironmentDTO(updatedEnvironment);
  }

  /**
   * Delete environment
   *
   * Stops and removes environment container and database record
   *
   * @param environmentId - Environment ID
   * @param userId - User ID performing deletion
   * @throws {NotFoundError} If environment doesn't exist
   * @throws {ForbiddenError} If user lacks access
   *
   * @example
   * ```typescript
   * const envService = new EnvironmentService();
   * await envService.deleteEnvironment('env-id-123', 'user-id-456');
   * ```
   */
  async deleteEnvironment(environmentId: string, userId: string): Promise<void> {
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      include: {
        project: {
          include: {
            owner: true,
            team: { include: { userTeams: true } },
          },
        },
      },
    });

    if (!environment) {
      throw new NotFoundError('Environment not found');
    }

    // Check access
    await this.checkEnvironmentAccess(environment.project, userId);

    // Stop and remove container if exists
    if (environment.containerId) {
      try {
        await this.dockerService.stopContainer(environment.containerId);
        await this.dockerService.removeContainer(environment.containerId);
      } catch (error) {
        console.warn('Failed to remove container, continuing with deletion:', error);
      }
    }

    // Delete environment (cascades to related records)
    await this.prisma.environment.delete({
      where: { id: environmentId },
    });
  }

  /**
   * Start environment
   *
   * Creates and starts Docker container for environment
   *
   * @param environmentId - Environment ID
   * @param userId - User ID performing action
   * @returns Updated environment
   * @throws {NotFoundError} If environment doesn't exist
   * @throws {ForbiddenError} If user lacks access
   * @throws {BadRequestError} If environment is already running
   *
   * @example
   * ```typescript
   * const envService = new EnvironmentService();
   * const env = await envService.startEnvironment('env-id-123', 'user-id-456');
   * ```
   */
  async startEnvironment(environmentId: string, userId: string): Promise<EnvironmentDTO> {
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      include: {
        project: {
          include: {
            owner: true,
            team: { include: { userTeams: true } },
          },
        },
        ports: true,
        variables: true,
      },
    });

    if (!environment) {
      throw new NotFoundError('Environment not found');
    }

    // Check access
    await this.checkEnvironmentAccess(environment.project, userId);

    // Check if already running
    if (environment.status === EnvironmentStatus.running) {
      throw new BadRequestError('Environment is already running');
    }

    // Update status to starting
    await this.prisma.environment.update({
      where: { id: environmentId },
      data: { status: EnvironmentStatus.starting },
    });

    try {
      let containerId = environment.containerId;

      // Create container if doesn't exist
      if (!containerId) {
        // Prepare port mappings
        const ports: Record<string, number> = {};
        environment.ports.forEach((p) => {
          if (p.hostPort) {
            ports[p.containerPort] = p.hostPort;
          }
        });

        // Prepare environment variables
        const env = environment.variables.map((v) => `${v.key}=${v.value}`);

        // Create container
        containerId = await this.dockerService.createContainer({
          name: `vibebox-${environment.slug}-${environment.id.substring(0, 8)}`,
          image: environment.baseImage,
          env,
          ports,
          cpuLimit: Number(environment.cpuLimit),
          memoryLimit: environment.memoryLimit,
        });

        // Update environment with container ID
        await this.prisma.environment.update({
          where: { id: environmentId },
          data: { containerId },
        });
      }

      // Start container
      await this.dockerService.startContainer(containerId);

      // Update environment status to running
      const updatedEnvironment = await this.prisma.environment.update({
        where: { id: environmentId },
        data: {
          status: EnvironmentStatus.running,
          startedAt: new Date(),
          errorMessage: null,
        },
      });

      return this.toEnvironmentDTO(updatedEnvironment);
    } catch (error) {
      console.error('Failed to start environment:', error);

      // Update status to error
      await this.prisma.environment.update({
        where: { id: environmentId },
        data: {
          status: EnvironmentStatus.error,
          errorMessage: error instanceof Error ? error.message : 'Failed to start environment',
        },
      });

      throw error;
    }
  }

  /**
   * Stop environment
   *
   * Stops Docker container for environment
   *
   * @param environmentId - Environment ID
   * @param userId - User ID performing action
   * @returns Updated environment
   * @throws {NotFoundError} If environment doesn't exist
   * @throws {ForbiddenError} If user lacks access
   * @throws {BadRequestError} If environment is not running
   *
   * @example
   * ```typescript
   * const envService = new EnvironmentService();
   * const env = await envService.stopEnvironment('env-id-123', 'user-id-456');
   * ```
   */
  async stopEnvironment(environmentId: string, userId: string): Promise<EnvironmentDTO> {
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      include: {
        project: {
          include: {
            owner: true,
            team: { include: { userTeams: true } },
          },
        },
      },
    });

    if (!environment) {
      throw new NotFoundError('Environment not found');
    }

    // Check access
    await this.checkEnvironmentAccess(environment.project, userId);

    // Check if already stopped
    if (environment.status === EnvironmentStatus.stopped) {
      return this.toEnvironmentDTO(environment);
    }

    // Check if container exists
    if (!environment.containerId) {
      throw new BadRequestError('Environment has no container to stop');
    }

    // Update status to stopping
    await this.prisma.environment.update({
      where: { id: environmentId },
      data: { status: EnvironmentStatus.stopping },
    });

    try {
      // Stop container
      await this.dockerService.stopContainer(environment.containerId);

      // Update environment status to stopped
      const updatedEnvironment = await this.prisma.environment.update({
        where: { id: environmentId },
        data: {
          status: EnvironmentStatus.stopped,
          stoppedAt: new Date(),
        },
      });

      return this.toEnvironmentDTO(updatedEnvironment);
    } catch (error) {
      console.error('Failed to stop environment:', error);

      // Update status to error
      await this.prisma.environment.update({
        where: { id: environmentId },
        data: {
          status: EnvironmentStatus.error,
          errorMessage: error instanceof Error ? error.message : 'Failed to stop environment',
        },
      });

      throw error;
    }
  }

  /**
   * Restart environment
   *
   * Restarts Docker container for environment
   *
   * @param environmentId - Environment ID
   * @param userId - User ID performing action
   * @returns Updated environment
   * @throws {NotFoundError} If environment doesn't exist
   * @throws {ForbiddenError} If user lacks access
   *
   * @example
   * ```typescript
   * const envService = new EnvironmentService();
   * const env = await envService.restartEnvironment('env-id-123', 'user-id-456');
   * ```
   */
  async restartEnvironment(environmentId: string, userId: string): Promise<EnvironmentDTO> {
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      include: {
        project: {
          include: {
            owner: true,
            team: { include: { userTeams: true } },
          },
        },
      },
    });

    if (!environment) {
      throw new NotFoundError('Environment not found');
    }

    // Check access
    await this.checkEnvironmentAccess(environment.project, userId);

    if (!environment.containerId) {
      // If no container, just start it
      return this.startEnvironment(environmentId, userId);
    }

    try {
      // Restart container
      await this.dockerService.restartContainer(environment.containerId);

      // Update environment
      const updatedEnvironment = await this.prisma.environment.update({
        where: { id: environmentId },
        data: {
          status: EnvironmentStatus.running,
          startedAt: new Date(),
          errorMessage: null,
        },
      });

      return this.toEnvironmentDTO(updatedEnvironment);
    } catch (error) {
      console.error('Failed to restart environment:', error);

      await this.prisma.environment.update({
        where: { id: environmentId },
        data: {
          status: EnvironmentStatus.error,
          errorMessage: error instanceof Error ? error.message : 'Failed to restart environment',
        },
      });

      throw error;
    }
  }

  /**
   * List environments for project
   *
   * @param projectId - Project ID
   * @param userId - User ID requesting list
   * @param page - Page number (1-indexed)
   * @param limit - Items per page
   * @returns Array of environments
   * @throws {NotFoundError} If project doesn't exist
   * @throws {ForbiddenError} If user lacks access
   *
   * @example
   * ```typescript
   * const envService = new EnvironmentService();
   * const environments = await envService.listEnvironments(
   *   'project-id-123',
   *   'user-id-456',
   *   1,
   *   20
   * );
   * ```
   */
  async listEnvironments(
    projectId: string,
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<EnvironmentDTO[]> {
    // Check if project exists and user has access
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { owner: true, team: { include: { userTeams: true } } },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    await this.checkEnvironmentAccess(project, userId);

    const skip = (page - 1) * limit;

    const environments = await this.prisma.environment.findMany({
      where: { projectId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return environments.map((e) => this.toEnvironmentDTO(e));
  }

  /**
   * Add port mapping to environment
   *
   * @param environmentId - Environment ID
   * @param portMapping - Port mapping data
   * @param userId - User ID performing action
   * @throws {NotFoundError} If environment doesn't exist
   * @throws {ForbiddenError} If user lacks access
   * @throws {ConflictError} If port already mapped
   *
   * @example
   * ```typescript
   * const envService = new EnvironmentService();
   * await envService.addPort('env-id-123', {
   *   containerPort: 3000,
   *   hostPort: 3000,
   *   protocol: Protocol.tcp
   * }, 'user-id-456');
   * ```
   */
  async addPort(environmentId: string, portMapping: PortMapping, userId: string): Promise<void> {
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      include: {
        project: {
          include: {
            owner: true,
            team: { include: { userTeams: true } },
          },
        },
      },
    });

    if (!environment) {
      throw new NotFoundError('Environment not found');
    }

    await this.checkEnvironmentAccess(environment.project, userId);

    // Check if port already exists
    const existingPort = await this.prisma.environmentPort.findUnique({
      where: {
        environmentId_containerPort: {
          environmentId,
          containerPort: portMapping.containerPort,
        },
      },
    });

    if (existingPort) {
      throw new ConflictError('Container port already mapped');
    }

    await this.prisma.environmentPort.create({
      data: {
        environmentId,
        containerPort: portMapping.containerPort,
        hostPort: portMapping.hostPort,
        protocol: portMapping.protocol || Protocol.tcp,
        description: portMapping.description,
      },
    });
  }

  /**
   * Set environment variable
   *
   * @param environmentId - Environment ID
   * @param variable - Environment variable data
   * @param userId - User ID performing action
   * @throws {NotFoundError} If environment doesn't exist
   * @throws {ForbiddenError} If user lacks access
   *
   * @example
   * ```typescript
   * const envService = new EnvironmentService();
   * await envService.setVariable('env-id-123', {
   *   key: 'NODE_ENV',
   *   value: 'production'
   * }, 'user-id-456');
   * ```
   */
  async setVariable(
    environmentId: string,
    variable: EnvironmentVariableData,
    userId: string
  ): Promise<void> {
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      include: {
        project: {
          include: {
            owner: true,
            team: { include: { userTeams: true } },
          },
        },
      },
    });

    if (!environment) {
      throw new NotFoundError('Environment not found');
    }

    await this.checkEnvironmentAccess(environment.project, userId);

    // Upsert variable
    await this.prisma.environmentVariable.upsert({
      where: {
        environmentId_key: {
          environmentId,
          key: variable.key,
        },
      },
      create: {
        environmentId,
        key: variable.key,
        value: variable.value,
        isEncrypted: variable.isEncrypted || false,
      },
      update: {
        value: variable.value,
        isEncrypted: variable.isEncrypted || false,
      },
    });
  }

  /**
   * Get environment status with container details
   *
   * Retrieves current status of environment including Docker container state,
   * uptime, and any error messages.
   *
   * @param environmentId - Environment ID
   * @returns Environment status information
   * @throws {NotFoundError} If environment not found
   *
   * @example
   * ```typescript
   * const status = await environmentService.getEnvironmentStatus('env-123');
   * console.log(status.status); // 'running' | 'stopped' | 'error'
   * console.log(status.uptime); // 3600 (seconds)
   * ```
   */
  async getEnvironmentStatus(environmentId: string): Promise<{
    status: EnvironmentStatus;
    containerStatus?: string;
    uptime?: number;
    lastError?: string | null;
  }> {
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
    });

    if (!environment) {
      throw new NotFoundError('Environment not found');
    }

    let containerStatus: string | undefined;
    let uptime: number | undefined;

    // Get container status if container exists
    if (environment.containerId) {
      try {
        const containerInfo = await this.dockerService.getContainerInfo(environment.containerId);
        containerStatus = containerInfo.status;

        // Calculate uptime if container is running
        if (containerInfo.status === 'running' && environment.startedAt) {
          uptime = Math.floor((Date.now() - environment.startedAt.getTime()) / 1000);
        }
      } catch {
        // Container might not exist anymore, status will reflect database state only
        containerStatus = 'not-found';
      }
    }

    return {
      status: environment.status,
      containerStatus,
      uptime,
      lastError: environment.errorMessage,
    };
  }

  /**
   * Get environment statistics
   *
   * Retrieves resource usage statistics for running environment including
   * CPU, memory, network, and disk usage.
   *
   * @param environmentId - Environment ID
   * @param userId - User ID performing action
   * @returns Environment statistics
   * @throws {NotFoundError} If environment not found
   * @throws {ForbiddenError} If user lacks access
   * @throws {BadRequestError} If environment is not running
   *
   * @example
   * ```typescript
   * const stats = await environmentService.getEnvironmentStats('env-123', 'user-456');
   * console.log(`CPU: ${stats.cpuUsage}%`);
   * console.log(`Memory: ${stats.memoryUsage} MB`);
   * ```
   */
  async getEnvironmentStats(
    environmentId: string,
    userId: string
  ): Promise<{
    cpuUsage: number;
    memoryUsage: number;
    memoryLimit: number;
    networkRx: number;
    networkTx: number;
    diskUsage?: number;
  }> {
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      include: {
        project: {
          include: {
            owner: true,
            team: { include: { userTeams: true } },
          },
        },
      },
    });

    if (!environment) {
      throw new NotFoundError('Environment not found');
    }

    await this.checkEnvironmentAccess(environment.project, userId);

    if (!environment.containerId) {
      throw new BadRequestError('Environment has no associated container');
    }

    if (environment.status !== EnvironmentStatus.running) {
      throw new BadRequestError('Environment is not running');
    }

    // Get container stats from Docker
    const containerStats = await this.dockerService.getContainerStats(environment.containerId);

    return {
      cpuUsage: containerStats.cpuUsage,
      memoryUsage: containerStats.memoryUsage,
      memoryLimit: environment.memoryLimit,
      networkRx: containerStats.networkRx,
      networkTx: containerStats.networkTx,
    };
  }

  /**
   * Remove port mapping from environment
   *
   * Removes a port mapping from environment. If environment is running,
   * requires container restart to apply changes.
   *
   * @param environmentId - Environment ID
   * @param containerPort - Container port to remove
   * @param userId - User ID performing action
   * @throws {NotFoundError} If environment or port not found
   * @throws {ForbiddenError} If user lacks access
   *
   * @example
   * ```typescript
   * await environmentService.removePort('env-123', 8080, 'user-456');
   * // Port 8080 mapping removed
   * ```
   */
  async removePort(environmentId: string, containerPort: number, userId: string): Promise<void> {
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      include: {
        project: {
          include: {
            owner: true,
            team: { include: { userTeams: true } },
          },
        },
        ports: true,
      },
    });

    if (!environment) {
      throw new NotFoundError('Environment not found');
    }

    await this.checkEnvironmentAccess(environment.project, userId);

    // Check if port exists
    const portExists = environment.ports.some((p) => p.containerPort === containerPort);
    if (!portExists) {
      throw new NotFoundError('Port mapping not found');
    }

    // Delete port mapping
    await this.prisma.environmentPort.deleteMany({
      where: {
        environmentId,
        containerPort,
      },
    });
  }

  /**
   * Remove environment variable from environment
   *
   * Removes an environment variable. If environment is running,
   * requires container restart to apply changes.
   *
   * @param environmentId - Environment ID
   * @param key - Variable key to remove
   * @param userId - User ID performing action
   * @throws {NotFoundError} If environment or variable not found
   * @throws {ForbiddenError} If user lacks access
   *
   * @example
   * ```typescript
   * await environmentService.removeEnvironmentVariable('env-123', 'API_KEY', 'user-456');
   * // API_KEY variable removed
   * ```
   */
  async removeEnvironmentVariable(
    environmentId: string,
    key: string,
    userId: string
  ): Promise<void> {
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      include: {
        project: {
          include: {
            owner: true,
            team: { include: { userTeams: true } },
          },
        },
        variables: true,
      },
    });

    if (!environment) {
      throw new NotFoundError('Environment not found');
    }

    await this.checkEnvironmentAccess(environment.project, userId);

    // Check if variable exists
    const variableExists = environment.variables.some((v) => v.key === key);
    if (!variableExists) {
      throw new NotFoundError('Environment variable not found');
    }

    // Delete variable
    await this.prisma.environmentVariable.delete({
      where: {
        environmentId_key: {
          environmentId,
          key,
        },
      },
    });
  }

  /**
   * Check if user has access to project
   *
   * @private
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  private async checkEnvironmentAccess(project: any, userId: string): Promise<void> {
    const hasAccess =
      project.ownerId === userId ||
      (project.team?.userTeams.some((ut: any) => ut.userId === userId) ?? false);

    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this project');
    }
  }

  /**
   * Validate slug format
   *
   * @private
   */
  private isValidSlug(slug: string): boolean {
    const slugRegex = /^[a-z0-9-]{3,50}$/;
    return slugRegex.test(slug);
  }

  /**
   * Convert Environment entity to EnvironmentDTO
   *
   * @private
   */
  private toEnvironmentDTO(environment: Environment): EnvironmentDTO {
    return {
      id: environment.id,
      name: environment.name,
      slug: environment.slug,
      description: environment.description,
      projectId: environment.projectId,
      creatorId: environment.creatorId,
      baseImage: environment.baseImage,
      containerId: environment.containerId,
      status: environment.status,
      errorMessage: environment.errorMessage,
      cpuLimit: Number(environment.cpuLimit),
      memoryLimit: environment.memoryLimit,
      storageLimit: environment.storageLimit,
      createdAt: environment.createdAt,
      updatedAt: environment.updatedAt,
      startedAt: environment.startedAt,
      stoppedAt: environment.stoppedAt,
    };
  }
}
