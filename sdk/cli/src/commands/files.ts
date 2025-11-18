import { Command } from 'commander';
import ora from 'ora';
import { watch } from 'chokidar';
import { getClient } from '../utils/client.js';
import { Output } from '../utils/output.js';
import { NotFoundError } from '../utils/errors.js';
import { stat, readdir } from 'fs/promises';
import { join, basename } from 'path';

/**
 * File operation commands
 */
export function createFileCommands(): Command {
  const cmd = new Command('files')
    .alias('file')
    .description('Manage sandbox files');

  // Upload files
  cmd
    .command('upload')
    .alias('push')
    .description('Upload files to sandbox')
    .argument('<local-path>', 'Local file or directory path')
    .argument('<sandbox>', 'Sandbox name or ID')
    .argument('[remote-path]', 'Remote destination path (auto-detected if not provided)')
    .option('-r, --recursive', 'Upload directory recursively', true)
    .option('--exclude <patterns...>', 'Exclude patterns (e.g., node_modules, *.log)')
    .action(async (localPath, sandbox, remotePath, options) => {
      const spinner = ora('Uploading files...').start();

      try {
        const client = getClient();
        const sb = await findSandbox(client, sandbox);

        if (!sb) {
          spinner.fail();
          throw new NotFoundError('Sandbox', sandbox);
        }

        // Auto-detect remote path if not provided
        const destination = remotePath || `/workspace/${basename(localPath)}`;

        // Check if local path is file or directory
        const stats = await stat(localPath);

        if (stats.isFile()) {
          await client.sandboxes.files.upload(sb.id, localPath, destination);
          spinner.succeed(`Uploaded ${localPath} to ${destination}`);
        } else if (stats.isDirectory()) {
          // Upload directory
          const files = await getFilesRecursively(localPath, options.exclude || []);

          spinner.text = `Uploading ${files.length} files...`;

          let uploaded = 0;
          for (const file of files) {
            const relativePath = file.substring(localPath.length);
            const remoteDest = join(destination, relativePath);

            await client.sandboxes.files.upload(sb.id, file, remoteDest);
            uploaded++;
            spinner.text = `Uploading ${uploaded}/${files.length} files...`;
          }

          spinner.succeed(`Uploaded ${uploaded} files to ${destination}`);
        }
      } catch (error) {
        spinner.fail('Failed to upload files');
        throw error;
      }
    });

  // Download files
  cmd
    .command('download')
    .alias('pull')
    .description('Download files from sandbox')
    .argument('<sandbox>', 'Sandbox name or ID')
    .argument('<remote-path>', 'Remote file or directory path')
    .argument('[local-path]', 'Local destination path (defaults to current directory)')
    .action(async (sandbox, remotePath, localPath) => {
      const spinner = ora('Downloading files...').start();

      try {
        const client = getClient();
        const sb = await findSandbox(client, sandbox);

        if (!sb) {
          spinner.fail();
          throw new NotFoundError('Sandbox', sandbox);
        }

        const destination = localPath || `./${basename(remotePath)}`;

        const content = await client.sandboxes.files.download(sb.id, remotePath);

        // Write to local file
        const fs = await import('fs/promises');
        await fs.writeFile(destination, content);

        spinner.succeed(`Downloaded to ${destination}`);
        Output.keyValue('Size', Output.formatBytes(content.length));
      } catch (error) {
        spinner.fail('Failed to download files');
        throw error;
      }
    });

  // List files
  cmd
    .command('list')
    .alias('ls')
    .description('List files in sandbox directory')
    .argument('<sandbox>', 'Sandbox name or ID')
    .argument('[path]', 'Directory path', '/workspace')
    .option('-l, --long', 'Use long listing format')
    .option('-a, --all', 'Show hidden files')
    .action(async (sandbox, path, options) => {
      const spinner = ora('Listing files...').start();

      try {
        const client = getClient();
        const sb = await findSandbox(client, sandbox);

        if (!sb) {
          spinner.fail();
          throw new NotFoundError('Sandbox', sandbox);
        }

        const files = await client.sandboxes.files.list(sb.id, path);

        spinner.stop();

        if (files.length === 0) {
          Output.info('No files found');
          return;
        }

        Output.header(`Files in ${path}`);
        Output.blank();

        if (options.long) {
          const rows = files.map((f: any) => [
            f.isDir ? 'd' : '-',
            f.permissions || 'rwxr-xr-x',
            Output.formatBytes(f.size || 0),
            f.modified ? new Date(f.modified).toLocaleString() : 'Unknown',
            f.name,
          ]);

          Output.table(['Type', 'Permissions', 'Size', 'Modified', 'Name'], rows);
        } else {
          files.forEach((f: any) => {
            const icon = f.isDir ? '📁' : '📄';
            console.log(`${icon} ${f.name}`);
          });
        }
      } catch (error) {
        spinner.fail('Failed to list files');
        throw error;
      }
    });

  // Delete files
  cmd
    .command('delete')
    .alias('rm')
    .description('Delete files from sandbox')
    .argument('<sandbox>', 'Sandbox name or ID')
    .argument('<path>', 'File or directory path to delete')
    .option('-f, --force', 'Skip confirmation')
    .option('-r, --recursive', 'Delete directory recursively')
    .action(async (sandbox, path, options) => {
      if (!options.force) {
        const inquirer = await import('inquirer');
        const { confirm } = await inquirer.default.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to delete ${path}?`,
            default: false,
          },
        ]);

        if (!confirm) {
          Output.info('Deletion cancelled');
          return;
        }
      }

      const spinner = ora('Deleting files...').start();

      try {
        const client = getClient();
        const sb = await findSandbox(client, sandbox);

        if (!sb) {
          spinner.fail();
          throw new NotFoundError('Sandbox', sandbox);
        }

        await client.sandboxes.files.delete(sb.id, path, {
          recursive: options.recursive,
        });

        spinner.succeed(`Deleted ${path}`);
      } catch (error) {
        spinner.fail('Failed to delete files');
        throw error;
      }
    });

  // Sync files (watch mode)
  cmd
    .command('sync')
    .description('Sync local directory with sandbox (watch mode)')
    .argument('<local-path>', 'Local directory to watch')
    .argument('<sandbox>', 'Sandbox name or ID')
    .argument('[remote-path]', 'Remote destination path')
    .option('--exclude <patterns...>', 'Exclude patterns')
    .action(async (localPath, sandbox, remotePath, options) => {
      const client = getClient();
      const sb = await findSandbox(client, sandbox);

      if (!sb) {
        throw new NotFoundError('Sandbox', sandbox);
      }

      const destination = remotePath || `/workspace/${basename(localPath)}`;

      Output.info(`Watching ${localPath} for changes...`);
      Output.info(`Syncing to ${sb.name}:${destination}`);
      Output.info('Press Ctrl+C to stop');
      Output.blank();

      const watcher = watch(localPath, {
        ignored: options.exclude || ['node_modules', '.git', 'dist'],
        persistent: true,
        ignoreInitial: false,
      });

      watcher
        .on('add', async (path) => {
          try {
            const relativePath = path.substring(localPath.length);
            const remoteDest = join(destination, relativePath);
            await client.sandboxes.files.upload(sb.id, path, remoteDest);
            Output.success(`Uploaded: ${relativePath}`);
          } catch (error) {
            Output.error(`Failed to upload ${path}`, error as Error);
          }
        })
        .on('change', async (path) => {
          try {
            const relativePath = path.substring(localPath.length);
            const remoteDest = join(destination, relativePath);
            await client.sandboxes.files.upload(sb.id, path, remoteDest);
            Output.info(`Updated: ${relativePath}`);
          } catch (error) {
            Output.error(`Failed to update ${path}`, error as Error);
          }
        })
        .on('unlink', async (path) => {
          try {
            const relativePath = path.substring(localPath.length);
            const remoteDest = join(destination, relativePath);
            await client.sandboxes.files.delete(sb.id, remoteDest);
            Output.warn(`Deleted: ${relativePath}`);
          } catch (error) {
            Output.error(`Failed to delete ${path}`, error as Error);
          }
        })
        .on('error', (error) => {
          Output.error('Watcher error', error);
        });

      // Keep process alive
      process.on('SIGINT', () => {
        Output.blank();
        Output.info('Stopping file sync...');
        watcher.close();
        process.exit(0);
      });
    });

  return cmd;
}

/**
 * Get all files recursively from a directory
 */
async function getFilesRecursively(dir: string, exclude: string[]): Promise<string[]> {
  const files: string[] = [];

  async function traverse(currentDir: string) {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);

      // Check if excluded
      if (exclude.some((pattern) => fullPath.includes(pattern))) {
        continue;
      }

      if (entry.isDirectory()) {
        await traverse(fullPath);
      } else {
        files.push(fullPath);
      }
    }
  }

  await traverse(dir);
  return files;
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
