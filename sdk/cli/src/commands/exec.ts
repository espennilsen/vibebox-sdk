import { Command } from 'commander';
import ora from 'ora';
import { getClient } from '../utils/client.js';
import { Output } from '../utils/output.js';
import { NotFoundError } from '../utils/errors.js';
import { readFile } from 'fs/promises';

/**
 * Code execution commands
 */
export function createExecCommand(): Command {
  const cmd = new Command('exec')
    .description('Execute commands in sandbox')
    .argument('<sandbox>', 'Sandbox name or ID')
    .argument('<command>', 'Command to execute')
    .option('--cwd <path>', 'Working directory', '/workspace')
    .option('-s, --stream', 'Stream output in real-time')
    .option('-t, --timeout <ms>', 'Execution timeout in milliseconds', '120000')
    .option('-e, --env <key=value...>', 'Environment variables')
    .action(async (sandbox, command, options) => {
      const spinner = ora('Executing command...').start();

      try {
        const client = getClient();
        const sb = await findSandbox(client, sandbox);

        if (!sb) {
          spinner.fail();
          throw new NotFoundError('Sandbox', sandbox);
        }

        // Parse environment variables
        const env: Record<string, string> = {};
        if (options.env) {
          for (const envVar of options.env) {
            const [key, value] = envVar.split('=');
            if (key && value) {
              env[key] = value;
            }
          }
        }

        const execOptions: any = {
          cwd: options.cwd,
          timeout: parseInt(options.timeout, 10),
          env,
        };

        if (options.stream) {
          spinner.stop();
          Output.header(`Executing: ${command}`);
          Output.blank();

          const execution = await client.sandboxes.exec(sb.id, command, {
            ...execOptions,
            stream: true,
          });

          // Stream output
          execution.onData((data: string) => {
            process.stdout.write(data);
          });

          execution.onComplete((result: any) => {
            Output.blank();
            if (result.exitCode === 0) {
              Output.success(`Command completed in ${Output.formatDuration(result.duration)}`);
            } else {
              Output.error(`Command failed with exit code ${result.exitCode}`);
            }
          });

          execution.onError((error: Error) => {
            Output.error('Execution error', error);
          });
        } else {
          const result = await client.sandboxes.exec(sb.id, command, execOptions);

          spinner.stop();

          if (result.stdout) {
            console.log(result.stdout);
          }

          if (result.stderr) {
            console.error(result.stderr);
          }

          Output.blank();
          Output.keyValue('Exit Code', result.exitCode.toString());
          Output.keyValue('Duration', Output.formatDuration(result.duration));

          if (result.exitCode !== 0) {
            process.exit(result.exitCode);
          }
        }
      } catch (error) {
        spinner.fail('Failed to execute command');
        throw error;
      }
    });

  return cmd;
}

/**
 * Run script file command
 */
export function createRunCommand(): Command {
  const cmd = new Command('run')
    .description('Run a script file in sandbox')
    .argument('<sandbox>', 'Sandbox name or ID')
    .argument('<script-path>', 'Local script file path')
    .option('--cwd <path>', 'Working directory', '/workspace')
    .option('-s, --stream', 'Stream output in real-time')
    .action(async (sandbox, scriptPath, options) => {
      const spinner = ora('Running script...').start();

      try {
        const client = getClient();
        const sb = await findSandbox(client, sandbox);

        if (!sb) {
          spinner.fail();
          throw new NotFoundError('Sandbox', sandbox);
        }

        // Read script file
        const scriptContent = await readFile(scriptPath, 'utf-8');

        // Detect language from file extension
        const language = detectLanguage(scriptPath);

        if (options.stream) {
          spinner.stop();
          Output.header(`Running: ${scriptPath}`);
          Output.blank();

          const result = await client.sandboxes.run(sb.id, scriptContent, {
            language,
            cwd: options.cwd,
            stream: true,
          });

          result.onData((data: string) => {
            process.stdout.write(data);
          });

          result.onComplete((res: any) => {
            Output.blank();
            if (res.exitCode === 0) {
              Output.success(`Script completed in ${Output.formatDuration(res.duration)}`);
            } else {
              Output.error(`Script failed with exit code ${res.exitCode}`);
            }
          });
        } else {
          const result = await client.sandboxes.run(sb.id, scriptContent, {
            language,
            cwd: options.cwd,
          });

          spinner.stop();

          if (result.output) {
            console.log(result.output);
          }

          Output.blank();
          Output.keyValue('Exit Code', result.exitCode.toString());
          Output.keyValue('Duration', Output.formatDuration(result.duration));

          if (result.exitCode !== 0) {
            process.exit(result.exitCode);
          }
        }
      } catch (error) {
        spinner.fail('Failed to run script');
        throw error;
      }
    });

  return cmd;
}

/**
 * Detect programming language from file extension
 */
function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();

  const languageMap: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    py: 'python',
    sh: 'bash',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
  };

  return languageMap[ext || ''] || 'javascript';
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
