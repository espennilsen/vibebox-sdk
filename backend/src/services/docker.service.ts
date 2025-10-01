/**
 * DockerService - Docker Container Management Service
 * Handles Docker container lifecycle, monitoring, and resource management
 * Tasks: T071, T046-T053
 */
import Docker from 'dockerode';
import { InternalServerError, NotFoundError, BadRequestError } from '@/lib/errors';

/**
 * Container status type
 */
export type ContainerStatus = 'running' | 'stopped' | 'error' | 'creating';

/**
 * Container creation options
 */
export interface CreateContainerOptions {
  name: string;
  image: string;
  env?: string[];
  ports?: Record<string, number>; // containerPort -> hostPort
  volumes?: Record<string, string>; // hostPath -> containerPath
  cpuLimit?: number; // CPU cores
  memoryLimit?: number; // Memory in MB
  storageLimit?: number; // Storage in MB (not directly supported by Docker)
}

/**
 * Container information
 */
export interface ContainerInfo {
  id: string;
  name: string;
  status: ContainerStatus;
  image: string;
  ports: Array<{
    containerPort: number;
    hostPort: number;
    protocol: string;
  }>;
  createdAt: Date;
}

/**
 * Container stats
 */
export interface ContainerStats {
  cpuUsage: number; // Percentage
  memoryUsage: number; // MB
  memoryLimit: number; // MB
  networkRx: number; // Bytes received
  networkTx: number; // Bytes transmitted
}

/**
 * Container log options
 */
export interface LogOptions {
  stdout?: boolean;
  stderr?: boolean;
  tail?: number;
  since?: number; // Unix timestamp
  timestamps?: boolean;
}

/**
 * DockerService - Manages Docker container operations
 *
 * Provides methods for creating, starting, stopping, and monitoring
 * Docker containers. Integrates with dockerode library for Docker API access.
 */
export class DockerService {
  private docker: Docker;

  /**
   * Creates a new DockerService instance
   *
   * @param dockerOptions - Docker connection options (optional)
   *
   * @example
   * ```typescript
   * const dockerService = new DockerService();
   * // Or with custom socket
   * const dockerService = new DockerService({ socketPath: '/var/run/docker.sock' });
   * ```
   */
  constructor(dockerOptions?: Docker.DockerOptions) {
    this.docker = new Docker(dockerOptions || { socketPath: '/var/run/docker.sock' });
  }

  /**
   * Create a new container
   *
   * Creates Docker container with specified configuration
   *
   * @param options - Container creation options
   * @returns Container ID
   * @throws {BadRequestError} If image or configuration is invalid
   * @throws {InternalServerError} If Docker operation fails
   *
   * @example
   * ```typescript
   * const dockerService = new DockerService();
   * const containerId = await dockerService.createContainer({
   *   name: 'my-env',
   *   image: 'node:20-alpine',
   *   env: ['NODE_ENV=development'],
   *   ports: { 3000: 3000, 8080: 8080 },
   *   cpuLimit: 2,
   *   memoryLimit: 4096
   * });
   * ```
   */
  async createContainer(options: CreateContainerOptions): Promise<string> {
    try {
      // Pull image if not exists
      await this.pullImage(options.image);

      // Prepare port bindings
      const portBindings: Record<string, Array<{ HostPort: string }>> = {};
      const exposedPorts: Record<string, object> = {};

      if (options.ports) {
        Object.entries(options.ports).forEach(([containerPort, hostPort]) => {
          const key = `${containerPort}/tcp`;
          exposedPorts[key] = {};
          portBindings[key] = [{ HostPort: String(hostPort) }];
        });
      }

      // Prepare volume bindings
      const binds: string[] = [];
      if (options.volumes) {
        Object.entries(options.volumes).forEach(([hostPath, containerPath]) => {
          binds.push(`${hostPath}:${containerPath}`);
        });
      }

      // Prepare resource limits
      const hostConfig: Docker.HostConfig = {
        PortBindings: portBindings,
        Binds: binds.length > 0 ? binds : undefined,
        Memory: options.memoryLimit ? options.memoryLimit * 1024 * 1024 : undefined,
        NanoCpus: options.cpuLimit ? options.cpuLimit * 1e9 : undefined,
      };

      // Create container
      const container = await this.docker.createContainer({
        name: options.name,
        Image: options.image,
        Env: options.env,
        ExposedPorts: exposedPorts,
        HostConfig: hostConfig,
        Tty: true,
        OpenStdin: true,
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
      });

      return container.id;
    } catch (error) {
      console.error('Docker create container error:', error);
      if (error instanceof Error) {
        throw new InternalServerError(`Failed to create container: ${error.message}`);
      }
      throw new InternalServerError('Failed to create container');
    }
  }

  /**
   * Start container
   *
   * Starts a stopped container
   *
   * @param containerId - Container ID
   * @throws {NotFoundError} If container doesn't exist
   * @throws {InternalServerError} If Docker operation fails
   *
   * @example
   * ```typescript
   * const dockerService = new DockerService();
   * await dockerService.startContainer('container-id-123');
   * ```
   */
  async startContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.start();
    } catch (error) {
      console.error('Docker start container error:', error);
      if (error instanceof Error && 'statusCode' in error && error.statusCode === 404) {
        throw new NotFoundError('Container not found');
      }
      if (error instanceof Error) {
        throw new InternalServerError(`Failed to start container: ${error.message}`);
      }
      throw new InternalServerError('Failed to start container');
    }
  }

  /**
   * Stop container
   *
   * Stops a running container gracefully
   *
   * @param containerId - Container ID
   * @param timeout - Timeout in seconds before force kill (default: 10)
   * @throws {NotFoundError} If container doesn't exist
   * @throws {InternalServerError} If Docker operation fails
   *
   * @example
   * ```typescript
   * const dockerService = new DockerService();
   * await dockerService.stopContainer('container-id-123', 15);
   * ```
   */
  async stopContainer(containerId: string, timeout: number = 10): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.stop({ t: timeout });
    } catch (error) {
      console.error('Docker stop container error:', error);
      if (error instanceof Error && 'statusCode' in error && error.statusCode === 404) {
        throw new NotFoundError('Container not found');
      }
      // Container already stopped is not an error
      if (error instanceof Error && 'statusCode' in error && error.statusCode === 304) {
        return;
      }
      if (error instanceof Error) {
        throw new InternalServerError(`Failed to stop container: ${error.message}`);
      }
      throw new InternalServerError('Failed to stop container');
    }
  }

  /**
   * Restart container
   *
   * Restarts a container
   *
   * @param containerId - Container ID
   * @param timeout - Timeout in seconds before force kill (default: 10)
   * @throws {NotFoundError} If container doesn't exist
   * @throws {InternalServerError} If Docker operation fails
   *
   * @example
   * ```typescript
   * const dockerService = new DockerService();
   * await dockerService.restartContainer('container-id-123');
   * ```
   */
  async restartContainer(containerId: string, timeout: number = 10): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.restart({ t: timeout });
    } catch (error) {
      console.error('Docker restart container error:', error);
      if (error instanceof Error && 'statusCode' in error && error.statusCode === 404) {
        throw new NotFoundError('Container not found');
      }
      if (error instanceof Error) {
        throw new InternalServerError(`Failed to restart container: ${error.message}`);
      }
      throw new InternalServerError('Failed to restart container');
    }
  }

  /**
   * Remove container
   *
   * Permanently removes a container
   *
   * @param containerId - Container ID
   * @param force - Force removal of running container (default: false)
   * @throws {NotFoundError} If container doesn't exist
   * @throws {InternalServerError} If Docker operation fails
   *
   * @example
   * ```typescript
   * const dockerService = new DockerService();
   * await dockerService.removeContainer('container-id-123', true);
   * ```
   */
  async removeContainer(containerId: string, force: boolean = false): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.remove({ force });
    } catch (error) {
      console.error('Docker remove container error:', error);
      if (error instanceof Error && 'statusCode' in error && error.statusCode === 404) {
        throw new NotFoundError('Container not found');
      }
      if (error instanceof Error) {
        throw new InternalServerError(`Failed to remove container: ${error.message}`);
      }
      throw new InternalServerError('Failed to remove container');
    }
  }

  /**
   * Get container info
   *
   * Retrieves container information and status
   *
   * @param containerId - Container ID
   * @returns Container information
   * @throws {NotFoundError} If container doesn't exist
   * @throws {InternalServerError} If Docker operation fails
   *
   * @example
   * ```typescript
   * const dockerService = new DockerService();
   * const info = await dockerService.getContainerInfo('container-id-123');
   * console.log(info.status); // 'running' or 'stopped'
   * ```
   */
  async getContainerInfo(containerId: string): Promise<ContainerInfo> {
    try {
      const container = this.docker.getContainer(containerId);
      const data = await container.inspect();

      // Parse port bindings
      const ports: Array<{ containerPort: number; hostPort: number; protocol: string }> = [];
      if (data.NetworkSettings.Ports) {
        Object.entries(data.NetworkSettings.Ports).forEach(([key, bindings]) => {
          if (bindings) {
            const [port, protocol] = key.split('/');
            bindings.forEach((binding) => {
              ports.push({
                containerPort: parseInt(port!, 10),
                hostPort: parseInt(binding.HostPort, 10),
                protocol: protocol!,
              });
            });
          }
        });
      }

      // Determine status
      let status: ContainerStatus = 'stopped';
      if (data.State.Running) {
        status = 'running';
      } else if (data.State.Error) {
        status = 'error';
      }

      return {
        id: data.Id,
        name: data.Name.replace(/^\//, ''), // Remove leading slash
        status,
        image: data.Config.Image,
        ports,
        createdAt: new Date(data.Created),
      };
    } catch (error) {
      console.error('Docker get container info error:', error);
      if (error instanceof Error && 'statusCode' in error && error.statusCode === 404) {
        throw new NotFoundError('Container not found');
      }
      if (error instanceof Error) {
        throw new InternalServerError(`Failed to get container info: ${error.message}`);
      }
      throw new InternalServerError('Failed to get container info');
    }
  }

  /**
   * Get container stats
   *
   * Retrieves real-time container resource usage statistics
   *
   * @param containerId - Container ID
   * @returns Container stats
   * @throws {NotFoundError} If container doesn't exist
   * @throws {InternalServerError} If Docker operation fails
   *
   * @example
   * ```typescript
   * const dockerService = new DockerService();
   * const stats = await dockerService.getContainerStats('container-id-123');
   * console.log(`CPU: ${stats.cpuUsage}%`);
   * ```
   */
  async getContainerStats(containerId: string): Promise<ContainerStats> {
    try {
      const container = this.docker.getContainer(containerId);
      const stats = await container.stats({ stream: false });

      // Calculate CPU usage percentage
      const cpuDelta =
        stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
      const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
      const cpuUsage =
        systemDelta > 0 ? (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100 : 0;

      // Memory usage
      const memoryUsage = stats.memory_stats.usage ? stats.memory_stats.usage / (1024 * 1024) : 0;
      const memoryLimit = stats.memory_stats.limit ? stats.memory_stats.limit / (1024 * 1024) : 0;

      // Network usage
      let networkRx = 0;
      let networkTx = 0;
      if (stats.networks) {
        Object.values(stats.networks).forEach((net: any) => {
          networkRx += net.rx_bytes || 0;
          networkTx += net.tx_bytes || 0;
        });
      }

      return {
        cpuUsage: Math.round(cpuUsage * 100) / 100,
        memoryUsage: Math.round(memoryUsage * 100) / 100,
        memoryLimit: Math.round(memoryLimit * 100) / 100,
        networkRx,
        networkTx,
      };
    } catch (error) {
      console.error('Docker get container stats error:', error);
      if (error instanceof Error && 'statusCode' in error && error.statusCode === 404) {
        throw new NotFoundError('Container not found');
      }
      if (error instanceof Error) {
        throw new InternalServerError(`Failed to get container stats: ${error.message}`);
      }
      throw new InternalServerError('Failed to get container stats');
    }
  }

  /**
   * Get container logs
   *
   * Retrieves container logs
   *
   * @param containerId - Container ID
   * @param options - Log options
   * @returns Log output as string
   * @throws {NotFoundError} If container doesn't exist
   * @throws {InternalServerError} If Docker operation fails
   *
   * @example
   * ```typescript
   * const dockerService = new DockerService();
   * const logs = await dockerService.getContainerLogs('container-id-123', {
   *   stdout: true,
   *   stderr: true,
   *   tail: 100
   * });
   * ```
   */
  async getContainerLogs(containerId: string, options: LogOptions = {}): Promise<string> {
    try {
      const container = this.docker.getContainer(containerId);

      const logOptions = {
        stdout: options.stdout !== false,
        stderr: options.stderr !== false,
        tail: options.tail || 100,
        since: options.since,
        timestamps: options.timestamps || false,
      };

      const stream = await container.logs(logOptions);
      return stream.toString('utf-8');
    } catch (error) {
      console.error('Docker get container logs error:', error);
      if (error instanceof Error && 'statusCode' in error && error.statusCode === 404) {
        throw new NotFoundError('Container not found');
      }
      if (error instanceof Error) {
        throw new InternalServerError(`Failed to get container logs: ${error.message}`);
      }
      throw new InternalServerError('Failed to get container logs');
    }
  }

  /**
   * Execute command in container
   *
   * Executes a command inside a running container
   *
   * @param containerId - Container ID
   * @param command - Command to execute
   * @returns Command output
   * @throws {NotFoundError} If container doesn't exist
   * @throws {BadRequestError} If container is not running
   * @throws {InternalServerError} If Docker operation fails
   *
   * @example
   * ```typescript
   * const dockerService = new DockerService();
   * const output = await dockerService.execCommand('container-id-123', ['ls', '-la']);
   * ```
   */
  async execCommand(containerId: string, command: string[]): Promise<string> {
    try {
      const container = this.docker.getContainer(containerId);

      // Check if container is running
      const info = await container.inspect();
      if (!info.State.Running) {
        throw new BadRequestError('Container is not running');
      }

      // Create exec instance
      const exec = await container.exec({
        Cmd: command,
        AttachStdout: true,
        AttachStderr: true,
      });

      // Start exec
      const stream = await exec.start({ Detach: false });
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      return String(stream);
    } catch (error) {
      console.error('Docker exec command error:', error);
      if (error instanceof BadRequestError) {
        throw error;
      }
      if (error instanceof Error && 'statusCode' in error && error.statusCode === 404) {
        throw new NotFoundError('Container not found');
      }
      if (error instanceof Error) {
        throw new InternalServerError(`Failed to execute command: ${error.message}`);
      }
      throw new InternalServerError('Failed to execute command');
    }
  }

  /**
   * Pull Docker image
   *
   * Pulls image from registry if not already present
   *
   * @private
   * @param image - Image name with optional tag
   * @throws {InternalServerError} If image pull fails
   */
  private async pullImage(image: string): Promise<void> {
    try {
      // Check if image exists locally
      const images = await this.docker.listImages({
        filters: { reference: [image] },
      });

      if (images.length > 0) {
        return; // Image already exists
      }

      // Pull image
      console.log(`Pulling Docker image: ${image}`);
      const stream = await this.docker.pull(image);

      // Wait for pull to complete
      await new Promise((resolve, reject) => {
        this.docker.modem.followProgress(stream, (err, output) => {
          if (err) {
            reject(err);
          } else {
            resolve(output);
          }
        });
      });

      console.log(`Successfully pulled image: ${image}`);
    } catch (error) {
      console.error('Docker pull image error:', error);
      if (error instanceof Error) {
        throw new InternalServerError(`Failed to pull image: ${error.message}`);
      }
      throw new InternalServerError('Failed to pull image');
    }
  }

  /**
   * List all containers
   *
   * Lists all containers (running and stopped)
   *
   * @param all - Include stopped containers (default: true)
   * @returns Array of container information
   *
   * @example
   * ```typescript
   * const dockerService = new DockerService();
   * const containers = await dockerService.listContainers();
   * ```
   */
  async listContainers(all: boolean = true): Promise<ContainerInfo[]> {
    try {
      const containers = await this.docker.listContainers({ all });

      return containers.map((container) => {
        const ports = container.Ports.map((p) => ({
          containerPort: p.PrivatePort,
          hostPort: p.PublicPort || 0,
          protocol: p.Type,
        }));

        let status: ContainerStatus = 'stopped';
        if (container.State === 'running') {
          status = 'running';
        } else if (container.State === 'error' || container.State === 'dead') {
          status = 'error';
        }

        return {
          id: container.Id,
          name: container.Names[0]?.replace(/^\//, '') || 'unknown',
          status,
          image: container.Image,
          ports,
          createdAt: new Date(container.Created * 1000),
        };
      });
    } catch (error) {
      console.error('Docker list containers error:', error);
      if (error instanceof Error) {
        throw new InternalServerError(`Failed to list containers: ${error.message}`);
      }
      throw new InternalServerError('Failed to list containers');
    }
  }
}
