/**
 * VibeBox SDK Client
 *
 * Main entry point for interacting with VibeBox API
 */

import type { VibeBoxConfig, CreateSandboxOptions } from './types';
import { resolveConfig } from './config';
import { HttpClient } from './utils/http-client';
import { Sandbox, SandboxesResource, ApiKeysResource } from './resources';

/**
 * VibeBox SDK Client
 *
 * Provides programmatic access to VibeBox sandbox management.
 *
 * @example
 * ```typescript
 * import { VibeBox } from '@vibebox/sdk';
 *
 * // Initialize with API key
 * const vb = new VibeBox({
 *   apiKey: process.env.VIBEBOX_API_KEY,
 *   baseUrl: 'http://localhost:3000'
 * });
 *
 * // Or rely on environment variables
 * const vb = new VibeBox();
 *
 * // Create and use a sandbox
 * const sandbox = await vb.sandbox('node-20');
 * await sandbox.run('console.log("Hello!")');
 * await sandbox.destroy();
 * ```
 */
export class VibeBox {
  private readonly config: Required<VibeBoxConfig>;
  private readonly httpClient: HttpClient;

  // Resource accessors
  public readonly sandboxes: SandboxesResource;
  public readonly apiKeys: ApiKeysResource;

  /**
   * Create a new VibeBox client instance
   *
   * @param config - Client configuration
   * @throws Error if API key is not provided
   */
  constructor(config?: VibeBoxConfig) {
    this.config = resolveConfig(config);
    this.httpClient = new HttpClient(this.config);

    // Initialize resources
    this.sandboxes = new SandboxesResource(this.httpClient, this.config);
    this.apiKeys = new ApiKeysResource(this.httpClient);
  }

  /**
   * One-liner sandbox creation
   *
   * Creates a sandbox with auto-start enabled.
   *
   * @param template - Template name or base image
   * @returns Sandbox instance
   *
   * @example
   * ```typescript
   * const sandbox = await vb.sandbox('node-20');
   * ```
   */
  async sandbox(template: string): Promise<Sandbox> {
    return this.sandboxes.createQuick(template);
  }

  /**
   * Create sandbox with full options
   *
   * @param options - Sandbox creation options
   * @returns Sandbox instance
   *
   * @example
   * ```typescript
   * const sandbox = await vb.create({
   *   name: 'my-dev-environment',
   *   template: 'node-20-claude-code',
   *   autoStart: true,
   *   ephemeral: true,
   *   timeout: '2h',
   *   git: {
   *     url: 'https://github.com/user/project.git',
   *     branch: 'main'
   *   }
   * });
   * ```
   */
  async create(options: CreateSandboxOptions): Promise<Sandbox> {
    return this.sandboxes.create(options);
  }

  /**
   * Create multiple sandboxes in parallel
   *
   * @param options - Array of sandbox creation options
   * @returns Array of sandbox instances
   *
   * @example
   * ```typescript
   * const sandboxes = await vb.createMany([
   *   { template: 'node-20', name: 'worker-1' },
   *   { template: 'node-20', name: 'worker-2' },
   *   { template: 'python-3.11', name: 'ml-processor' }
   * ]);
   * ```
   */
  async createMany(options: CreateSandboxOptions[]): Promise<Sandbox[]> {
    return Promise.all(options.map((opt) => this.create(opt)));
  }

  /**
   * Context manager pattern for auto-cleanup
   *
   * Creates a sandbox, executes a function with it, and automatically
   * destroys the sandbox when done (even if an error occurs).
   *
   * @param template - Template name or base image
   * @param fn - Function to execute with the sandbox
   * @returns Result of the function
   *
   * @example
   * ```typescript
   * const result = await vb.withSandbox('node-20', async (sandbox) => {
   *   await sandbox.git.clone('https://github.com/user/repo.git');
   *   await sandbox.run('npm install');
   *   return await sandbox.run('npm test');
   * }); // Sandbox automatically destroyed after block
   * ```
   */
  async withSandbox<T>(
    template: string,
    fn: (sandbox: Sandbox) => Promise<T>
  ): Promise<T> {
    const sandbox = await this.sandbox(template);
    try {
      return await fn(sandbox);
    } finally {
      await sandbox.destroy().catch(() => {
        // Ignore errors during cleanup
      });
    }
  }

  /**
   * Get current configuration
   *
   * @returns Current client configuration
   */
  getConfig(): Required<VibeBoxConfig> {
    return { ...this.config };
  }
}
