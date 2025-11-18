import { Command } from 'commander';
import inquirer from 'inquirer';
import { config } from '../utils/config.js';
import { Output } from '../utils/output.js';
import { VibeBox } from '@vibebox/sdk';

/**
 * Initialize VibeBox CLI configuration
 */
export function createInitCommand(): Command {
  return new Command('init')
    .description('Initialize VibeBox CLI configuration')
    .option('-y, --yes', 'Skip prompts and use defaults')
    .action(async (options) => {
      Output.header('VibeBox CLI Initialization');

      if (options.yes) {
        // Use defaults
        const apiUrl = config.getApiUrl();
        config.set('apiUrl', apiUrl);
        config.set('defaultTemplate', 'node-20');

        Output.success('Configuration initialized with defaults');
        Output.info(`API URL: ${apiUrl}`);
        Output.warn('Please set your API key: vibebox config set apiKey <your-api-key>');
        return;
      }

      try {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'apiUrl',
            message: 'VibeBox API URL:',
            default: config.getApiUrl() || 'http://localhost:3000',
            validate: (input: string) => {
              try {
                new URL(input);
                return true;
              } catch {
                return 'Please enter a valid URL';
              }
            },
          },
          {
            type: 'password',
            name: 'apiKey',
            message: 'API Key (leave empty to skip):',
            mask: '*',
          },
          {
            type: 'list',
            name: 'defaultTemplate',
            message: 'Default sandbox template:',
            choices: [
              { name: 'Node.js 20', value: 'node-20' },
              { name: 'Node.js 20 + Claude Code', value: 'node-20-claude-code' },
              { name: 'Python 3.11', value: 'python-3.11' },
            ],
            default: config.get('defaultTemplate') || 'node-20',
          },
          {
            type: 'confirm',
            name: 'verbose',
            message: 'Enable verbose logging?',
            default: config.get('verbose') || false,
          },
        ]);

        // Save configuration
        config.set('apiUrl', answers.apiUrl);
        if (answers.apiKey) {
          config.set('apiKey', answers.apiKey);
        }
        config.set('defaultTemplate', answers.defaultTemplate);
        config.set('verbose', answers.verbose);

        Output.blank();
        Output.success('Configuration saved successfully!');
        Output.blank();

        Output.keyValue('Config file', config.getPath());
        Output.keyValue('API URL', answers.apiUrl);
        Output.keyValue('Default template', answers.defaultTemplate);

        if (!answers.apiKey) {
          Output.blank();
          Output.warn('API key not set. You can set it later with:');
          Output.info('  vibebox config set apiKey <your-api-key>');
        } else {
          // Test the connection
          Output.blank();
          Output.info('Testing connection...');

          try {
            const client = new VibeBox({
              apiKey: answers.apiKey,
              baseUrl: answers.apiUrl,
            });

            // Try to list sandboxes to test the connection
            await client.sandboxes.list({ limit: 1 });

            Output.success('Connection successful!');
          } catch (error) {
            Output.warn('Connection test failed. Please verify your API key and URL.');
            if (error instanceof Error) {
              Output.debug(error.message);
            }
          }
        }

        Output.blank();
        Output.box(
          'Get started:\n\n' +
            '  vibebox new node-20 my-sandbox\n' +
            '  vibebox ls\n' +
            '  vibebox shell my-sandbox',
          { title: 'Next Steps', type: 'info' }
        );
      } catch (error) {
        if ((error as any).isTtyError) {
          Output.error('Prompt could not be rendered in this environment');
        } else {
          Output.error('Initialization failed', error as Error);
        }
        process.exit(1);
      }
    });
}
