/**
 * Git Service
 * Handles git operations within sandbox containers
 */

import { PrismaClient, SandboxGitConfig } from '@prisma/client';
import { DockerService } from './docker.service';
import {
  GitCloneRequest,
  GitCloneResponse,
  GitPullRequest,
  GitPullResponse,
  GitPushRequest,
  GitPushResponse,
  GitCommitRequest,
  GitCommitResponse,
  GitCheckoutRequest,
  GitCheckoutResponse,
  GitStatusResponse,
  GitDiffResponse,
  GitAuthType,
} from '@vibebox/types';

const prisma = new PrismaClient();
const dockerService = new DockerService();

/**
 * Executes a git command inside a container
 *
 * @param containerId - Container ID
 * @param command - Git command to execute
 * @param workingDir - Working directory (defaults to /repo)
 * @returns Command output
 */
async function execGitCommand(
  containerId: string,
  command: string[],
  workingDir = '/repo'
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const fullCommand = ['git', '-C', workingDir, ...command];

  try {
    const result = await dockerService.executeCommand(containerId, fullCommand);
    return result;
  } catch (error: any) {
    throw new Error(`Git command failed: ${error.message}`);
  }
}

/**
 * Configures git credentials in the container
 *
 * @param containerId - Container ID
 * @param authType - Authentication type
 * @param token - Auth token (for token auth)
 */
async function configureGitAuth(
  containerId: string,
  authType: GitAuthType,
  token?: string
): Promise<void> {
  if (authType === 'token' && token) {
    // Configure git credential helper with token
    await execGitCommand(containerId, [
      'config',
      '--global',
      'credential.helper',
      'store',
    ]);

    // Store the token (this is encrypted in the database)
    // In production, use a more secure method like git-credential-cache
    await dockerService.executeCommand(containerId, [
      'sh',
      '-c',
      `echo "https://oauth2:${token}@github.com" > ~/.git-credentials`,
    ]);
  }
}

/**
 * Clones a git repository into a sandbox
 *
 * @param environmentId - Environment/sandbox ID
 * @param request - Clone request parameters
 * @returns Clone result
 */
export async function cloneRepository(
  environmentId: string,
  request: GitCloneRequest
): Promise<GitCloneResponse> {
  // Get environment/container info
  const environment = await prisma.environment.findUnique({
    where: { id: environmentId },
  });

  if (!environment || !environment.containerId) {
    throw new Error('Environment not found or not running');
  }

  const {
    url,
    branch = 'main',
    path = '/repo',
    depth,
    auth,
  } = request;

  // Configure auth if provided
  if (auth && auth.type === 'token' && auth.token) {
    await configureGitAuth(environment.containerId, 'token', auth.token);
  }

  // Build clone command
  const cloneCmd = ['clone'];
  if (branch) {
    cloneCmd.push('-b', branch);
  }
  if (depth) {
    cloneCmd.push('--depth', depth.toString());
  }
  cloneCmd.push(url, path);

  // Execute clone
  const result = await execGitCommand(environment.containerId, cloneCmd, '/');

  if (result.exitCode !== 0) {
    throw new Error(`Git clone failed: ${result.stderr}`);
  }

  // Get current commit hash
  const commitResult = await execGitCommand(
    environment.containerId,
    ['rev-parse', 'HEAD'],
    path
  );
  const commit = commitResult.stdout.trim();

  // Save git config to database
  await prisma.sandboxGitConfig.upsert({
    where: { environmentId },
    create: {
      environmentId,
      repoUrl: url,
      branch,
      path,
      depth,
      authType: auth?.type || 'none',
      authToken: auth?.token, // Should be encrypted in production
      lastSyncAt: new Date(),
    },
    update: {
      repoUrl: url,
      branch,
      path,
      depth,
      authType: auth?.type || 'none',
      authToken: auth?.token,
      lastSyncAt: new Date(),
    },
  });

  return {
    success: true,
    path,
    branch,
    commit,
  };
}

/**
 * Pulls latest changes from remote
 *
 * @param environmentId - Environment/sandbox ID
 * @param request - Pull request parameters
 * @returns Pull result
 */
export async function pullChanges(
  environmentId: string,
  request: GitPullRequest = {}
): Promise<GitPullResponse> {
  const environment = await prisma.environment.findUnique({
    where: { id: environmentId },
    include: { gitConfig: true },
  });

  if (!environment || !environment.containerId) {
    throw new Error('Environment not found or not running');
  }

  if (!environment.gitConfig) {
    throw new Error('No git repository configured for this environment');
  }

  const { remote = 'origin', branch } = request;
  const pullCmd = ['pull', remote];
  if (branch) {
    pullCmd.push(branch);
  }

  const result = await execGitCommand(
    environment.containerId,
    pullCmd,
    environment.gitConfig.path
  );

  if (result.exitCode !== 0) {
    throw new Error(`Git pull failed: ${result.stderr}`);
  }

  // Parse number of files updated from output
  const updatedFiles = (result.stdout.match(/(\d+) file/)?.[1]) || '0';

  // Get current commit
  const commitResult = await execGitCommand(
    environment.containerId,
    ['rev-parse', 'HEAD'],
    environment.gitConfig.path
  );

  // Update last sync time
  await prisma.sandboxGitConfig.update({
    where: { environmentId },
    data: { lastSyncAt: new Date() },
  });

  return {
    success: true,
    updatedFiles: parseInt(updatedFiles, 10),
    commit: commitResult.stdout.trim(),
  };
}

/**
 * Pushes local commits to remote
 *
 * @param environmentId - Environment/sandbox ID
 * @param request - Push request parameters
 * @returns Push result
 */
export async function pushChanges(
  environmentId: string,
  request: GitPushRequest = {}
): Promise<GitPushResponse> {
  const environment = await prisma.environment.findUnique({
    where: { id: environmentId },
    include: { gitConfig: true },
  });

  if (!environment || !environment.containerId || !environment.gitConfig) {
    throw new Error('Environment not found or not configured with git');
  }

  const { remote = 'origin', branch, force = false } = request;
  const pushCmd = ['push', remote];
  if (branch) {
    pushCmd.push(branch);
  }
  if (force) {
    pushCmd.push('--force');
  }

  const result = await execGitCommand(
    environment.containerId,
    pushCmd,
    environment.gitConfig.path
  );

  // Git push can return exit code 0 even with nothing to push
  const pushed = !result.stdout.includes('Everything up-to-date');

  const commitResult = await execGitCommand(
    environment.containerId,
    ['rev-parse', 'HEAD'],
    environment.gitConfig.path
  );

  return {
    success: result.exitCode === 0,
    pushed,
    commit: commitResult.stdout.trim(),
  };
}

/**
 * Commits changes
 *
 * @param environmentId - Environment/sandbox ID
 * @param request - Commit request parameters
 * @returns Commit result
 */
export async function commitChanges(
  environmentId: string,
  request: GitCommitRequest
): Promise<GitCommitResponse> {
  const environment = await prisma.environment.findUnique({
    where: { id: environmentId },
    include: { gitConfig: true },
  });

  if (!environment || !environment.containerId || !environment.gitConfig) {
    throw new Error('Environment not found or not configured with git');
  }

  const { message, files, author } = request;
  const workDir = environment.gitConfig.path;

  // Configure author if provided
  if (author) {
    await execGitCommand(environment.containerId, [
      'config',
      'user.name',
      author.name,
    ], workDir);
    await execGitCommand(environment.containerId, [
      'config',
      'user.email',
      author.email,
    ], workDir);
  }

  // Add files
  if (files && files.length > 0) {
    await execGitCommand(
      environment.containerId,
      ['add', ...files],
      workDir
    );
  } else {
    // Add all changes
    await execGitCommand(environment.containerId, ['add', '-A'], workDir);
  }

  // Commit
  const result = await execGitCommand(
    environment.containerId,
    ['commit', '-m', message],
    workDir
  );

  if (result.exitCode !== 0) {
    throw new Error(`Git commit failed: ${result.stderr}`);
  }

  // Get commit hash
  const commitResult = await execGitCommand(
    environment.containerId,
    ['rev-parse', 'HEAD'],
    workDir
  );

  // Count files changed
  const filesChanged = (result.stdout.match(/(\d+) file/)?.[1]) || '1';

  return {
    success: true,
    commit: commitResult.stdout.trim(),
    filesChanged: parseInt(filesChanged, 10),
  };
}

/**
 * Checks out a branch
 *
 * @param environmentId - Environment/sandbox ID
 * @param request - Checkout request parameters
 * @returns Checkout result
 */
export async function checkoutBranch(
  environmentId: string,
  request: GitCheckoutRequest
): Promise<GitCheckoutResponse> {
  const environment = await prisma.environment.findUnique({
    where: { id: environmentId },
    include: { gitConfig: true },
  });

  if (!environment || !environment.containerId || !environment.gitConfig) {
    throw new Error('Environment not found or not configured with git');
  }

  const { branch, create = false } = request;
  const checkoutCmd = ['checkout'];
  if (create) {
    checkoutCmd.push('-b');
  }
  checkoutCmd.push(branch);

  const result = await execGitCommand(
    environment.containerId,
    checkoutCmd,
    environment.gitConfig.path
  );

  if (result.exitCode !== 0) {
    throw new Error(`Git checkout failed: ${result.stderr}`);
  }

  // Update branch in config
  await prisma.sandboxGitConfig.update({
    where: { environmentId },
    data: { branch },
  });

  return {
    success: true,
    branch,
  };
}

/**
 * Gets git status
 *
 * @param environmentId - Environment/sandbox ID
 * @returns Git status
 */
export async function getStatus(environmentId: string): Promise<GitStatusResponse> {
  const environment = await prisma.environment.findUnique({
    where: { id: environmentId },
    include: { gitConfig: true },
  });

  if (!environment || !environment.containerId || !environment.gitConfig) {
    throw new Error('Environment not found or not configured with git');
  }

  const workDir = environment.gitConfig.path;

  // Get current branch
  const branchResult = await execGitCommand(
    environment.containerId,
    ['branch', '--show-current'],
    workDir
  );
  const branch = branchResult.stdout.trim();

  // Get status in porcelain format for easy parsing
  const statusResult = await execGitCommand(
    environment.containerId,
    ['status', '--porcelain'],
    workDir
  );

  // Parse status
  const modified: string[] = [];
  const added: string[] = [];
  const deleted: string[] = [];
  const untracked: string[] = [];

  statusResult.stdout.split('\n').forEach(line => {
    if (!line.trim()) return;
    const status = line.substring(0, 2);
    const file = line.substring(3);

    if (status === '??') {
      untracked.push(file);
    } else if (status.includes('M')) {
      modified.push(file);
    } else if (status.includes('A')) {
      added.push(file);
    } else if (status.includes('D')) {
      deleted.push(file);
    }
  });

  // Get ahead/behind count
  const aheadBehindResult = await execGitCommand(
    environment.containerId,
    ['rev-list', '--left-right', '--count', 'HEAD...@{u}'],
    workDir
  );
  const [ahead, behind] = aheadBehindResult.stdout.trim().split('\t').map(n => parseInt(n, 10) || 0);

  return {
    branch,
    modified,
    added,
    deleted,
    untracked,
    ahead,
    behind,
  };
}

/**
 * Gets git diff
 *
 * @param environmentId - Environment/sandbox ID
 * @returns Git diff
 */
export async function getDiff(environmentId: string): Promise<GitDiffResponse> {
  const environment = await prisma.environment.findUnique({
    where: { id: environmentId },
    include: { gitConfig: true },
  });

  if (!environment || !environment.containerId || !environment.gitConfig) {
    throw new Error('Environment not found or not configured with git');
  }

  const workDir = environment.gitConfig.path;

  // Get diff with numstat for additions/deletions count
  const diffResult = await execGitCommand(
    environment.containerId,
    ['diff', '--numstat'],
    workDir
  );

  const files = diffResult.stdout
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      const [additions, deletions, path] = line.split('\t');
      return {
        path,
        status: 'modified' as const,
        additions: parseInt(additions, 10) || 0,
        deletions: parseInt(deletions, 10) || 0,
      };
    });

  // Optionally get full diff for each file
  for (const file of files) {
    const fullDiffResult = await execGitCommand(
      environment.containerId,
      ['diff', file.path],
      workDir
    );
    file.diff = fullDiffResult.stdout;
  }

  return { files };
}

/**
 * Gets git configuration for an environment
 *
 * @param environmentId - Environment/sandbox ID
 * @returns Git config if exists
 */
export async function getGitConfig(
  environmentId: string
): Promise<SandboxGitConfig | null> {
  return prisma.sandboxGitConfig.findUnique({
    where: { environmentId },
  });
}
