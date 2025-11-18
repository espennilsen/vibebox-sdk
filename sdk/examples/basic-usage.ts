/**
 * Basic Usage Example
 *
 * Demonstrates simple sandbox creation and basic operations
 */

import { VibeBox } from '../src';

async function main() {
  // Initialize client (uses VIBEBOX_API_KEY env var)
  const vb = new VibeBox();

  console.log('Creating sandbox...');
  const sandbox = await vb.sandbox('node-20');
  console.log(`Sandbox created: ${sandbox.id}`);

  console.log('\nExecuting code...');
  const result = await sandbox.run(`
    console.log('Hello from VibeBox!');
    console.log('Node version:', process.version);
    return { message: 'Success!' };
  `);

  console.log('Output:', result.stdout);
  console.log('Exit code:', result.exitCode);
  console.log('Duration:', result.duration, 'ms');

  console.log('\nDestroying sandbox...');
  await sandbox.destroy();
  console.log('Done!');
}

main().catch(console.error);
