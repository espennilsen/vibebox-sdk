/**
 * Unit Tests: DockerService - Docker Container Management
 * Tests container lifecycle, monitoring, and resource management
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DockerService } from '@/services/docker.service';
import { InternalServerError, NotFoundError, BadRequestError } from '@/lib/errors';

// Mock dockerode
const mockContainer = {
  id: 'container-123',
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  restart: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
  inspect: vi.fn().mockResolvedValue({
    Id: 'container-123',
    Name: '/my-container',
    State: {
      Running: true,
      Status: 'running',
      StartedAt: new Date().toISOString(),
      Error: false,
    },
    Config: { Image: 'node:20-alpine' },
    NetworkSettings: {
      Ports: {
        '3000/tcp': [{ HostPort: '3000' }],
      },
    },
    Created: new Date().toISOString(),
  }),
  stats: vi.fn().mockResolvedValue({
    cpu_stats: {
      cpu_usage: { total_usage: 1000000000 },
      system_cpu_usage: 10000000000,
      online_cpus: 4,
    },
    precpu_stats: {
      cpu_usage: { total_usage: 900000000 },
      system_cpu_usage: 9000000000,
    },
    memory_stats: { usage: 104857600, limit: 4294967296 },
    networks: {
      eth0: { rx_bytes: 1024, tx_bytes: 2048 },
    },
  }),
  logs: vi.fn().mockResolvedValue(Buffer.from('Test log output\n')),
  exec: vi.fn().mockResolvedValue({
    start: vi.fn().mockResolvedValue(undefined),
  }),
};

const mockDocker = {
  createContainer: vi.fn().mockResolvedValue(mockContainer),
  getContainer: vi.fn().mockReturnValue(mockContainer),
  pull: vi.fn().mockResolvedValue({
    on: vi.fn(),
  }),
  modem: {
    followProgress: vi.fn((stream, callback) => {
      callback(null, [{ status: 'Pull complete' }]);
    }),
  },
  listImages: vi.fn().mockResolvedValue([{ RepoTags: ['node:20-alpine'] }]),
};

vi.mock('dockerode', () => ({
  default: vi.fn(() => mockDocker),
}));

describe('DockerService', () => {
  let dockerService: DockerService;

  beforeEach(() => {
    // Reset mock call history but keep implementations
    mockContainer.start.mockClear().mockResolvedValue(undefined);
    mockContainer.stop.mockClear().mockResolvedValue(undefined);
    mockContainer.restart.mockClear().mockResolvedValue(undefined);
    mockContainer.remove.mockClear().mockResolvedValue(undefined);
    mockContainer.inspect.mockClear().mockResolvedValue({
      Id: 'container-123',
      Name: '/my-container',
      State: {
        Running: true,
        Status: 'running',
        StartedAt: new Date().toISOString(),
        Error: false,
      },
      Config: { Image: 'node:20-alpine' },
      NetworkSettings: {
        Ports: {
          '3000/tcp': [{ HostPort: '3000' }],
        },
      },
      Created: new Date().toISOString(),
    });
    mockContainer.stats.mockClear().mockResolvedValue({
      cpu_stats: {
        cpu_usage: { total_usage: 1000000000 },
        system_cpu_usage: 10000000000,
        online_cpus: 4,
      },
      precpu_stats: {
        cpu_usage: { total_usage: 900000000 },
        system_cpu_usage: 9000000000,
      },
      memory_stats: { usage: 104857600, limit: 4294967296 },
      networks: {
        eth0: { rx_bytes: 1024, tx_bytes: 2048 },
      },
    });
    mockContainer.logs.mockClear().mockResolvedValue(Buffer.from('Test log output\n'));
    mockContainer.exec.mockClear().mockResolvedValue({
      start: vi.fn().mockResolvedValue(undefined),
    });
    mockDocker.createContainer.mockClear().mockResolvedValue(mockContainer);
    mockDocker.getContainer.mockClear().mockReturnValue(mockContainer);
    mockDocker.pull.mockClear().mockResolvedValue({ on: vi.fn() });
    mockDocker.modem.followProgress.mockClear();
    mockDocker.listImages.mockClear();

    dockerService = new DockerService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createContainer', () => {
    it('should create container with specified options', async () => {
      // Act
      const containerId = await dockerService.createContainer({
        name: 'test-container',
        image: 'node:20-alpine',
        env: ['NODE_ENV=production'],
        ports: { 3000: 3000 },
        cpuLimit: 2,
        memoryLimit: 4096,
      });

      // Assert
      expect(containerId).toBe('container-123');
      expect(mockDocker.createContainer).toHaveBeenCalled();
    });

    it('should pull image if not exists', async () => {
      // Arrange
      mockDocker.listImages.mockResolvedValue([]);

      // Act
      await dockerService.createContainer({
        name: 'test-container',
        image: 'node:20-alpine',
      });

      // Assert
      expect(mockDocker.pull).toHaveBeenCalled();
    });
  });

  describe('startContainer', () => {
    it('should start container successfully', async () => {
      // Act
      await dockerService.startContainer('container-123');

      // Assert
      expect(mockContainer.start).toHaveBeenCalled();
    });

    it('should throw NotFoundError when container not found', async () => {
      // Arrange
      mockDocker.getContainer = vi.fn().mockReturnValue({
        start: vi.fn().mockRejectedValue({ statusCode: 404 }),
      });

      // Act & Assert
      await expect(dockerService.startContainer('non-existent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('stopContainer', () => {
    it('should stop container successfully', async () => {
      // Act
      await dockerService.stopContainer('container-123');

      // Assert
      expect(mockContainer.stop).toHaveBeenCalled();
    });
  });

  describe('restartContainer', () => {
    it('should restart container successfully', async () => {
      // Act
      await dockerService.restartContainer('container-123');

      // Assert
      expect(mockContainer.restart).toHaveBeenCalled();
    });
  });

  describe('removeContainer', () => {
    it('should remove container successfully', async () => {
      // Act
      await dockerService.removeContainer('container-123');

      // Assert
      expect(mockContainer.remove).toHaveBeenCalled();
    });

    it('should force remove if specified', async () => {
      // Act
      await dockerService.removeContainer('container-123', undefined, true);

      // Assert
      expect(mockContainer.remove).toHaveBeenCalledWith({ force: true });
    });
  });

  describe('getContainerInfo', () => {
    it('should return container information', async () => {
      // Act
      const info = await dockerService.getContainerInfo('container-123');

      // Assert
      expect(info.id).toBe('container-123');
      expect(info.status).toBe('running');
      expect(info.image).toBe('node:20-alpine');
    });
  });

  describe('getContainerStats', () => {
    it('should return container statistics', async () => {
      // Act
      const stats = await dockerService.getContainerStats('container-123');

      // Assert
      expect(stats.cpuUsage).toBeGreaterThanOrEqual(0);
      expect(stats.memoryUsage).toBeGreaterThan(0);
      expect(stats.networkRx).toBe(1024);
      expect(stats.networkTx).toBe(2048);
    });
  });

  describe('getContainerLogs', () => {
    it('should return container logs', async () => {
      // Act
      const logs = await dockerService.getContainerLogs('container-123');

      // Assert
      expect(logs).toContain('Test log output');
    });

    it('should support log options', async () => {
      // Act
      await dockerService.getContainerLogs('container-123', {
        stdout: true,
        stderr: true,
        tail: 100,
      });

      // Assert
      expect(mockContainer.logs).toHaveBeenCalledWith(
        expect.objectContaining({
          stdout: true,
          stderr: true,
          tail: 100,
        })
      );
    });
  });

  describe('executeCommand', () => {
    it('should execute command in container', async () => {
      // Act
      const result = await dockerService.execCommand('container-123', ['echo', 'test']);

      // Assert
      expect(result).toBeDefined();
      expect(mockContainer.exec).toHaveBeenCalled();
    });
  });
});
