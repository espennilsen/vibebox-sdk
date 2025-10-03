/**
 * DockerService - Docker Container Management Service
 * Handles Docker container lifecycle, monitoring, and resource management
 * Tasks: T071, T046-T053
 */
import Docker from 'dockerode';
import { InternalServerError, NotFoundError, BadRequestError } from '@/lib/errors';
import {
  DockerSecurityService,
  SecurityPolicy,
  DEFAULT_SECURITY_POLICY,
  SecurityPolicyViolationError,
} from './docker-security.service';
import { logger } from '@/lib/logger';

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
 * Parsed log entry with metadata from Docker
 */
export interface DockerLogEntry {
  stream: 'stdout' | 'stderr';
  message: string;
  timestamp: Date;
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
   * Create a new container with security hardening
   *
   * Creates Docker container with specified configuration and applies security policies
   *
   * @param options - Container creation options
   * @param environmentId - Environment ID for network isolation (optional)
   * @param securityPolicy - Security policy to enforce (optional, uses DEFAULT_SECURITY_POLICY)
   * @returns Container ID
   * @throws {BadRequestError} If image or configuration is invalid
   * @throws {SecurityPolicyViolationError} If security policy is violated
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
   * }, 'env-uuid-123');
   * ```
   */
  async createContainer(
    options: CreateContainerOptions,
    environmentId?: string,
    securityPolicy: SecurityPolicy = DEFAULT_SECURITY_POLICY
  ): Promise<string> {
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

      // Build container config
      let containerConfig: Docker.ContainerCreateOptions = {
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
      };

      // Apply security hardening
      containerConfig = DockerSecurityService.applySecurityHardening(
        containerConfig,
        securityPolicy
      );

      // Validate security policy
      DockerSecurityService.validateContainerConfig(containerConfig, securityPolicy);

      // Create isolated network if environment ID provided
      if (environmentId && securityPolicy.networkIsolation === 'isolated') {
        const networkId = await DockerSecurityService.createIsolatedNetwork(
          this.docker,
          environmentId
        );
        const networkName = `vibebox-env-${environmentId}`;
        containerConfig.HostConfig = containerConfig.HostConfig || {};

        // Use both NetworkMode and EndpointsConfig to ensure proper network attachment
        containerConfig.HostConfig.NetworkMode = networkName;
        (containerConfig as any).NetworkingConfig = {
          EndpointsConfig: { [networkName]: {} },
        };

        logger.info(
          { environmentId, networkId, networkName, container: options.name },
          'Attached container to isolated network'
        );
      }

      // Create container
      const container = await this.docker.createContainer(containerConfig);

      logger.info(
        {
          containerId: container.id,
          image: options.image,
          environmentId,
          securityPolicy: {
            enforceNonRoot: securityPolicy.enforceNonRoot,
            preventDockerSocket: securityPolicy.preventDockerSocket,
            networkIsolation: securityPolicy.networkIsolation,
          },
        },
        'Container created with security hardening'
      );

      return container.id;
    } catch (error) {
      if (error instanceof SecurityPolicyViolationError) {
        logger.error(
          { violations: error.violations, image: options.image },
          'Security policy violation'
        );
        throw new BadRequestError(`Security policy violation: ${error.violations.join('; ')}`);
      }

      logger.error({ error, options }, 'Docker create container error');
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
      // Check for 404 error first (container not found)
      if (
        typeof error === 'object' &&
        error !== null &&
        'statusCode' in error &&
        error.statusCode === 404
      ) {
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
      // Check for 404 error first (container not found)
      if (
        typeof error === 'object' &&
        error !== null &&
        'statusCode' in error &&
        error.statusCode === 404
      ) {
        throw new NotFoundError('Container not found');
      }
      // Container already stopped is not an error
      if (
        typeof error === 'object' &&
        error !== null &&
        'statusCode' in error &&
        error.statusCode === 304
      ) {
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
      // Check for 404 error first (container not found)
      if (
        typeof error === 'object' &&
        error !== null &&
        'statusCode' in error &&
        error.statusCode === 404
      ) {
        throw new NotFoundError('Container not found');
      }
      if (error instanceof Error) {
        throw new InternalServerError(`Failed to restart container: ${error.message}`);
      }
      throw new InternalServerError('Failed to restart container');
    }
  }

  /**
   * Remove container and cleanup isolated network
   *
   * Permanently removes a container and cleans up associated isolated network
   *
   * @param containerId - Container ID
   * @param environmentId - Environment ID for network cleanup (optional)
   * @param force - Force removal of running container (default: false)
   * @throws {NotFoundError} If container doesn't exist
   * @throws {InternalServerError} If Docker operation fails
   *
   * @example
   * ```typescript
   * const dockerService = new DockerService();
   * await dockerService.removeContainer('container-id-123', 'env-uuid-123', true);
   * ```
   */
  async removeContainer(
    containerId: string,
    environmentId?: string,
    force: boolean = false
  ): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.remove({ force });

      // Cleanup isolated network if environment ID provided
      if (environmentId) {
        await DockerSecurityService.removeIsolatedNetwork(this.docker, environmentId);
        logger.info({ containerId, environmentId }, 'Container and network removed');
      } else {
        logger.info({ containerId }, 'Container removed');
      }
    } catch (error) {
      logger.error({ error, containerId }, 'Docker remove container error');
      // Check for 404 error first (container not found)
      if (
        typeof error === 'object' &&
        error !== null &&
        'statusCode' in error &&
        error.statusCode === 404
      ) {
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
   * Stream container logs in real-time with proper metadata parsing
   *
   * Streams container logs and properly parses Docker's multiplexed stream format
   * to extract stream type (stdout/stderr) and timestamps from the actual Docker data.
   *
   * Docker log format:
   * - With timestamps: "2023-01-01T12:00:00.000000000Z message text"
   * - Stream header: 8-byte header with stream type in first byte (1=stdout, 2=stderr)
   *
   * @param containerId - Container ID
   * @param callback - Callback function called for each parsed log entry
   * @param options - Log options (timestamps should be true for accurate timing)
   * @returns Function to stop streaming
   * @throws {NotFoundError} If container doesn't exist
   * @throws {InternalServerError} If Docker operation fails
   *
   * @example
   * ```typescript
   * const dockerService = new DockerService();
   * const stopStreaming = await dockerService.streamContainerLogs(
   *   'container-id-123',
   *   (logEntry) => {
   *     console.log(`[${logEntry.stream}] ${logEntry.timestamp}: ${logEntry.message}`);
   *   },
   *   { follow: true, timestamps: true }
   * );
   * // Later: stopStreaming();
   * ```
   */
  async streamContainerLogs(
    containerId: string,
    callback: (logEntry: DockerLogEntry) => void,
    options: LogOptions & { follow?: boolean } = {}
  ): Promise<() => void> {
    try {
      const container = this.docker.getContainer(containerId);

      const logOptions: Docker.ContainerLogsOptions & { follow: true } = {
        stdout: options.stdout !== false,
        stderr: options.stderr !== false,
        tail: options.tail || 100,
        since: options.since,
        timestamps: options.timestamps !== false, // Default to true for accurate timestamps
        follow: true, // Always follow for streaming
      };

      const stream = await container.logs(logOptions);

      // Parse Docker's multiplexed stream format
      // Format: [stream_type, 0, 0, 0, size_bytes(4)] + payload
      // stream_type: 1=stdout, 2=stderr, 3=stdin
      // Maintain a persistent buffer to handle frames split across TCP chunks
      let buffer = Buffer.alloc(0);

      stream.on('data', (chunk: Buffer) => {
        try {
          // Concatenate new data to existing buffer
          buffer = Buffer.concat([buffer, chunk]);
          let offset = 0;

          while (buffer.length - offset >= 8) {
            // Read stream type from first byte
            const streamType = buffer[offset];
            // Read payload size from bytes 4-7 (big-endian uint32)
            const payloadSize = buffer.readUInt32BE(offset + 4);
            const frameLength = 8 + payloadSize;

            // Check if we have the complete frame (header + payload)
            if (buffer.length - offset < frameLength) {
              break;
            }

            // Extract payload
            const payload = buffer.slice(offset + 8, offset + frameLength).toString('utf-8');
            offset += frameLength;

            // Determine stream type
            const stream: 'stdout' | 'stderr' = streamType === 2 ? 'stderr' : 'stdout';

            // Parse timestamp and message from payload
            // Format: "2023-01-01T12:00:00.000000000Z message text"
            let timestamp: Date;
            let message: string;

            if (options.timestamps !== false) {
              // Extract timestamp (ISO 8601 format with nanoseconds)
              const spaceIndex = payload.indexOf(' ');
              if (spaceIndex > 0) {
                const timestampStr = payload.substring(0, spaceIndex);
                timestamp = new Date(timestampStr);
                message = payload.substring(spaceIndex + 1);
              } else {
                // Fallback if no space found
                timestamp = new Date();
                message = payload;
              }
            } else {
              timestamp = new Date();
              message = payload;
            }

            // Trim newlines but preserve intentional line breaks
            message = message.trimEnd();

            if (message) {
              callback({
                stream,
                message,
                timestamp,
              });
            }
          }

          // Remove processed data from buffer, keep remainder for next chunk
          if (offset > 0) {
            buffer = buffer.slice(offset);
          }
        } catch (error) {
          console.error('Error parsing Docker log stream:', error);
        }
      });

      stream.on('end', () => {
        if (buffer.length > 0) {
          console.warn('Docker log stream ended with incomplete frame');
        }
      });

      stream.on('error', (error) => {
        console.error('Docker log stream error:', error);
      });

      // Return cleanup function
      return () => {
        const anyStream = stream as any;
        if (anyStream && typeof anyStream.destroy === 'function') {
          anyStream.destroy();
        }
      };
    } catch (error) {
      console.error('Docker stream container logs error:', error);
      if (error instanceof Error && 'statusCode' in error && error.statusCode === 404) {
        throw new NotFoundError('Container not found');
      }
      if (error instanceof Error) {
        throw new InternalServerError(`Failed to stream container logs: ${error.message}`);
      }
      throw new InternalServerError('Failed to stream container logs');
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
      // eslint-disable-next-line no-console
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

      // eslint-disable-next-line no-console
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
