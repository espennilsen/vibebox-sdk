import { Command } from 'commander';
import ora from 'ora';
import { getClient } from '../utils/client.js';
import { Output } from '../utils/output.js';
import { NotFoundError } from '../utils/errors.js';

/**
 * Log streaming commands
 */
export function createLogsCommand(): Command {
  const cmd = new Command('logs')
    .description('View sandbox logs')
    .argument('<sandbox>', 'Sandbox name or ID')
    .option('-f, --follow', 'Follow log output (stream in real-time)')
    .option('-t, --tail <lines>', 'Number of lines to show from the end', '100')
    .option('--since <time>', 'Show logs since timestamp (e.g., 1h, 30m)')
    .option('--filter <type>', 'Filter by log type (stdout, stderr, all)', 'all')
    .option('--timestamps', 'Show timestamps')
    .action(async (sandbox, options) => {
      const spinner = ora('Fetching logs...').start();

      try {
        const client = getClient();
        const sb = await findSandbox(client, sandbox);

        if (!sb) {
          spinner.fail();
          throw new NotFoundError('Sandbox', sandbox);
        }

        if (options.follow) {
          // Real-time log streaming
          spinner.stop();
          Output.header(`Logs for ${sb.name} (streaming)`);
          Output.info('Press Ctrl+C to stop');
          Output.blank();

          const logStream = await client.sandboxes.logs.stream(sb.id, {
            filter: options.filter,
            timestamps: options.timestamps,
          });

          logStream.onLog((log: any) => {
            const timestamp = options.timestamps
              ? `[${new Date(log.timestamp).toISOString()}] `
              : '';
            const prefix = log.stream === 'stderr' ? '⚠ ' : '';
            console.log(`${timestamp}${prefix}${log.text}`);
          });

          logStream.onError((error: Error) => {
            Output.error('Log streaming error', error);
          });

          logStream.onClose(() => {
            Output.blank();
            Output.info('Log stream closed');
          });

          // Handle Ctrl+C
          process.on('SIGINT', () => {
            logStream.close();
            process.exit(0);
          });
        } else {
          // Fetch historical logs
          const logOptions: any = {
            tail: parseInt(options.tail, 10),
            filter: options.filter,
          };

          if (options.since) {
            logOptions.since = parseSince(options.since);
          }

          const logs = await client.sandboxes.logs.get(sb.id, logOptions);

          spinner.stop();

          if (logs.length === 0) {
            Output.info('No logs found');
            return;
          }

          Output.header(`Logs for ${sb.name}`);
          Output.blank();

          logs.forEach((log: any) => {
            const timestamp = options.timestamps
              ? `[${new Date(log.timestamp).toISOString()}] `
              : '';
            const prefix = log.stream === 'stderr' ? '⚠ ' : '';
            console.log(`${timestamp}${prefix}${log.text}`);
          });

          Output.blank();
          Output.info(`Showing ${logs.length} log entries`);
        }
      } catch (error) {
        spinner.fail('Failed to fetch logs');
        throw error;
      }
    });

  return cmd;
}

/**
 * Parse "since" duration string to timestamp
 */
function parseSince(since: string): Date {
  const now = new Date();
  const match = since.match(/^(\d+)([smhd])$/);

  if (!match) {
    throw new Error('Invalid since format. Use: 30s, 5m, 2h, 1d');
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const milliseconds: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  const ms = milliseconds[unit];
  return new Date(now.getTime() - value * ms);
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
