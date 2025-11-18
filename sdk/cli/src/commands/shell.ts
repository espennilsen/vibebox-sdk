import { Command } from 'commander';
import ora from 'ora';
import { spawn } from 'child_process';
import { getClient } from '../utils/client.js';
import { Output } from '../utils/output.js';
import { NotFoundError } from '../utils/errors.js';

/**
 * Interactive shell command
 */
export function createShellCommand(): Command {
  const cmd = new Command('shell')
    .alias('sh')
    .description('Open interactive shell in sandbox')
    .argument('<sandbox>', 'Sandbox name or ID')
    .option('--shell <shell>', 'Shell to use', '/bin/bash')
    .option('--cwd <path>', 'Working directory', '/workspace')
    .action(async (sandbox, options) => {
      const spinner = ora('Connecting to sandbox...').start();

      try {
        const client = getClient();
        const sb = await findSandbox(client, sandbox);

        if (!sb) {
          spinner.fail();
          throw new NotFoundError('Sandbox', sandbox);
        }

        // Check if sandbox is running
        if (sb.status !== 'running') {
          spinner.warn('Sandbox is not running. Starting...');
          await client.sandboxes.start(sb.id);
          await sleep(2000); // Wait for container to start
        }

        spinner.stop();

        Output.header(`Interactive Shell: ${sb.name}`);
        Output.info('Type "exit" to close the shell');
        Output.blank();

        // Get WebSocket URL for terminal
        const terminalUrl = await client.sandboxes.terminal.getUrl(sb.id);

        // Use docker exec for local development
        // In production, this would use WebSocket connection
        if (sb.containerId) {
          const shellProcess = spawn(
            'docker',
            ['exec', '-it', '-w', options.cwd, sb.containerId, options.shell],
            {
              stdio: 'inherit',
              shell: false,
            }
          );

          shellProcess.on('exit', (code) => {
            Output.blank();
            Output.info('Shell session closed');
            if (code !== 0 && code !== null) {
              process.exit(code);
            }
          });

          shellProcess.on('error', (error) => {
            Output.error('Failed to start shell', error);
            process.exit(1);
          });
        } else {
          Output.error('Container ID not available. Cannot connect to shell.');
          process.exit(1);
        }
      } catch (error) {
        spinner.fail('Failed to connect to sandbox');
        throw error;
      }
    });

  return cmd;
}

/**
 * Helper to sleep for a duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
