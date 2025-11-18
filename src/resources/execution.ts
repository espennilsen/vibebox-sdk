/**
 * Code execution resource
 *
 * Provides methods for executing code within a sandbox:
 * - Execute code snippets
 * - List execution history
 * - Get execution details
 * - Cancel running executions
 * - Get supported languages
 */

import type { HttpClient } from '../utils/http-client';
import type {
  ExecutionOptions,
  ExecutionResult,
  Execution,
  ProgrammingLanguage,
} from '../types';

/**
 * Code execution resource class
 */
export class ExecutionResource {
  constructor(
    private readonly environmentId: string,
    private readonly http: HttpClient
  ) {}

  /**
   * Execute code in the sandbox
   *
   * @param code - Code to execute
   * @param options - Execution options
   * @returns Execution result with stdout, stderr, and exit code
   *
   * @example
   * ```typescript
   * // Execute JavaScript
   * const result = await sandbox.execution.execute(`
   *   console.log('Hello, World!');
   *   return 42;
   * `);
   * console.log(result.stdout); // "Hello, World!"
   * console.log(result.exitCode); // 0
   *
   * // Execute with options
   * const result = await sandbox.execution.execute(
   *   'console.log(process.env.API_KEY)',
   *   {
   *     language: 'javascript',
   *     timeout: 10000,
   *     env: { API_KEY: 'secret' }
   *   }
   * );
   *
   * // Execute Python
   * const result = await sandbox.execution.execute(
   *   'print("Hello from Python")',
   *   { language: 'python' }
   * );
   * ```
   */
  async execute(code: string, options?: ExecutionOptions): Promise<ExecutionResult> {
    return this.http.post<ExecutionResult>(
      `/api/v1/environments/${this.environmentId}/execute`,
      {
        code,
        language: options?.language || 'javascript',
        timeout: options?.timeout || 30000,
        env: options?.env,
      },
      {
        params: {
          stream: options?.stream || false,
        },
      }
    );
  }

  /**
   * List execution history for this sandbox
   *
   * @param limit - Maximum number of executions to return (default: 50)
   * @returns Array of executions
   *
   * @example
   * ```typescript
   * const executions = await sandbox.execution.list();
   * executions.forEach(exec => {
   *   console.log(`${exec.id}: ${exec.status} (${exec.exitCode})`);
   * });
   *
   * // Get recent executions
   * const recent = await sandbox.execution.list(10);
   * ```
   */
  async list(limit: number = 50): Promise<Execution[]> {
    return this.http.get<Execution[]>(
      `/api/v1/environments/${this.environmentId}/execute`,
      {
        params: { limit },
      }
    );
  }

  /**
   * Get execution details by ID
   *
   * @param executionId - Execution ID
   * @returns Execution details
   *
   * @example
   * ```typescript
   * const execution = await sandbox.execution.get('exec-id-123');
   * console.log(`Exit code: ${execution.exitCode}`);
   * console.log(`Duration: ${execution.duration}ms`);
   * console.log(`Output: ${execution.stdout}`);
   * ```
   */
  async get(executionId: string): Promise<Execution> {
    return this.http.get<Execution>(
      `/api/v1/environments/${this.environmentId}/execute/${executionId}`
    );
  }

  /**
   * Cancel a running execution
   *
   * @param executionId - Execution ID to cancel
   *
   * @example
   * ```typescript
   * const result = await sandbox.execution.execute('while(true) {}', { timeout: 60000 });
   * // In another context
   * await sandbox.execution.cancel(result.executionId);
   * ```
   */
  async cancel(executionId: string): Promise<void> {
    await this.http.delete(
      `/api/v1/environments/${this.environmentId}/execute/${executionId}`
    );
  }

  /**
   * Get list of supported programming languages
   *
   * @returns Array of supported language names
   *
   * @example
   * ```typescript
   * const languages = await sandbox.execution.languages();
   * console.log('Supported languages:', languages);
   * // ['javascript', 'typescript', 'python', 'bash', 'sh']
   * ```
   */
  async languages(): Promise<ProgrammingLanguage[]> {
    const response = await this.http.get<{ languages: ProgrammingLanguage[] }>(
      `/api/v1/environments/${this.environmentId}/execute/languages`
    );
    return response.languages;
  }
}
