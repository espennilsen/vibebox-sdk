import { Command } from 'commander';
import ora from 'ora';
import { getClient } from '../utils/client.js';
import { Output } from '../utils/output.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { config } from '../utils/config.js';

/**
 * Sandbox management commands
 */
export function createSandboxCommands(): Command {
  const cmd = new Command('sandbox')
    .alias('sb')
    .description('Manage sandboxes');

  // Create sandbox (main command with shortcut)
  const newCmd = new Command('new')
    .alias('create')
    .description('Create a new sandbox')
    .argument('[template]', 'Sandbox template')
    .argument('[name]', 'Sandbox name')
    .option('-g, --git <url>', 'Clone git repository')
    .option('-b, --branch <branch>', 'Git branch to clone')
    .option('-e, --ephemeral', 'Create ephemeral sandbox')
    .option('--timeout <duration>', 'Auto-cleanup timeout (e.g., 30m, 2h)')
    .option('--auto-start', 'Start sandbox immediately', true)
    .option('--no-auto-start', 'Do not start sandbox immediately')
    .action(async (template, name, options) => {
      const spinner = ora('Creating sandbox...').start();

      try {
        const client = getClient();

        // Use default template if not provided
        const templateToUse = template || config.get('defaultTemplate') || 'node-20';

        // Generate name if not provided
        const nameToUse = name || `sandbox-${Date.now()}`;

        const createOptions: any = {
          template: templateToUse,
          name: nameToUse,
          autoStart: options.autoStart,
          ephemeral: options.ephemeral,
        };

        if (options.git) {
          createOptions.git = {
            url: options.git,
            branch: options.branch,
          };
        }

        if (options.timeout) {
          createOptions.timeout = options.timeout;
        }

        const sandbox = await client.sandboxes.create(createOptions);

        spinner.succeed('Sandbox created successfully!');
        Output.blank();

        Output.keyValue('ID', sandbox.id);
        Output.keyValue('Name', sandbox.name);
        Output.keyValue('Template', sandbox.template);
        Output.keyValue('Status', sandbox.status);

        if (options.git) {
          Output.keyValue('Repository', options.git);
        }

        if (options.ephemeral) {
          Output.keyValue('Ephemeral', 'Yes');
          if (options.timeout) {
            Output.keyValue('Auto-cleanup', options.timeout);
          }
        }

        Output.blank();
        Output.info(`To connect: vibebox shell ${nameToUse}`);
      } catch (error) {
        spinner.fail('Failed to create sandbox');
        throw error;
      }
    });

  // List sandboxes
  cmd
    .command('list')
    .alias('ls')
    .description('List all sandboxes')
    .option('-a, --all', 'Show all sandboxes including stopped')
    .option('-j, --json', 'Output as JSON')
    .option('-l, --limit <number>', 'Limit number of results', '50')
    .action(async (options) => {
      const spinner = ora('Fetching sandboxes...').start();

      try {
        const client = getClient();
        const sandboxes = await client.sandboxes.list({
          limit: parseInt(options.limit, 10),
          status: options.all ? undefined : 'running',
        });

        spinner.stop();

        if (sandboxes.length === 0) {
          Output.info('No sandboxes found');
          Output.info('Create one with: vibebox new');
          return;
        }

        if (options.json) {
          console.log(JSON.stringify(sandboxes, null, 2));
          return;
        }

        Output.header(`Sandboxes (${sandboxes.length})`);
        Output.blank();

        const rows = sandboxes.map((sb) => [
          sb.id,
          sb.name,
          sb.template,
          formatStatus(sb.status),
          sb.createdAt ? Output.formatRelativeTime(new Date(sb.createdAt)) : 'Unknown',
        ]);

        Output.table(['ID', 'Name', 'Template', 'Status', 'Created'], rows);
      } catch (error) {
        spinner.fail('Failed to fetch sandboxes');
        throw error;
      }
    });

  // Get sandbox info
  cmd
    .command('info')
    .alias('get')
    .description('Get sandbox information')
    .argument('<name-or-id>', 'Sandbox name or ID')
    .option('-j, --json', 'Output as JSON')
    .action(async (nameOrId, options) => {
      const spinner = ora('Fetching sandbox info...').start();

      try {
        const client = getClient();
        const sandbox = await findSandbox(client, nameOrId);

        if (!sandbox) {
          spinner.fail();
          throw new NotFoundError('Sandbox', nameOrId);
        }

        spinner.stop();

        if (options.json) {
          console.log(JSON.stringify(sandbox, null, 2));
          return;
        }

        Output.header(`Sandbox: ${sandbox.name}`);
        Output.blank();

        Output.keyValue('ID', sandbox.id);
        Output.keyValue('Name', sandbox.name);
        Output.keyValue('Template', sandbox.template);
        Output.keyValue('Status', formatStatus(sandbox.status));
        Output.keyValue('Container ID', sandbox.containerId || 'N/A');

        if (sandbox.createdAt) {
          Output.keyValue('Created', new Date(sandbox.createdAt).toLocaleString());
        }

        if (sandbox.startedAt) {
          Output.keyValue('Started', new Date(sandbox.startedAt).toLocaleString());
        }

        if (sandbox.git) {
          Output.blank();
          Output.info('Git Configuration:');
          Output.keyValue('  Repository', sandbox.git.url);
          if (sandbox.git.branch) {
            Output.keyValue('  Branch', sandbox.git.branch);
          }
          if (sandbox.git.path) {
            Output.keyValue('  Path', sandbox.git.path);
          }
        }

        if (sandbox.env && Object.keys(sandbox.env).length > 0) {
          Output.blank();
          Output.info('Environment Variables:');
          for (const [key, value] of Object.entries(sandbox.env)) {
            Output.keyValue(`  ${key}`, value as string);
          }
        }
      } catch (error) {
        spinner.fail('Failed to fetch sandbox info');
        throw error;
      }
    });

  // Start sandbox
  cmd
    .command('start')
    .description('Start a sandbox')
    .argument('<name-or-id>', 'Sandbox name or ID')
    .action(async (nameOrId) => {
      const spinner = ora('Starting sandbox...').start();

      try {
        const client = getClient();
        const sandbox = await findSandbox(client, nameOrId);

        if (!sandbox) {
          spinner.fail();
          throw new NotFoundError('Sandbox', nameOrId);
        }

        await client.sandboxes.start(sandbox.id);

        spinner.succeed(`Sandbox '${sandbox.name}' started successfully`);
      } catch (error) {
        spinner.fail('Failed to start sandbox');
        throw error;
      }
    });

  // Stop sandbox
  cmd
    .command('stop')
    .description('Stop a sandbox')
    .argument('<name-or-id>', 'Sandbox name or ID')
    .action(async (nameOrId) => {
      const spinner = ora('Stopping sandbox...').start();

      try {
        const client = getClient();
        const sandbox = await findSandbox(client, nameOrId);

        if (!sandbox) {
          spinner.fail();
          throw new NotFoundError('Sandbox', nameOrId);
        }

        await client.sandboxes.stop(sandbox.id);

        spinner.succeed(`Sandbox '${sandbox.name}' stopped successfully`);
      } catch (error) {
        spinner.fail('Failed to stop sandbox');
        throw error;
      }
    });

  // Restart sandbox
  cmd
    .command('restart')
    .description('Restart a sandbox')
    .argument('<name-or-id>', 'Sandbox name or ID')
    .action(async (nameOrId) => {
      const spinner = ora('Restarting sandbox...').start();

      try {
        const client = getClient();
        const sandbox = await findSandbox(client, nameOrId);

        if (!sandbox) {
          spinner.fail();
          throw new NotFoundError('Sandbox', nameOrId);
        }

        await client.sandboxes.restart(sandbox.id);

        spinner.succeed(`Sandbox '${sandbox.name}' restarted successfully`);
      } catch (error) {
        spinner.fail('Failed to restart sandbox');
        throw error;
      }
    });

  // Delete sandbox
  cmd
    .command('delete')
    .alias('rm')
    .alias('destroy')
    .description('Delete a sandbox')
    .argument('<name-or-id...>', 'Sandbox name or ID (can specify multiple)')
    .option('-f, --force', 'Skip confirmation prompt')
    .action(async (nameOrIds, options) => {
      const client = getClient();

      // Confirm deletion unless --force
      if (!options.force) {
        const inquirer = await import('inquirer');
        const { confirm } = await inquirer.default.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to delete ${nameOrIds.length} sandbox(es)?`,
            default: false,
          },
        ]);

        if (!confirm) {
          Output.info('Deletion cancelled');
          return;
        }
      }

      let succeeded = 0;
      let failed = 0;

      for (const nameOrId of nameOrIds) {
        const spinner = ora(`Deleting ${nameOrId}...`).start();

        try {
          const sandbox = await findSandbox(client, nameOrId);

          if (!sandbox) {
            spinner.fail(`Sandbox '${nameOrId}' not found`);
            failed++;
            continue;
          }

          await client.sandboxes.delete(sandbox.id);

          spinner.succeed(`Deleted ${sandbox.name}`);
          succeeded++;
        } catch (error) {
          spinner.fail(`Failed to delete ${nameOrId}`);
          failed++;
          Output.debug((error as Error).message);
        }
      }

      Output.blank();
      Output.success(`Deleted ${succeeded} sandbox(es)`);
      if (failed > 0) {
        Output.warn(`Failed to delete ${failed} sandbox(es)`);
      }
    });

  // Pause sandbox
  cmd
    .command('pause')
    .description('Pause a sandbox')
    .argument('<name-or-id>', 'Sandbox name or ID')
    .action(async (nameOrId) => {
      const spinner = ora('Pausing sandbox...').start();

      try {
        const client = getClient();
        const sandbox = await findSandbox(client, nameOrId);

        if (!sandbox) {
          spinner.fail();
          throw new NotFoundError('Sandbox', nameOrId);
        }

        await client.sandboxes.pause(sandbox.id);

        spinner.succeed(`Sandbox '${sandbox.name}' paused successfully`);
        Output.info('Resume with: vibebox sandbox resume ' + sandbox.name);
      } catch (error) {
        spinner.fail('Failed to pause sandbox');
        throw error;
      }
    });

  // Resume sandbox
  cmd
    .command('resume')
    .description('Resume a paused sandbox')
    .argument('<name-or-id>', 'Sandbox name or ID')
    .action(async (nameOrId) => {
      const spinner = ora('Resuming sandbox...').start();

      try {
        const client = getClient();
        const sandbox = await findSandbox(client, nameOrId);

        if (!sandbox) {
          spinner.fail();
          throw new NotFoundError('Sandbox', nameOrId);
        }

        await client.sandboxes.resume(sandbox.id);

        spinner.succeed(`Sandbox '${sandbox.name}' resumed successfully`);
      } catch (error) {
        spinner.fail('Failed to resume sandbox');
        throw error;
      }
    });

  return { newCmd, cmd };
}

/**
 * Find sandbox by name or ID
 */
async function findSandbox(client: any, nameOrId: string): Promise<any | null> {
  try {
    // Try to get by ID first
    const sandbox = await client.sandboxes.get(nameOrId);
    return sandbox;
  } catch {
    // If not found by ID, search by name
    const sandboxes = await client.sandboxes.list({ limit: 100 });
    return sandboxes.find((sb: any) => sb.name === nameOrId) || null;
  }
}

/**
 * Format status with color
 */
function formatStatus(status: string): string {
  const colors: Record<string, (text: string) => string> = {
    running: (text) => `\x1b[32m${text}\x1b[0m`, // green
    stopped: (text) => `\x1b[31m${text}\x1b[0m`, // red
    paused: (text) => `\x1b[33m${text}\x1b[0m`, // yellow
    creating: (text) => `\x1b[36m${text}\x1b[0m`, // cyan
    starting: (text) => `\x1b[36m${text}\x1b[0m`, // cyan
  };

  const colorFn = colors[status.toLowerCase()] || ((text) => text);
  return colorFn(status);
}
