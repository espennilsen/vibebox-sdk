/**
 * Sandboxes resource and Sandbox class
 *
 * Core sandbox management functionality
 */

import type { HttpClient } from '../utils/http-client';
import type { VibeBoxConfig, Environment, CreateSandboxOptions, EnvironmentStatus } from '../types';
import { GitResource } from './git';
import { FilesResource } from './files';
import { ExecutionResource } from './execution';
import { EnvironmentVariablesResource } from './environment-variables';
import { generateSandboxName, slugify } from '../utils/validation';

/**
 * Sandbox instance
 *
 * Represents a single development environment with full API access
 */
export class Sandbox {
  public readonly id: string;
  public readonly name: string;
  public status: EnvironmentStatus;

  // Nested resource accessors
  public readonly git: GitResource;
  public readonly files: FilesResource;
  public readonly execution: ExecutionResource;
  public readonly env: EnvironmentVariablesResource;

  private data: Environment;

  constructor(
    data: Environment,
    private readonly http: HttpClient,
    _config: Required<VibeBoxConfig>
  ) {
    this.data = data;
    this.id = data.id;
    this.name = data.name;
    this.status = data.status;

    // Initialize nested resources
    this.git = new GitResource(this.id, this.http);
    this.files = new FilesResource(this.id, this.http);
    this.execution = new ExecutionResource(this.id, this.http);
    this.env = new EnvironmentVariablesResource(this.id, this.http);
  }

  /**
   * Refresh sandbox data from API
   *
   * @example
   * ```typescript
   * await sandbox.refresh();
   * console.log(`Status: ${sandbox.status}`);
   * ```
   */
  async refresh(): Promise<void> {
    this.data = await this.http.get(`/api/v1/environments/${this.id}`);
    this.status = this.data.status;
  }

  /**
   * Start the sandbox
   *
   * @example
   * ```typescript
   * await sandbox.start();
   * ```
   */
  async start(): Promise<void> {
    await this.http.post(`/api/v1/environments/${this.id}/start`);
    await this.refresh();
  }

  /**
   * Stop the sandbox
   *
   * @example
   * ```typescript
   * await sandbox.stop();
   * ```
   */
  async stop(): Promise<void> {
    await this.http.post(`/api/v1/environments/${this.id}/stop`);
    await this.refresh();
  }

  /**
   * Pause the sandbox (freeze all processes)
   *
   * @example
   * ```typescript
   * await sandbox.pause();
   * ```
   */
  async pause(): Promise<void> {
    await this.http.post(`/api/v1/environments/${this.id}/pause`);
    await this.refresh();
  }

  /**
   * Resume a paused sandbox
   *
   * @example
   * ```typescript
   * await sandbox.resume();
   * ```
   */
  async resume(): Promise<void> {
    await this.http.post(`/api/v1/environments/${this.id}/resume`);
    await this.refresh();
  }

  /**
   * Restart the sandbox
   *
   * @example
   * ```typescript
   * await sandbox.restart();
   * ```
   */
  async restart(): Promise<void> {
    await this.http.post(`/api/v1/environments/${this.id}/restart`);
    await this.refresh();
  }

  /**
   * Destroy the sandbox
   *
   * Warning: This is irreversible!
   *
   * @example
   * ```typescript
   * await sandbox.destroy();
   * ```
   */
  async destroy(): Promise<void> {
    await this.http.delete(`/api/v1/environments/${this.id}`);
  }

  /**
   * Execute code (shorthand for sandbox.execution.execute)
   *
   * @param code - Code to execute
   * @param options - Execution options
   *
   * @example
   * ```typescript
   * const result = await sandbox.run('console.log("Hello!")');
   * console.log(result.stdout);
   * ```
   */
  async run(code: string, options?: any): Promise<any> {
    return this.execution.execute(code, options);
  }

  /**
   * Upload file (shorthand for sandbox.files.upload)
   *
   * @param path - Destination path
   * @param content - File content
   *
   * @example
   * ```typescript
   * await sandbox.upload('/workspace/config.json', JSON.stringify(config));
   * ```
   */
  async upload(path: string, content: string | Buffer): Promise<any> {
    return this.files.upload(path, content);
  }

  /**
   * Download file (shorthand for sandbox.files.download)
   *
   * @param path - File path
   *
   * @example
   * ```typescript
   * const content = await sandbox.download('/workspace/output.txt');
   * ```
   */
  async download(path: string): Promise<Buffer> {
    return this.files.download(path);
  }

  /**
   * Get sandbox raw data
   */
  getRawData(): Environment {
    return { ...this.data };
  }
}

/**
 * Sandboxes resource for creating and managing sandboxes
 */
export class SandboxesResource {
  constructor(
    private readonly http: HttpClient,
    private readonly config: Required<VibeBoxConfig>
  ) {}

  /**
   * Create a new sandbox
   *
   * @param options - Sandbox creation options
   * @returns Sandbox instance
   *
   * @example
   * ```typescript
   * const sandbox = await vb.sandboxes.create({
   *   name: 'my-sandbox',
   *   baseImage: 'node:20-alpine',
   *   autoStart: true
   * });
   * ```
   */
  async create(options: CreateSandboxOptions): Promise<Sandbox> {
    const name = options.name || generateSandboxName();
    const slug = options.slug || slugify(name);

    const response = await this.http.post<Environment>('/api/v1/environments', {
      name,
      slug,
      projectId: options.projectId || this.config.defaultProjectId,
      baseImage: options.baseImage || options.template || 'node:20-alpine',
      cpuLimit: options.cpuLimit || 2.0,
      memoryLimit: options.memoryLimit || 4096,
      storageLimit: options.storageLimit || 20480,
      ephemeral: options.ephemeral || false,
      timeout: options.timeout,
      git: options.git,
      // autoStart defaults to true
      ...(options.autoStart !== false && {}),
    });

    const sandbox = new Sandbox(response, this.http, this.config);

    // Auto-start if requested (default true)
    if (options.autoStart !== false && response.status !== 'running') {
      await sandbox.start();
    }

    return sandbox;
  }

  /**
   * Quick create sandbox (one-liner)
   *
   * @param template - Template name or base image
   * @returns Sandbox instance
   *
   * @example
   * ```typescript
   * const sandbox = await vb.sandboxes.createQuick('node-20');
   * ```
   */
  async createQuick(template: string): Promise<Sandbox> {
    return this.create({
      template,
      autoStart: true,
    });
  }

  /**
   * Get sandbox by ID
   *
   * @param sandboxId - Sandbox ID
   * @returns Sandbox instance
   *
   * @example
   * ```typescript
   * const sandbox = await vb.sandboxes.get('env-id-123');
   * ```
   */
  async get(sandboxId: string): Promise<Sandbox> {
    const env = await this.http.get<Environment>(`/api/v1/environments/${sandboxId}`);
    return new Sandbox(env, this.http, this.config);
  }

  /**
   * List sandboxes in a project
   *
   * @param projectId - Project ID (uses default if not provided)
   * @returns Array of sandboxes
   *
   * @example
   * ```typescript
   * const sandboxes = await vb.sandboxes.list('project-123');
   * sandboxes.forEach(s => console.log(s.name));
   * ```
   */
  async list(projectId?: string): Promise<Sandbox[]> {
    const pid = projectId || this.config.defaultProjectId;
    if (!pid) {
      throw new Error('Project ID required. Provide via parameter or config.defaultProjectId');
    }

    const envs = await this.http.get<Environment[]>(
      `/api/v1/environments/projects/${pid}/environments`
    );

    return envs.map((env) => new Sandbox(env, this.http, this.config));
  }

  /**
   * Delete all sandboxes
   *
   * Warning: This is irreversible!
   *
   * @param sandboxes - Array of sandboxes to destroy
   *
   * @example
   * ```typescript
   * const sandboxes = await vb.sandboxes.list();
   * await vb.sandboxes.destroyAll(sandboxes);
   * ```
   */
  async destroyAll(sandboxes: Sandbox[]): Promise<void> {
    await Promise.all(sandboxes.map((s) => s.destroy()));
  }
}
