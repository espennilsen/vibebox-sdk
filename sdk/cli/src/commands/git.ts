import { Command } from 'commander';
import ora from 'ora';
import { getClient } from '../utils/client.js';
import { Output } from '../utils/output.js';
import { NotFoundError } from '../utils/errors.js';

/**
 * Git operation commands
 */
export function createGitCommand(): Command {
  const cmd = new Command('git')
    .description('Git operations in sandbox');

  // Clone repository
  cmd
    .command('clone')
    .description('Clone a git repository into sandbox')
    .argument('<sandbox>', 'Sandbox name or ID')
    .argument('<url>', 'Git repository URL')
    .option('-b, --branch <branch>', 'Branch to clone')
    .option('-p, --path <path>', 'Clone destination path', '/repo')
    .option('--depth <depth>', 'Shallow clone depth')
    .action(async (sandbox, url, options) => {
      const spinner = ora('Cloning repository...').start();

      try {
        const client = getClient();
        const sb = await findSandbox(client, sandbox);

        if (!sb) {
          spinner.fail();
          throw new NotFoundError('Sandbox', sandbox);
        }

        const cloneOptions: any = {
          url,
          path: options.path,
        };

        if (options.branch) {
          cloneOptions.branch = options.branch;
        }

        if (options.depth) {
          cloneOptions.depth = parseInt(options.depth, 10);
        }

        await client.sandboxes.git.clone(sb.id, cloneOptions);

        spinner.succeed('Repository cloned successfully');
        Output.keyValue('URL', url);
        Output.keyValue('Path', options.path);
        if (options.branch) {
          Output.keyValue('Branch', options.branch);
        }
      } catch (error) {
        spinner.fail('Failed to clone repository');
        throw error;
      }
    });

  // Pull changes
  cmd
    .command('pull')
    .description('Pull changes from remote repository')
    .argument('<sandbox>', 'Sandbox name or ID')
    .option('-p, --path <path>', 'Repository path', '/repo')
    .action(async (sandbox, options) => {
      const spinner = ora('Pulling changes...').start();

      try {
        const client = getClient();
        const sb = await findSandbox(client, sandbox);

        if (!sb) {
          spinner.fail();
          throw new NotFoundError('Sandbox', sandbox);
        }

        const result = await client.sandboxes.git.pull(sb.id, options.path);

        if (result.exitCode === 0) {
          spinner.succeed('Changes pulled successfully');
        } else {
          spinner.warn('Pull completed with warnings');
        }

        if (result.output) {
          Output.blank();
          console.log(result.output);
        }
      } catch (error) {
        spinner.fail('Failed to pull changes');
        throw error;
      }
    });

  // Push changes
  cmd
    .command('push')
    .description('Push changes to remote repository')
    .argument('<sandbox>', 'Sandbox name or ID')
    .option('-p, --path <path>', 'Repository path', '/repo')
    .option('-f, --force', 'Force push')
    .action(async (sandbox, options) => {
      const spinner = ora('Pushing changes...').start();

      try {
        const client = getClient();
        const sb = await findSandbox(client, sandbox);

        if (!sb) {
          spinner.fail();
          throw new NotFoundError('Sandbox', sandbox);
        }

        const result = await client.sandboxes.git.push(sb.id, {
          path: options.path,
          force: options.force,
        });

        if (result.exitCode === 0) {
          spinner.succeed('Changes pushed successfully');
        } else {
          spinner.warn('Push completed with warnings');
        }

        if (result.output) {
          Output.blank();
          console.log(result.output);
        }
      } catch (error) {
        spinner.fail('Failed to push changes');
        throw error;
      }
    });

  // Commit changes
  cmd
    .command('commit')
    .description('Commit changes')
    .argument('<sandbox>', 'Sandbox name or ID')
    .argument('<message>', 'Commit message')
    .option('-a, --all', 'Stage all changes (git add .)')
    .option('-p, --path <path>', 'Repository path', '/repo')
    .action(async (sandbox, message, options) => {
      const spinner = ora('Committing changes...').start();

      try {
        const client = getClient();
        const sb = await findSandbox(client, sandbox);

        if (!sb) {
          spinner.fail();
          throw new NotFoundError('Sandbox', sandbox);
        }

        const result = await client.sandboxes.git.commit(sb.id, message, {
          path: options.path,
          all: options.all,
        });

        if (result.exitCode === 0) {
          spinner.succeed('Changes committed successfully');
        } else {
          spinner.warn('Commit completed with warnings');
        }

        if (result.output) {
          Output.blank();
          console.log(result.output);
        }
      } catch (error) {
        spinner.fail('Failed to commit changes');
        throw error;
      }
    });

  // Checkout branch
  cmd
    .command('checkout')
    .description('Checkout a branch')
    .argument('<sandbox>', 'Sandbox name or ID')
    .argument('<branch>', 'Branch name')
    .option('-b, --create', 'Create new branch')
    .option('-p, --path <path>', 'Repository path', '/repo')
    .action(async (sandbox, branch, options) => {
      const spinner = ora(`Checking out ${branch}...`).start();

      try {
        const client = getClient();
        const sb = await findSandbox(client, sandbox);

        if (!sb) {
          spinner.fail();
          throw new NotFoundError('Sandbox', sandbox);
        }

        const result = await client.sandboxes.git.checkout(sb.id, branch, {
          path: options.path,
          create: options.create,
        });

        if (result.exitCode === 0) {
          spinner.succeed(`Checked out ${branch}`);
        } else {
          spinner.warn('Checkout completed with warnings');
        }

        if (result.output) {
          Output.blank();
          console.log(result.output);
        }
      } catch (error) {
        spinner.fail('Failed to checkout branch');
        throw error;
      }
    });

  // Git status
  cmd
    .command('status')
    .description('Show git status')
    .argument('<sandbox>', 'Sandbox name or ID')
    .option('-p, --path <path>', 'Repository path', '/repo')
    .action(async (sandbox, options) => {
      const spinner = ora('Fetching status...').start();

      try {
        const client = getClient();
        const sb = await findSandbox(client, sandbox);

        if (!sb) {
          spinner.fail();
          throw new NotFoundError('Sandbox', sandbox);
        }

        const result = await client.sandboxes.git.status(sb.id, options.path);

        spinner.stop();

        Output.header('Git Status');
        Output.blank();

        if (result.output) {
          console.log(result.output);
        }
      } catch (error) {
        spinner.fail('Failed to fetch status');
        throw error;
      }
    });

  // Git diff
  cmd
    .command('diff')
    .description('Show git diff')
    .argument('<sandbox>', 'Sandbox name or ID')
    .option('-p, --path <path>', 'Repository path', '/repo')
    .option('--cached', 'Show staged changes')
    .action(async (sandbox, options) => {
      const spinner = ora('Fetching diff...').start();

      try {
        const client = getClient();
        const sb = await findSandbox(client, sandbox);

        if (!sb) {
          spinner.fail();
          throw new NotFoundError('Sandbox', sandbox);
        }

        const result = await client.sandboxes.git.diff(sb.id, {
          path: options.path,
          cached: options.cached,
        });

        spinner.stop();

        if (result.output) {
          console.log(result.output);
        } else {
          Output.info('No changes');
        }
      } catch (error) {
        spinner.fail('Failed to fetch diff');
        throw error;
      }
    });

  return cmd;
}

/**
 * Find sandbox by name or ID
 */
async function findSandbox(client: any, nameOrId: string): Promise<any | null> {
  try {
    const sandbox = await client.sandboxes.get(nameOrId);
    return sandbox;
  } catch {
    const sandboxes = await client.sandboxes.list({ limit: 100 });
    return sandboxes.find((sb: any) => sb.name === nameOrId) || null;
  }
}
