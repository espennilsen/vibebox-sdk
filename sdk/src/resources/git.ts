/**
 * Git operations resource
 *
 * Provides methods for git operations within a sandbox:
 * - Clone repositories
 * - Pull/push changes
 * - Commit changes
 * - Checkout branches
 * - Get status and diff
 */

import type { HttpClient } from '../utils/http-client';
import type {
  GitCloneOptions,
  GitCloneResult,
  GitPullOptions,
  GitPullResult,
  GitPushOptions,
  GitPushResult,
  GitCommitOptions,
  GitCommitResult,
  GitCheckoutOptions,
  GitStatus,
  GitDiff,
} from '../types';

/**
 * Git operations resource class
 */
export class GitResource {
  constructor(
    private readonly environmentId: string,
    private readonly http: HttpClient
  ) {}

  /**
   * Clone a git repository into the sandbox
   *
   * @param url - Repository URL
   * @param options - Clone options
   * @returns Clone result with path and branch information
   *
   * @example
   * ```typescript
   * await sandbox.git.clone('https://github.com/user/repo.git');
   *
   * await sandbox.git.clone('https://github.com/user/repo.git', {
   *   branch: 'develop',
   *   path: '/workspace/my-repo',
   *   depth: 1,
   *   auth: {
   *     type: 'token',
   *     token: 'ghp_xxxxx'
   *   }
   * });
   * ```
   */
  async clone(url: string, options?: GitCloneOptions): Promise<GitCloneResult> {
    return this.http.post<GitCloneResult>(
      `/api/v1/environments/${this.environmentId}/git/clone`,
      {
        url,
        branch: options?.branch,
        path: options?.path || '/workspace',
        depth: options?.depth,
        auth: options?.auth,
      }
    );
  }

  /**
   * Pull latest changes from remote
   *
   * @param options - Pull options
   * @returns Pull result with updated files count
   *
   * @example
   * ```typescript
   * await sandbox.git.pull();
   * await sandbox.git.pull({ remote: 'origin', branch: 'main' });
   * ```
   */
  async pull(options?: GitPullOptions): Promise<GitPullResult> {
    return this.http.post<GitPullResult>(
      `/api/v1/environments/${this.environmentId}/git/pull`,
      options
    );
  }

  /**
   * Push local commits to remote
   *
   * @param options - Push options
   * @returns Push result
   *
   * @example
   * ```typescript
   * await sandbox.git.push();
   * await sandbox.git.push({ remote: 'origin', branch: 'main', force: false });
   * ```
   */
  async push(options?: GitPushOptions): Promise<GitPushResult> {
    return this.http.post<GitPushResult>(
      `/api/v1/environments/${this.environmentId}/git/push`,
      options
    );
  }

  /**
   * Commit changes
   *
   * @param message - Commit message
   * @param options - Commit options
   * @returns Commit result with commit hash
   *
   * @example
   * ```typescript
   * await sandbox.git.commit('Fix authentication bug');
   *
   * await sandbox.git.commit('Add new feature', {
   *   files: ['src/auth.ts', 'tests/auth.test.ts'],
   *   author: {
   *     name: 'John Doe',
   *     email: 'john@example.com'
   *   }
   * });
   *
   * // Commit all changes
   * await sandbox.git.commit('Update dependencies', { all: true });
   * ```
   */
  async commit(message: string, options?: GitCommitOptions): Promise<GitCommitResult> {
    return this.http.post<GitCommitResult>(
      `/api/v1/environments/${this.environmentId}/git/commit`,
      {
        message,
        files: options?.files,
        author: options?.author,
        all: options?.all,
      }
    );
  }

  /**
   * Checkout a branch
   *
   * @param branch - Branch name
   * @param options - Checkout options
   *
   * @example
   * ```typescript
   * await sandbox.git.checkout('feature-branch');
   * await sandbox.git.checkout('new-branch', { create: true });
   * ```
   */
  async checkout(branch: string, options?: GitCheckoutOptions): Promise<void> {
    await this.http.post(
      `/api/v1/environments/${this.environmentId}/git/checkout`,
      {
        branch,
        create: options?.create,
      }
    );
  }

  /**
   * Get git status
   *
   * @returns Git status with modified, added, deleted, and untracked files
   *
   * @example
   * ```typescript
   * const status = await sandbox.git.status();
   * console.log(`Branch: ${status.branch}`);
   * console.log(`Modified files: ${status.modified.length}`);
   * console.log(`Ahead by: ${status.ahead} commits`);
   * ```
   */
  async status(): Promise<GitStatus> {
    return this.http.get<GitStatus>(
      `/api/v1/environments/${this.environmentId}/git/status`
    );
  }

  /**
   * Get git diff
   *
   * @returns Git diff showing changes in each file
   *
   * @example
   * ```typescript
   * const diff = await sandbox.git.diff();
   * diff.files.forEach(file => {
   *   console.log(`${file.path}: +${file.additions} -${file.deletions}`);
   * });
   * ```
   */
  async diff(): Promise<GitDiff> {
    return this.http.get<GitDiff>(
      `/api/v1/environments/${this.environmentId}/git/diff`
    );
  }
}
