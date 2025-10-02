/**
 * ExtensionService - VS Code Extension Management Service
 * Handles VS Code extension search, installation, and management
 * Tasks: T074, T058-T061
 */
import { PrismaClient } from '@prisma/client';
import type { Extension, EnvironmentExtension } from '@prisma/client';
import { EnvironmentExtensionStatus } from '@/types/prisma-enums';
import { getPrismaClient } from '@/lib/db';
import { NotFoundError, ValidationError, ConflictError, ForbiddenError } from '@/lib/errors';
import { DockerService } from './docker.service';

/**
 * Extension Data Transfer Object
 */
export interface ExtensionDTO {
  id: string;
  extensionId: string;
  name: string;
  version: string;
  description?: string | null;
  publisher: string;
  iconUrl?: string | null;
  isCustom: boolean;
  downloadUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Environment Extension DTO with full extension details
 */
export interface EnvironmentExtensionDTO {
  id: string;
  environmentId: string;
  extension: ExtensionDTO;
  status: EnvironmentExtensionStatus;
  errorMessage?: string | null;
  installedAt?: Date | null;
  createdAt: Date;
}

/**
 * Extension search result
 */
export interface ExtensionSearchResult {
  extensionId: string;
  name: string;
  version: string;
  description: string;
  publisher: string;
  iconUrl?: string;
  downloadUrl: string;
}

/**
 * ExtensionService - Manages VS Code extensions
 *
 * Provides methods for searching VS Code marketplace, installing extensions
 * in environments, and managing extension catalogs.
 */
export class ExtensionService {
  /**
   * Creates a new ExtensionService instance
   *
   * @param prisma - Prisma client instance for database access
   * @param dockerService - Docker service instance for container operations
   */
  constructor(
    public prisma: PrismaClient = getPrismaClient(),
    private dockerService: DockerService = new DockerService()
  ) {}

  /**
   * Search VS Code marketplace for extensions
   *
   * Searches for extensions by name or keyword
   *
   * @param query - Search query
   * @param limit - Maximum results to return
   * @returns Array of extension search results
   *
   * @example
   * ```typescript
   * const extensionService = new ExtensionService();
   * const results = await extensionService.searchExtensions('typescript', 10);
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async searchExtensions(query: string, limit: number = 10): Promise<ExtensionSearchResult[]> {
    // In production, this would query the VS Code marketplace API
    // For now, return mock data that demonstrates the structure

    // Example: https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery

    // This is a simplified mock - in production, use proper API integration
    const mockResults: ExtensionSearchResult[] = [
      {
        extensionId: 'dbaeumer.vscode-eslint',
        name: 'ESLint',
        version: '2.4.2',
        description: 'Integrates ESLint JavaScript into VS Code',
        publisher: 'dbaeumer',
        iconUrl: 'https://example.com/eslint-icon.png',
        downloadUrl:
          'https://marketplace.visualstudio.com/_apis/public/gallery/publishers/dbaeumer/vsextensions/vscode-eslint/2.4.2/vspackage',
      },
      {
        extensionId: 'esbenp.prettier-vscode',
        name: 'Prettier',
        version: '10.1.0',
        description: 'Code formatter using prettier',
        publisher: 'esbenp',
        iconUrl: 'https://example.com/prettier-icon.png',
        downloadUrl:
          'https://marketplace.visualstudio.com/_apis/public/gallery/publishers/esbenp/vsextensions/prettier-vscode/10.1.0/vspackage',
      },
    ]
      .filter(
        (ext) =>
          ext.name.toLowerCase().includes(query.toLowerCase()) ||
          ext.description.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, limit);

    return mockResults;
  }

  /**
   * Get or create extension in catalog
   *
   * Adds extension to local catalog if not exists
   *
   * @param data - Extension data from marketplace
   * @returns Extension entity
   *
   * @example
   * ```typescript
   * const extensionService = new ExtensionService();
   * const extension = await extensionService.getOrCreateExtension({
   *   extensionId: 'dbaeumer.vscode-eslint',
   *   name: 'ESLint',
   *   version: '2.4.2',
   *   description: 'Integrates ESLint JavaScript into VS Code',
   *   publisher: 'dbaeumer',
   *   downloadUrl: 'https://...'
   * });
   * ```
   */
  async getOrCreateExtension(data: Partial<ExtensionSearchResult>): Promise<ExtensionDTO> {
    if (!data.extensionId || !data.name || !data.version || !data.publisher) {
      throw new ValidationError('Missing required extension fields');
    }

    // Check if extension already exists
    let extension = await this.prisma.extension.findUnique({
      where: { extensionId: data.extensionId },
    });

    if (!extension) {
      // Create extension in catalog
      extension = await this.prisma.extension.create({
        data: {
          extensionId: data.extensionId,
          name: data.name,
          version: data.version,
          description: data.description,
          publisher: data.publisher,
          iconUrl: data.iconUrl,
          downloadUrl: data.downloadUrl,
          isCustom: false,
        },
      });
    } else {
      // Update version if newer
      if (data.version && data.version !== extension.version) {
        extension = await this.prisma.extension.update({
          where: { id: extension.id },
          data: {
            version: data.version,
            description: data.description,
            iconUrl: data.iconUrl,
            downloadUrl: data.downloadUrl,
          },
        });
      }
    }

    return this.toExtensionDTO(extension);
  }

  /**
   * Install extension in environment
   *
   * Installs VS Code extension in environment container
   *
   * @param environmentId - Environment ID
   * @param extensionId - Extension ID (e.g., 'publisher.name')
   * @param userId - User ID performing installation
   * @returns Environment extension record
   * @throws {NotFoundError} If environment or extension doesn't exist
   * @throws {ForbiddenError} If user lacks access
   * @throws {ConflictError} If extension already installed
   *
   * @example
   * ```typescript
   * const extensionService = new ExtensionService();
   * const installed = await extensionService.installExtension(
   *   'env-id-123',
   *   'dbaeumer.vscode-eslint',
   *   'user-id-456'
   * );
   * ```
   */
  async installExtension(
    environmentId: string,
    extensionId: string,
    userId: string
  ): Promise<EnvironmentExtensionDTO> {
    // Check if environment exists and user has access
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

    // Get or search for extension
    let extension = await this.prisma.extension.findUnique({
      where: { extensionId },
    });

    if (!extension) {
      // Search marketplace and add to catalog
      const searchResults = await this.searchExtensions(extensionId, 1);
      const found = searchResults.find((r) => r.extensionId === extensionId);

      if (!found) {
        throw new NotFoundError('Extension not found in marketplace');
      }

      const ext = await this.getOrCreateExtension(found);
      extension = await this.prisma.extension.findUnique({
        where: { id: ext.id },
      });
    }

    if (!extension) {
      throw new NotFoundError('Extension not found');
    }

    // Check if already installed
    const existingInstall = await this.prisma.environmentExtension.findUnique({
      where: {
        environmentId_extensionId: {
          environmentId,
          extensionId: extension.id,
        },
      },
    });

    if (existingInstall) {
      if (existingInstall.status === EnvironmentExtensionStatus.installed) {
        throw new ConflictError('Extension already installed');
      }
      // If failed previously, allow retry
      if (existingInstall.status === EnvironmentExtensionStatus.failed) {
        return this.retryInstallation(existingInstall.id, environment.containerId);
      }
    }

    // Create installation record
    let envExtension = await this.prisma.environmentExtension.create({
      data: {
        environmentId,
        extensionId: extension.id,
        status: EnvironmentExtensionStatus.installing,
      },
      include: {
        extension: true,
      },
    });

    // Install extension in container if running
    if (environment.containerId) {
      try {
        // In production, use code-server CLI: code-server --install-extension
        const command = ['code-server', '--install-extension', extension.extensionId];
        await this.dockerService.execCommand(environment.containerId, command);

        // Update status to installed
        envExtension = await this.prisma.environmentExtension.update({
          where: { id: envExtension.id },
          data: {
            status: EnvironmentExtensionStatus.installed,
            installedAt: new Date(),
          },
          include: {
            extension: true,
          },
        });
      } catch (error) {
        console.error('Failed to install extension:', error);

        // Update status to failed
        await this.prisma.environmentExtension.update({
          where: { id: envExtension.id },
          data: {
            status: EnvironmentExtensionStatus.failed,
            errorMessage: error instanceof Error ? error.message : 'Installation failed',
          },
        });

        throw error;
      }
    } else {
      // Mark as pending if container not running
      envExtension = await this.prisma.environmentExtension.update({
        where: { id: envExtension.id },
        data: {
          status: EnvironmentExtensionStatus.pending,
        },
        include: {
          extension: true,
        },
      });
    }

    return this.toEnvironmentExtensionDTO(envExtension);
  }

  /**
   * Uninstall extension from environment
   *
   * Removes VS Code extension from environment container
   *
   * @param environmentId - Environment ID
   * @param extensionId - Extension ID
   * @param userId - User ID performing uninstallation
   * @throws {NotFoundError} If environment or extension doesn't exist
   * @throws {ForbiddenError} If user lacks access
   *
   * @example
   * ```typescript
   * const extensionService = new ExtensionService();
   * await extensionService.uninstallExtension(
   *   'env-id-123',
   *   'dbaeumer.vscode-eslint',
   *   'user-id-456'
   * );
   * ```
   */
  async uninstallExtension(
    environmentId: string,
    extensionId: string,
    userId: string
  ): Promise<void> {
    // Check if environment exists and user has access
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

    // Find extension
    const extension = await this.prisma.extension.findUnique({
      where: { extensionId },
    });

    if (!extension) {
      throw new NotFoundError('Extension not found');
    }

    // Find installation
    const envExtension = await this.prisma.environmentExtension.findUnique({
      where: {
        environmentId_extensionId: {
          environmentId,
          extensionId: extension.id,
        },
      },
    });

    if (!envExtension) {
      throw new NotFoundError('Extension not installed in environment');
    }

    // Update status to uninstalling
    await this.prisma.environmentExtension.update({
      where: { id: envExtension.id },
      data: {
        status: EnvironmentExtensionStatus.uninstalling,
      },
    });

    // Uninstall from container if running
    if (environment.containerId) {
      try {
        // In production: code-server --uninstall-extension
        const command = ['code-server', '--uninstall-extension', extension.extensionId];
        await this.dockerService.execCommand(environment.containerId, command);
      } catch (error) {
        console.warn('Failed to uninstall extension from container:', error);
      }
    }

    // Remove installation record
    await this.prisma.environmentExtension.delete({
      where: { id: envExtension.id },
    });
  }

  /**
   * List installed extensions for environment
   *
   * @param environmentId - Environment ID
   * @param userId - User ID requesting list
   * @param page - Page number (1-indexed)
   * @param limit - Items per page
   * @returns Array of installed extensions
   * @throws {NotFoundError} If environment doesn't exist
   * @throws {ForbiddenError} If user lacks access
   *
   * @example
   * ```typescript
   * const extensionService = new ExtensionService();
   * const extensions = await extensionService.listInstalledExtensions(
   *   'env-id-123',
   *   'user-id-456',
   *   1,
   *   20
   * );
   * ```
   */
  async listInstalledExtensions(
    environmentId: string,
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<EnvironmentExtensionDTO[]> {
    // Check if environment exists and user has access
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

    const skip = (page - 1) * limit;

    const envExtensions = await this.prisma.environmentExtension.findMany({
      where: { environmentId },
      skip,
      take: limit,
      include: {
        extension: true,
      },
      orderBy: { installedAt: 'desc' },
    });

    return envExtensions.map((ee) => this.toEnvironmentExtensionDTO(ee));
  }

  /**
   * List extensions in catalog
   *
   * @param page - Page number (1-indexed)
   * @param limit - Items per page
   * @returns Array of extensions
   *
   * @example
   * ```typescript
   * const extensionService = new ExtensionService();
   * const extensions = await extensionService.listCatalogExtensions(1, 20);
   * ```
   */
  async listCatalogExtensions(page: number = 1, limit: number = 20): Promise<ExtensionDTO[]> {
    const skip = (page - 1) * limit;

    const extensions = await this.prisma.extension.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return extensions.map((e) => this.toExtensionDTO(e));
  }

  /**
   * Retry failed installation
   *
   * @private
   */
  private async retryInstallation(
    envExtensionId: string,
    containerId: string | null
  ): Promise<EnvironmentExtensionDTO> {
    const envExtension = await this.prisma.environmentExtension.findUnique({
      where: { id: envExtensionId },
      include: { extension: true },
    });

    if (!envExtension) {
      throw new NotFoundError('Extension installation not found');
    }

    // Update status to installing
    await this.prisma.environmentExtension.update({
      where: { id: envExtensionId },
      data: {
        status: EnvironmentExtensionStatus.installing,
        errorMessage: null,
      },
    });

    if (containerId) {
      try {
        const command = ['code-server', '--install-extension', envExtension.extension.extensionId];
        await this.dockerService.execCommand(containerId, command);

        const updated = await this.prisma.environmentExtension.update({
          where: { id: envExtensionId },
          data: {
            status: EnvironmentExtensionStatus.installed,
            installedAt: new Date(),
          },
          include: { extension: true },
        });

        return this.toEnvironmentExtensionDTO(updated);
      } catch (error) {
        await this.prisma.environmentExtension.update({
          where: { id: envExtensionId },
          data: {
            status: EnvironmentExtensionStatus.failed,
            errorMessage: error instanceof Error ? error.message : 'Installation failed',
          },
        });
        throw error;
      }
    } else {
      const updated = await this.prisma.environmentExtension.update({
        where: { id: envExtensionId },
        data: {
          status: EnvironmentExtensionStatus.pending,
        },
        include: { extension: true },
      });

      return this.toEnvironmentExtensionDTO(updated);
    }
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
      throw new ForbiddenError('You do not have access to this environment');
    }
  }

  /**
   * Convert Extension entity to ExtensionDTO
   *
   * @private
   */
  private toExtensionDTO(extension: Extension): ExtensionDTO {
    return {
      id: extension.id,
      extensionId: extension.extensionId,
      name: extension.name,
      version: extension.version,
      description: extension.description,
      publisher: extension.publisher,
      iconUrl: extension.iconUrl,
      isCustom: extension.isCustom,
      downloadUrl: extension.downloadUrl,
      createdAt: extension.createdAt,
      updatedAt: extension.updatedAt,
    };
  }

  /**
   * Convert EnvironmentExtension to DTO
   *
   * @private
   */
  private toEnvironmentExtensionDTO(
    envExtension: EnvironmentExtension & { extension: Extension }
  ): EnvironmentExtensionDTO {
    return {
      id: envExtension.id,
      environmentId: envExtension.environmentId,
      extension: this.toExtensionDTO(envExtension.extension),
      status: envExtension.status,
      errorMessage: envExtension.errorMessage,
      installedAt: envExtension.installedAt,
      createdAt: envExtension.createdAt,
    };
  }
}
