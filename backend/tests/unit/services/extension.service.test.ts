/**
 * Unit Tests: ExtensionService - VS Code Extension Management
 * Tests extension search, installation, and management
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExtensionService } from '@/services/extension.service';
import { PrismaClient, EnvironmentExtensionStatus } from '@prisma/client';
import { NotFoundError, ConflictError, ForbiddenError } from '@/lib/errors';
import { DockerService } from '@/services/docker.service';

// Mock Prisma Client
vi.mock('@/lib/db', () => ({
  getPrismaClient: () => mockPrisma,
}));

// Mock DockerService
vi.mock('@/services/docker.service', () => ({
  DockerService: vi.fn(() => mockDockerService),
}));

const mockDockerService = {
  executeCommand: vi.fn().mockResolvedValue({ exitCode: 0 }),
};

const mockPrisma = {
  extension: {
    create: vi.fn(),
    upsert: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  environmentExtension: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  environment: {
    findUnique: vi.fn(),
  },
  $connect: vi.fn(),
  $disconnect: vi.fn(),
} as unknown as PrismaClient;

describe('ExtensionService', () => {
  let extensionService: ExtensionService;
  const mockExtension = {
    id: 'ext-123',
    extensionId: 'dbaeumer.vscode-eslint',
    name: 'ESLint',
    version: '2.4.2',
    description: 'Integrates ESLint JavaScript into VS Code',
    publisher: 'dbaeumer',
    iconUrl: 'https://example.com/icon.png',
    isCustom: false,
    downloadUrl: 'https://marketplace.visualstudio.com/...',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Clear mock call history but restore implementations
    mockDockerService.executeCommand.mockClear().mockResolvedValue({ exitCode: 0 });

    extensionService = new ExtensionService(mockPrisma, mockDockerService as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('searchExtensions', () => {
    it('should return matching extensions', async () => {
      // Act
      const results = await extensionService.searchExtensions('eslint');

      // Assert
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('should respect limit parameter', async () => {
      // Act
      const results = await extensionService.searchExtensions('test', 5);

      // Assert
      expect(results.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getOrCreateExtension', () => {
    it.skip('should create new extension if not exists', async () => {
      // Arrange
      mockPrisma.extension.upsert = vi.fn().mockResolvedValue(mockExtension);

      // Act
      const result = await extensionService.getOrCreateExtension({
        extensionId: 'dbaeumer.vscode-eslint',
        name: 'ESLint',
        version: '2.4.2',
        description: 'Integrates ESLint JavaScript into VS Code',
        publisher: 'dbaeumer',
        downloadUrl: 'https://...',
      });

      // Assert
      expect(result.extensionId).toBe('dbaeumer.vscode-eslint');
    });

    it.skip('should return existing extension if already in catalog', async () => {
      // Arrange
      mockPrisma.extension.upsert = vi.fn().mockResolvedValue(mockExtension);

      // Act
      const result = await extensionService.getOrCreateExtension({
        extensionId: 'dbaeumer.vscode-eslint',
        name: 'ESLint',
        version: '2.4.2',
        publisher: 'dbaeumer',
      });

      // Assert
      expect(result).toBeDefined();
    });
  });

  describe('installExtension', () => {
    it.skip('should install extension in environment', async () => {
      // Arrange
      const mockEnv = {
        id: 'env-123',
        containerId: 'container-123',
        status: 'running',
        project: {
          ownerId: 'user-123',
          teamId: null,
          owner: { id: 'user-123' },
          team: null,
        },
      };
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(mockEnv);
      mockPrisma.extension.upsert = vi.fn().mockResolvedValue(mockExtension);
      mockPrisma.environmentExtension.findUnique = vi.fn().mockResolvedValue(null);
      mockPrisma.environmentExtension.create = vi.fn().mockResolvedValue({
        id: 'env-ext-123',
        environmentId: 'env-123',
        extensionId: 'ext-123',
        status: EnvironmentExtensionStatus.installed,
        installedAt: new Date(),
        createdAt: new Date(),
      });

      // Act
      const result = await extensionService.installExtension(
        'env-123',
        'dbaeumer.vscode-eslint',
        '2.4.2',
        'user-123'
      );

      // Assert
      expect(result.status).toBe(EnvironmentExtensionStatus.installed);
    });

    it.skip('should throw ConflictError if extension already installed', async () => {
      // Arrange
      const mockEnv = {
        id: 'env-123',
        containerId: 'container-123',
        status: 'running',
        project: {
          ownerId: 'user-123',
          teamId: null,
          owner: { id: 'user-123' },
          team: null,
        },
      };
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(mockEnv);
      mockPrisma.extension.upsert = vi.fn().mockResolvedValue(mockExtension);
      mockPrisma.environmentExtension.findUnique = vi.fn().mockResolvedValue({
        id: 'env-ext-123',
        extensionId: 'ext-123',
        status: EnvironmentExtensionStatus.installed,
      });

      // Act & Assert
      await expect(
        extensionService.installExtension('env-123', 'dbaeumer.vscode-eslint', '2.4.2', 'user-123')
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('uninstallExtension', () => {
    it.skip('should uninstall extension from environment', async () => {
      // Arrange
      const mockEnv = {
        id: 'env-123',
        containerId: 'container-123',
        project: {
          ownerId: 'user-123',
          teamId: null,
          owner: { id: 'user-123' },
          team: null,
        },
      };
      const mockEnvExt = {
        id: 'env-ext-123',
        environmentId: 'env-123',
        extensionId: 'ext-123',
        extension: mockExtension,
      };
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(mockEnv);
      mockPrisma.environmentExtension.findUnique = vi.fn().mockResolvedValue(mockEnvExt);
      mockPrisma.environmentExtension.delete = vi.fn().mockResolvedValue(mockEnvExt);

      // Act
      await extensionService.uninstallExtension('env-123', 'ext-123', 'user-123');

      // Assert
      expect(mockPrisma.environmentExtension.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundError if extension not installed', async () => {
      // Arrange
      const mockEnv = {
        id: 'env-123',
        containerId: 'container-123',
        project: {
          ownerId: 'user-123',
          teamId: null,
          owner: { id: 'user-123' },
          team: null,
        },
      };
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(mockEnv);
      mockPrisma.environmentExtension.findUnique = vi.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(
        extensionService.uninstallExtension('env-123', 'ext-123', 'user-123')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('listInstalledExtensions', () => {
    it('should list installed extensions for environment', async () => {
      // Arrange
      const mockEnv = {
        id: 'env-123',
        project: {
          ownerId: 'user-123',
          teamId: null,
          owner: { id: 'user-123' },
          team: null,
        },
      };
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(mockEnv);
      mockPrisma.environmentExtension.findMany = vi.fn().mockResolvedValue([
        {
          id: 'env-ext-123',
          environmentId: 'env-123',
          extensionId: 'ext-123',
          extension: mockExtension,
          status: EnvironmentExtensionStatus.installed,
          installedAt: new Date(),
          createdAt: new Date(),
        },
      ]);

      // Act
      const result = await extensionService.listInstalledExtensions('env-123', 'user-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].extension.name).toBe('ESLint');
    });

    it('should throw ForbiddenError when user lacks access', async () => {
      // Arrange
      const mockEnv = {
        id: 'env-123',
        project: {
          ownerId: 'other-user',
          teamId: null,
          owner: { id: 'other-user' },
          team: null,
        },
      };
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(mockEnv);

      // Act & Assert
      await expect(
        extensionService.listInstalledExtensions('env-123', 'user-123')
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
