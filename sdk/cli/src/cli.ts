#!/usr/bin/env node

import { Command } from 'commander';
import { handleError } from './utils/errors.js';
import { Output } from './utils/output.js';
import { config } from './utils/config.js';
import { createInitCommand } from './commands/init.js';
import { createConfigCommand } from './commands/config-cmd.js';
import { createSandboxCommands } from './commands/sandbox.js';
import { createFileCommands } from './commands/files.js';
import { createGitCommand } from './commands/git.js';
import { createExecCommand, createRunCommand } from './commands/exec.js';
import { createLogsCommand } from './commands/logs.js';
import { createShellCommand } from './commands/shell.js';
import updateNotifier from 'update-notifier';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get package.json for version info
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
);

// Check for updates
const notifier = updateNotifier({
  pkg: packageJson,
  updateCheckInterval: 1000 * 60 * 60 * 24, // 24 hours
});

if (notifier.update) {
  notifier.notify({
    defer: false,
    message: `Update available: ${notifier.update.latest}\nRun: npm install -g @vibebox/cli`,
  });
}

/**
 * Main CLI program
 */
const program = new Command();

program
  .name('vibebox')
  .description('VibeBox CLI - Manage development sandboxes')
  .version(packageJson.version)
  .option('-v, --verbose', 'Enable verbose logging')
  .option('--debug', 'Enable debug mode')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.verbose || opts.debug) {
      process.env.VERBOSE = 'true';
      process.env.DEBUG = 'true';
    }
  });

// Init command
program.addCommand(createInitCommand());

// Config commands
program.addCommand(createConfigCommand());

// Sandbox commands
const sandboxCommands = createSandboxCommands();
const newCmd = sandboxCommands.newCmd;
const sandboxCmd = sandboxCommands.cmd;

// Add "new" as a top-level command for quick access
program.addCommand(newCmd);

// Add full sandbox command group
program.addCommand(sandboxCmd);

// Shortcut aliases for common sandbox commands
program
  .command('ls')
  .description('List all sandboxes (alias for: sandbox list)')
  .option('-a, --all', 'Show all sandboxes including stopped')
  .option('-j, --json', 'Output as JSON')
  .option('-l, --limit <number>', 'Limit number of results', '50')
  .action(async (_options) => {
    const { createSandboxCommands } = await import('./commands/sandbox.js');
    const sandboxCmds = createSandboxCommands();
    const listCmd = sandboxCmds.cmd.commands.find((c: any) => c.name() === 'list');
    if (listCmd) {
      await listCmd.parseAsync([], { from: 'user' });
    }
  });

program
  .command('info <sandbox>')
  .description('Get sandbox info (alias for: sandbox info)')
  .option('-j, --json', 'Output as JSON')
  .action(async (sandbox, _options) => {
    const { createSandboxCommands } = await import('./commands/sandbox.js');
    const sandboxCmds = createSandboxCommands();
    const infoCmd = sandboxCmds.cmd.commands.find((c: any) => c.name() === 'info');
    if (infoCmd) {
      await infoCmd.parseAsync([sandbox], { from: 'user' });
    }
  });

program
  .command('rm <sandbox...>')
  .description('Delete sandbox (alias for: sandbox delete)')
  .option('-f, --force', 'Skip confirmation')
  .action(async (sandboxes, _options) => {
    const { createSandboxCommands } = await import('./commands/sandbox.js');
    const sandboxCmds = createSandboxCommands();
    const rmCmd = sandboxCmds.cmd.commands.find((c: any) => c.name() === 'delete');
    if (rmCmd) {
      await rmCmd.parseAsync(sandboxes, { from: 'user' });
    }
  });

// File commands
program.addCommand(createFileCommands());

// Shortcut for file upload
program
  .command('push <local-path> <sandbox> [remote-path]')
  .description('Upload files (alias for: files upload)')
  .option('--exclude <patterns...>', 'Exclude patterns')
  .action(async (localPath, sandbox, remotePath, _options) => {
    const { createFileCommands } = await import('./commands/files.js');
    const cmd = createFileCommands();
    const uploadCmd = cmd.commands.find((c: any) => c.name() === 'upload');
    if (uploadCmd) {
      await uploadCmd.parseAsync([localPath, sandbox, remotePath || ''], {
        from: 'user',
      });
    }
  });

// Shortcut for file download
program
  .command('pull <sandbox> <remote-path> [local-path]')
  .description('Download files (alias for: files download)')
  .action(async (sandbox, remotePath, localPath) => {
    const { createFileCommands } = await import('./commands/files.js');
    const cmd = createFileCommands();
    const downloadCmd = cmd.commands.find((c: any) => c.name() === 'download');
    if (downloadCmd) {
      await downloadCmd.parseAsync([sandbox, remotePath, localPath || ''], {
        from: 'user',
      });
    }
  });

// Git commands
program.addCommand(createGitCommand());

// Exec commands
program.addCommand(createExecCommand());
program.addCommand(createRunCommand());

// Logs command
program.addCommand(createLogsCommand());

// Shell command
program.addCommand(createShellCommand());

// Status command - show CLI status and config
program
  .command('status')
  .description('Show CLI status and configuration')
  .action(() => {
    Output.header('VibeBox CLI Status');
    Output.blank();

    const apiKey = config.getApiKey();
    const apiUrl = config.getApiUrl();

    if (apiKey) {
      Output.success('Authenticated');
      Output.keyValue('API URL', apiUrl);
      Output.keyValue('API Key', apiKey.substring(0, 10) + '***');
    } else {
      Output.warn('Not authenticated');
      Output.info('Run "vibebox init" to configure authentication');
    }

    Output.blank();
    Output.keyValue('Config file', config.getPath());
    Output.keyValue('Default template', config.get('defaultTemplate') || 'node-20');
    Output.keyValue('Version', packageJson.version);
  });

// Templates command - list available templates
program
  .command('templates')
  .alias('template')
  .description('List available sandbox templates')
  .action(async () => {
    Output.header('Available Templates');
    Output.blank();

    const templates = [
      {
        name: 'node-20',
        description: 'Node.js 20 development environment',
        preInstalled: ['Node.js 20', 'npm', 'git'],
      },
      {
        name: 'node-20-claude-code',
        description: 'Node.js 20 + Claude Code AI assistant',
        preInstalled: ['Node.js 20', 'npm', 'git', 'Claude Code'],
      },
      {
        name: 'python-3.11',
        description: 'Python 3.11 development environment',
        preInstalled: ['Python 3.11', 'pip', 'git'],
      },
      {
        name: 'python-3.11-claude-code',
        description: 'Python 3.11 + Claude Code AI assistant',
        preInstalled: ['Python 3.11', 'pip', 'git', 'Claude Code'],
      },
    ];

    templates.forEach((template) => {
      console.log(Output.truncate(`\n📦 ${template.name}`, 80));
      console.log(`   ${template.description}`);
      console.log(`   Pre-installed: ${template.preInstalled.join(', ')}`);
    });

    Output.blank();
    Output.info('Create a sandbox: vibebox new <template> [name]');
  });

// Handle errors globally
program.exitOverride();

program.parseAsync(process.argv).catch((error) => {
  handleError(error);
});
