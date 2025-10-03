/**
 * Unit Tests: EnvironmentService - Development Environment Management
 * Tests environment lifecycle, Docker orchestration, and resource management
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EnvironmentService } from '@/services/environment.service';
import { PrismaClient, EnvironmentStatus, Protocol } from '@prisma/client';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
  BadRequestError,
} from '@/lib/errors';
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
  createContainer: vi.fn().mockResolvedValue('container-123'),
  startContainer: vi.fn().mockResolvedValue(undefined),
  stopContainer: vi.fn().mockResolvedValue(undefined),
  restartContainer: vi.fn().mockResolvedValue(undefined),
  removeContainer: vi.fn().mockResolvedValue(undefined),
  getContainerInfo: vi.fn().mockResolvedValue({
    id: 'container-123',
    status: 'running',
    image: 'node:20-alpine',
  }),
  getContainerStats: vi.fn().mockResolvedValue({
    cpuUsage: 10.5,
    memoryUsage: 512,
    memoryLimit: 4096,
    networkRx: 1024,
    networkTx: 2048,
  }),
};

const mockPrisma = {
  environment: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  project: {
    findUnique: vi.fn(),
  },
  environmentPort: {
    findUnique: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
  environmentVariable: {
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  $connect: vi.fn(),
  $disconnect: vi.fn(),
} as unknown as PrismaClient;

describe('EnvironmentService', () => {
  let environmentService: EnvironmentService;
  const mockEnvironment = {
    id: 'env-123',
    name: 'Development',
    slug: 'dev',
    description: 'Dev environment',
    projectId: 'project-123',
    creatorId: 'user-123',
    baseImage: 'node:20-alpine',
    containerId: 'container-123',
    status: EnvironmentStatus.running,
    errorMessage: null,
    cpuLimit: 2.0,
    memoryLimit: 4096,
    storageLimit: 20480,
    createdAt: new Date(),
    updatedAt: new Date(),
    startedAt: new Date(),
    stoppedAt: null,
  };

  beforeEach(() => {
    // Clear mock call history but restore implementations
    mockDockerService.createContainer.mockClear().mockResolvedValue('container-123');
    mockDockerService.startContainer.mockClear().mockResolvedValue(undefined);
    mockDockerService.stopContainer.mockClear().mockResolvedValue(undefined);
    mockDockerService.restartContainer.mockClear().mockResolvedValue(undefined);
    mockDockerService.removeContainer.mockClear().mockResolvedValue(undefined);
    mockDockerService.getContainerInfo.mockClear().mockResolvedValue({
      id: 'container-123',
      status: 'running',
      image: 'node:20-alpine',
    });
    mockDockerService.getContainerStats.mockClear().mockResolvedValue({
      cpuUsage: 10.5,
      memoryUsage: 512,
      memoryLimit: 4096,
      networkRx: 1024,
      networkTx: 2048,
    });

    environmentService = new EnvironmentService(mockPrisma, mockDockerService as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createEnvironment', () => {
    it('should create environment successfully', async () => {
      // Arrange
      const mockProject = {
        id: 'project-123',
        ownerId: 'user-123',
        teamId: null,
        owner: { id: 'user-123' },
        team: null,
      };
      mockPrisma.project.findUnique = vi.fn().mockResolvedValue(mockProject);
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(null);
      mockPrisma.environment.create = vi.fn().mockResolvedValue({
        ...mockEnvironment,
        status: EnvironmentStatus.stopped,
        containerId: null,
      });

      // Act
      const result = await environmentService.createEnvironment(
        {
          name: 'Development',
          slug: 'dev',
          projectId: 'project-123',
          baseImage: 'node:20-alpine',
        },
        'user-123'
      );

      // Assert
      expect(result.name).toBe('Development');
      expect(result.status).toBe(EnvironmentStatus.stopped);
    });

    it('should throw ValidationError for invalid name', async () => {
      // Act & Assert
      await expect(
        environmentService.createEnvironment(
          {
            name: '',
            slug: 'dev',
            projectId: 'project-123',
            baseImage: 'node:20-alpine',
          },
          'user-123'
        )
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ConflictError when slug exists in project', async () => {
      // Arrange
      const mockProject = {
        id: 'project-123',
        ownerId: 'user-123',
        teamId: null,
        owner: { id: 'user-123' },
        team: null,
      };
      mockPrisma.project.findUnique = vi.fn().mockResolvedValue(mockProject);
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(mockEnvironment);

      // Act & Assert
      await expect(
        environmentService.createEnvironment(
          {
            name: 'Dev',
            slug: 'dev',
            projectId: 'project-123',
            baseImage: 'node:20-alpine',
          },
          'user-123'
        )
      ).rejects.toThrow(ConflictError);
    });

    it('should throw ForbiddenError when user lacks project access', async () => {
      // Arrange
      const mockProject = {
        id: 'project-123',
        ownerId: 'other-user',
        teamId: null,
        owner: { id: 'other-user' },
        team: null,
      };
      mockPrisma.project.findUnique = vi.fn().mockResolvedValue(mockProject);

      // Act & Assert
      await expect(
        environmentService.createEnvironment(
          {
            name: 'Dev',
            slug: 'dev',
            projectId: 'project-123',
            baseImage: 'node:20-alpine',
          },
          'user-123'
        )
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('startEnvironment', () => {
    it('should start environment successfully', async () => {
      // Arrange
      const stoppedEnv = {
        ...mockEnvironment,
        status: EnvironmentStatus.stopped,
        containerId: null,
        ports: [],
        variables: [],
        project: {
          ownerId: 'user-123',
          teamId: null,
          owner: { id: 'user-123' },
          team: null,
        },
      };
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(stoppedEnv);
      mockPrisma.environment.update = vi
        .fn()
        .mockResolvedValueOnce({ ...stoppedEnv, status: EnvironmentStatus.starting })
        .mockResolvedValueOnce({ ...stoppedEnv, containerId: 'container-123' })
        .mockResolvedValueOnce({ ...mockEnvironment, status: EnvironmentStatus.running });

      // Act
      const result = await environmentService.startEnvironment('env-123', 'user-123');

      // Assert
      expect(result.status).toBe(EnvironmentStatus.running);
      expect(mockDockerService.createContainer).toHaveBeenCalled();
      expect(mockDockerService.startContainer).toHaveBeenCalled();
    });

    it('should throw BadRequestError when already running', async () => {
      // Arrange
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue({
        ...mockEnvironment,
        project: {
          ownerId: 'user-123',
          teamId: null,
          owner: { id: 'user-123' },
          team: null,
        },
      });

      // Act & Assert
      await expect(environmentService.startEnvironment('env-123', 'user-123')).rejects.toThrow(
        BadRequestError
      );
    });
  });

  describe('stopEnvironment', () => {
    it('should stop environment successfully', async () => {
      // Arrange
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue({
        ...mockEnvironment,
        project: {
          ownerId: 'user-123',
          teamId: null,
          owner: { id: 'user-123' },
          team: null,
        },
      });
      mockPrisma.environment.update = vi
        .fn()
        .mockResolvedValueOnce({ ...mockEnvironment, status: EnvironmentStatus.stopping })
        .mockResolvedValueOnce({ ...mockEnvironment, status: EnvironmentStatus.stopped });

      // Act
      const result = await environmentService.stopEnvironment('env-123', 'user-123');

      // Assert
      expect(result.status).toBe(EnvironmentStatus.stopped);
      expect(mockDockerService.stopContainer).toHaveBeenCalled();
    });

    it('should return immediately if already stopped', async () => {
      // Arrange
      const stoppedEnv = {
        ...mockEnvironment,
        status: EnvironmentStatus.stopped,
        project: {
          ownerId: 'user-123',
          teamId: null,
          owner: { id: 'user-123' },
          team: null,
        },
      };
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue(stoppedEnv);

      // Act
      const result = await environmentService.stopEnvironment('env-123', 'user-123');

      // Assert
      expect(result.status).toBe(EnvironmentStatus.stopped);
      expect(mockDockerService.stopContainer).not.toHaveBeenCalled();
    });
  });

  describe('restartEnvironment', () => {
    it('should restart environment successfully', async () => {
      // Arrange
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue({
        ...mockEnvironment,
        project: {
          ownerId: 'user-123',
          teamId: null,
          owner: { id: 'user-123' },
          team: null,
        },
      });
      mockPrisma.environment.update = vi.fn().mockResolvedValue(mockEnvironment);

      // Act
      const result = await environmentService.restartEnvironment('env-123', 'user-123');

      // Assert
      expect(result.status).toBe(EnvironmentStatus.running);
      expect(mockDockerService.restartContainer).toHaveBeenCalled();
    });
  });

  describe('deleteEnvironment', () => {
    it('should delete environment and remove container', async () => {
      // Arrange
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue({
        ...mockEnvironment,
        project: {
          ownerId: 'user-123',
          teamId: null,
          owner: { id: 'user-123' },
          team: null,
        },
      });
      mockPrisma.environment.delete = vi.fn().mockResolvedValue(mockEnvironment);

      // Act
      await environmentService.deleteEnvironment('env-123', 'user-123');

      // Assert
      expect(mockDockerService.stopContainer).toHaveBeenCalled();
      expect(mockDockerService.removeContainer).toHaveBeenCalled();
      expect(mockPrisma.environment.delete).toHaveBeenCalled();
    });
  });

  describe('addPort', () => {
    it('should add port mapping successfully', async () => {
      // Arrange
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue({
        ...mockEnvironment,
        project: {
          ownerId: 'user-123',
          teamId: null,
          owner: { id: 'user-123' },
          team: null,
        },
      });
      mockPrisma.environmentPort.findUnique = vi.fn().mockResolvedValue(null);
      mockPrisma.environmentPort.create = vi.fn().mockResolvedValue({
        id: 'port-123',
        environmentId: 'env-123',
        containerPort: 3000,
        hostPort: 3000,
        protocol: Protocol.tcp,
      });

      // Act
      await environmentService.addPort(
        'env-123',
        { containerPort: 3000, hostPort: 3000, protocol: Protocol.tcp },
        'user-123'
      );

      // Assert
      expect(mockPrisma.environmentPort.create).toHaveBeenCalled();
    });

    it('should throw ConflictError when port already mapped', async () => {
      // Arrange
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue({
        ...mockEnvironment,
        project: {
          ownerId: 'user-123',
          teamId: null,
          owner: { id: 'user-123' },
          team: null,
        },
      });
      mockPrisma.environmentPort.findUnique = vi.fn().mockResolvedValue({
        id: 'port-123',
        containerPort: 3000,
      });

      // Act & Assert
      await expect(
        environmentService.addPort('env-123', { containerPort: 3000, hostPort: 3000 }, 'user-123')
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('setVariable', () => {
    it('should set environment variable successfully', async () => {
      // Arrange
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue({
        ...mockEnvironment,
        project: {
          ownerId: 'user-123',
          teamId: null,
          owner: { id: 'user-123' },
          team: null,
        },
      });
      mockPrisma.environmentVariable.upsert = vi.fn().mockResolvedValue({
        id: 'var-123',
        environmentId: 'env-123',
        key: 'NODE_ENV',
        value: 'production',
        isEncrypted: false,
      });

      // Act
      await environmentService.setVariable(
        'env-123',
        { key: 'NODE_ENV', value: 'production' },
        'user-123'
      );

      // Assert
      expect(mockPrisma.environmentVariable.upsert).toHaveBeenCalled();
    });
  });

  describe('getEnvironmentStats', () => {
    it('should return environment statistics', async () => {
      // Arrange
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue({
        ...mockEnvironment,
        project: {
          ownerId: 'user-123',
          teamId: null,
          owner: { id: 'user-123' },
          team: null,
        },
      });

      // Act
      const stats = await environmentService.getEnvironmentStats('env-123', 'user-123');

      // Assert
      expect(stats.cpuUsage).toBeDefined();
      expect(stats.memoryUsage).toBeDefined();
      expect(stats.memoryLimit).toBe(4096);
    });

    it('should throw BadRequestError when environment not running', async () => {
      // Arrange
      mockPrisma.environment.findUnique = vi.fn().mockResolvedValue({
        ...mockEnvironment,
        status: EnvironmentStatus.stopped,
        project: {
          ownerId: 'user-123',
          teamId: null,
          owner: { id: 'user-123' },
          team: null,
        },
      });

      // Act & Assert
      await expect(
        environmentService.getEnvironmentStats('env-123', 'user-123')
      ).rejects.toThrow(BadRequestError);
    });
  });
});
