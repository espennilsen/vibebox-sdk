import { Command } from 'commander';
import { config, CliConfig } from '../utils/config.js';
import { Output } from '../utils/output.js';
import { ValidationError } from '../utils/errors.js';

/**
 * Configuration management commands
 */
export function createConfigCommand(): Command {
  const cmd = new Command('config')
    .description('Manage CLI configuration');

  // Get configuration value
  cmd
    .command('get')
    .description('Get a configuration value')
    .argument('<key>', 'Configuration key')
    .action((key: string) => {
      if (!isValidConfigKey(key)) {
        throw new ValidationError(`Invalid configuration key: ${key}`);
      }

      const value = config.get(key as keyof CliConfig);
      if (value === undefined) {
        Output.warn(`Configuration key '${key}' is not set`);
      } else {
        console.log(value);
      }
    });

  // Set configuration value
  cmd
    .command('set')
    .description('Set a configuration value')
    .argument('<key>', 'Configuration key')
    .argument('<value>', 'Configuration value')
    .action((key: string, value: string) => {
      if (!isValidConfigKey(key)) {
        throw new ValidationError(`Invalid configuration key: ${key}`);
      }

      // Convert string values to appropriate types
      let processedValue: any = value;
      if (value === 'true') processedValue = true;
      if (value === 'false') processedValue = false;

      config.set(key as keyof CliConfig, processedValue);
      Output.success(`Set ${key} = ${value}`);
    });

  // Delete configuration value
  cmd
    .command('delete')
    .alias('rm')
    .description('Delete a configuration value')
    .argument('<key>', 'Configuration key')
    .action((key: string) => {
      if (!isValidConfigKey(key)) {
        throw new ValidationError(`Invalid configuration key: ${key}`);
      }

      config.delete(key as keyof CliConfig);
      Output.success(`Deleted ${key}`);
    });

  // List all configuration
  cmd
    .command('list')
    .alias('ls')
    .description('List all configuration values')
    .option('-j, --json', 'Output as JSON')
    .action((options) => {
      const allConfig = config.getAll();

      if (options.json) {
        console.log(JSON.stringify(allConfig, null, 2));
        return;
      }

      Output.header('VibeBox CLI Configuration');
      Output.blank();

      const entries = Object.entries(allConfig);
      if (entries.length === 0) {
        Output.warn('No configuration found. Run "vibebox init" to get started.');
        return;
      }

      // Mask sensitive values
      const displayConfig = { ...allConfig };
      if (displayConfig.apiKey) {
        displayConfig.apiKey = maskApiKey(displayConfig.apiKey);
      }

      for (const [key, value] of Object.entries(displayConfig)) {
        Output.keyValue(key, String(value));
      }

      Output.blank();
      Output.keyValue('Config file', config.getPath());
    });

  // Show config file path
  cmd
    .command('path')
    .description('Show configuration file path')
    .action(() => {
      console.log(config.getPath());
    });

  // Reset configuration
  cmd
    .command('reset')
    .description('Reset all configuration to defaults')
    .option('-f, --force', 'Skip confirmation prompt')
    .action(async (options) => {
      if (!options.force) {
        const inquirer = await import('inquirer');
        const { confirm } = await inquirer.default.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: 'Are you sure you want to reset all configuration?',
            default: false,
          },
        ]);

        if (!confirm) {
          Output.info('Reset cancelled');
          return;
        }
      }

      config.clear();
      Output.success('Configuration reset successfully');
      Output.info('Run "vibebox init" to reconfigure');
    });

  return cmd;
}

/**
 * Check if a key is a valid configuration key
 */
function isValidConfigKey(key: string): boolean {
  const validKeys: (keyof CliConfig)[] = [
    'apiKey',
    'apiUrl',
    'defaultTemplate',
    'defaultRegion',
    'verbose',
    'editor',
  ];
  return validKeys.includes(key as keyof CliConfig);
}

/**
 * Mask API key for display
 */
function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 10) return '***';
  return apiKey.substring(0, 10) + '***';
}
