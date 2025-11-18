# @vibebox/sdk

> Official TypeScript/JavaScript SDK for VibeBox - Programmatic sandbox management

[![npm version](https://img.shields.io/npm/v/@vibebox/sdk.svg)](https://www.npmjs.com/package/@vibebox/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**VibeBox SDK** provides a simple, type-safe interface for creating and managing Docker-based development sandboxes programmatically. Perfect for AI agents, automated testing, CI/CD pipelines, and development workflows.

## Features

- ✨ **One-liner sandbox creation** - Get started with a single line of code
- 🔐 **API key authentication** - Secure programmatic access
- 🌿 **Git integration** - Clone, pull, push, commit operations
- ⚡ **Code execution** - Run code with real-time output
- 📁 **File operations** - Upload, download, manage files
- 🔄 **Auto-retry logic** - Resilient error handling
- 📝 **Full TypeScript support** - Complete type safety
- 🎯 **Fluent API** - Chain operations naturally

## Installation

```bash
npm install @vibebox/sdk
```

## Quick Start

```typescript
import { VibeBox } from '@vibebox/sdk';

// Initialize client
const vb = new VibeBox({
  apiKey: process.env.VIBEBOX_API_KEY,
});

// Create and use a sandbox
const sandbox = await vb.sandbox('node-20');
await sandbox.run('console.log("Hello from VibeBox!")');
await sandbox.destroy();
```

## Authentication

The SDK requires an API key for authentication. You can provide it in two ways:

### 1. Via constructor

```typescript
const vb = new VibeBox({
  apiKey: 'vbx_live_your_api_key_here',
});
```

### 2. Via environment variable

```bash
export VIBEBOX_API_KEY=vbx_live_your_api_key_here
```

```typescript
const vb = new VibeBox(); // Automatically uses VIBEBOX_API_KEY
```

### Creating an API Key

```typescript
const vb = new VibeBox({ apiKey: 'your_jwt_token' });

const { apiKey, key } = await vb.apiKeys.create(
  'My SDK Key',
  ['read', 'write', 'execute']
);

// Save this key securely - it's only shown once!
console.log('API Key:', key);
```

## Core Concepts

### Sandbox

A sandbox is an isolated Docker container environment where you can run code, manage files, and perform git operations.

```typescript
// Create a sandbox
const sandbox = await vb.create({
  name: 'my-dev-environment',
  template: 'node-20',
  autoStart: true,
  ephemeral: true,
  timeout: '2h',
});

// Use the sandbox
await sandbox.run('npm install');
await sandbox.run('npm test');

// Clean up
await sandbox.destroy();
```

### Auto-cleanup with Context Manager

```typescript
const result = await vb.withSandbox('node-20', async (sandbox) => {
  await sandbox.git.clone('https://github.com/user/repo.git');
  await sandbox.run('npm install');
  return await sandbox.run('npm test');
}); // Sandbox automatically destroyed
```

## Usage Examples

### Execute Code

```typescript
const result = await sandbox.run(`
  const fs = require('fs');
  console.log('Files:', fs.readdirSync('.'));
`);

console.log(result.stdout); // Output
console.log(result.exitCode); // 0
console.log(result.duration); // 142ms
```

### Git Operations

```typescript
// Clone a repository
await sandbox.git.clone('https://github.com/user/repo.git', {
  branch: 'main',
  path: '/workspace',
  auth: {
    type: 'token',
    token: 'ghp_xxxxx',
  },
});

// Make changes and commit
await sandbox.run('echo "test" > file.txt');
await sandbox.git.commit('Add test file', { all: true });

// Push changes
await sandbox.git.push();

// Get status
const status = await sandbox.git.status();
console.log(`Branch: ${status.branch}`);
console.log(`Modified: ${status.modified.length} files`);
```

### File Operations

```typescript
// Upload a file
await sandbox.files.upload(
  '/workspace/config.json',
  JSON.stringify({ key: 'value' })
);

// Download a file
const content = await sandbox.files.download('/workspace/output.txt');
console.log(content.toString('utf-8'));

// List files
const files = await sandbox.files.list('/workspace');
files.forEach((file) => {
  console.log(`${file.name} (${file.size} bytes)`);
});

// Create directory
await sandbox.files.mkdir('/workspace/build');

// Copy file
await sandbox.files.copy(
  '/workspace/src/index.ts',
  '/workspace/backup/index.ts'
);
```

### Environment Variables

```typescript
// Set a variable
await sandbox.env.set('NODE_ENV', 'production');

// Set multiple variables
await sandbox.env.set({
  API_KEY: 'secret',
  PORT: '3000',
  DEBUG: 'true',
});

// Use in code execution
const result = await sandbox.run('console.log(process.env.NODE_ENV)', {
  env: { NODE_ENV: 'production' },
});
```

### Parallel Sandboxes

```typescript
// Create multiple sandboxes
const sandboxes = await vb.createMany([
  { template: 'node-20', name: 'worker-1' },
  { template: 'node-20', name: 'worker-2' },
  { template: 'python-3.11', name: 'ml-worker' },
]);

// Execute in parallel
const results = await Promise.all(
  sandboxes.map((s) => s.run('npm test'))
);

// Cleanup
await vb.sandboxes.destroyAll(sandboxes);
```

### Lifecycle Management

```typescript
// Pause (freeze processes, save costs)
await sandbox.pause();

// Resume
await sandbox.resume();

// Restart
await sandbox.restart();

// Stop
await sandbox.stop();

// Start
await sandbox.start();
```

## Configuration

```typescript
const vb = new VibeBox({
  // Required
  apiKey: 'vbx_live_...',

  // Optional
  baseUrl: 'http://localhost:3000', // Default
  defaultProjectId: 'project-123',
  timeout: 30000, // Request timeout (ms)
  retries: 3, // Retry attempts
  retryDelay: 1000, // Initial retry delay (ms)
  headers: {
    'X-Custom-Header': 'value',
  },
});
```

## Error Handling

The SDK provides specific error types for better error handling:

```typescript
import {
  ApiError,
  TimeoutError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
} from '@vibebox/sdk';

try {
  await sandbox.run('invalid command');
} catch (error) {
  if (error instanceof TimeoutError) {
    console.error('Request timed out');
  } else if (error instanceof ApiError) {
    console.error(`API error ${error.statusCode}: ${error.message}`);
  } else if (error instanceof NotFoundError) {
    console.error('Sandbox not found');
  }
}
```

## TypeScript Support

The SDK is written in TypeScript and provides complete type definitions:

```typescript
import type {
  Sandbox,
  CreateSandboxOptions,
  ExecutionResult,
  GitStatus,
  FileInfo,
} from '@vibebox/sdk';

const options: CreateSandboxOptions = {
  name: 'my-sandbox',
  template: 'node-20',
  autoStart: true,
};

const sandbox: Sandbox = await vb.create(options);
const result: ExecutionResult = await sandbox.run('echo "hello"');
```

## API Reference

### VibeBox Client

- `new VibeBox(config?)` - Create client instance
- `vb.sandbox(template)` - One-liner sandbox creation
- `vb.create(options)` - Create sandbox with full options
- `vb.createMany(options[])` - Create multiple sandboxes
- `vb.withSandbox(template, fn)` - Auto-cleanup context manager

### Sandbox

- `sandbox.start()` - Start sandbox
- `sandbox.stop()` - Stop sandbox
- `sandbox.pause()` - Pause sandbox
- `sandbox.resume()` - Resume sandbox
- `sandbox.restart()` - Restart sandbox
- `sandbox.destroy()` - Destroy sandbox
- `sandbox.run(code, options?)` - Execute code
- `sandbox.upload(path, content)` - Upload file
- `sandbox.download(path)` - Download file

### Git Operations

- `sandbox.git.clone(url, options?)` - Clone repository
- `sandbox.git.pull(options?)` - Pull changes
- `sandbox.git.push(options?)` - Push changes
- `sandbox.git.commit(message, options?)` - Commit changes
- `sandbox.git.checkout(branch, options?)` - Checkout branch
- `sandbox.git.status()` - Get git status
- `sandbox.git.diff()` - Get git diff

### File Operations

- `sandbox.files.list(path?)` - List files
- `sandbox.files.info(path)` - Get file info
- `sandbox.files.upload(path, content, permissions?)` - Upload file
- `sandbox.files.download(path)` - Download file
- `sandbox.files.delete(path, options?)` - Delete file
- `sandbox.files.mkdir(path, options?)` - Create directory
- `sandbox.files.copy(source, dest, recursive?)` - Copy file
- `sandbox.files.move(source, dest)` - Move file
- `sandbox.files.search(basePath, pattern)` - Search files

### Execution

- `sandbox.execution.execute(code, options?)` - Execute code
- `sandbox.execution.list(limit?)` - List executions
- `sandbox.execution.get(executionId)` - Get execution
- `sandbox.execution.cancel(executionId)` - Cancel execution
- `sandbox.execution.languages()` - Get supported languages

### Environment Variables

- `sandbox.env.set(key, value)` - Set variable
- `sandbox.env.set(variables)` - Set multiple variables
- `sandbox.env.delete(key)` - Delete variable

### API Keys

- `vb.apiKeys.create(name, scopes, expiresAt?)` - Create API key
- `vb.apiKeys.list()` - List API keys
- `vb.apiKeys.get(keyId)` - Get API key
- `vb.apiKeys.update(keyId, updates)` - Update API key
- `vb.apiKeys.revoke(keyId)` - Revoke API key

## Examples

Check the [examples](./examples) directory for more usage examples:

- [basic-usage.ts](./examples/basic-usage.ts) - Simple sandbox creation
- [git-workflow.ts](./examples/git-workflow.ts) - Git operations
- [claude-code-agent.ts](./examples/claude-code-agent.ts) - Claude Code agent orchestrating multiple sandboxes

### Claude Code Agent Example

The SDK is perfect for AI agents that need to orchestrate multiple development environments:

```typescript
import { ClaudeCodeTestAgent } from './examples/claude-code-agent';

const agent = new ClaudeCodeTestAgent(process.env.VIBEBOX_API_KEY);

// Run tests across multiple repositories in parallel
const results = await agent.runParallelTests([
  'https://github.com/user/repo1.git',
  'https://github.com/user/repo2.git',
  'https://github.com/user/repo3.git',
]);

// Analyze code quality
const reports = await agent.analyzeCodeQuality(repositories);

// Deploy to multiple environments
const deployments = await agent.deployToMultipleEnvironments(repo, environments);

// Update dependencies across multiple repos
const migrations = await agent.updateDependenciesAcrossRepos(repos, updates);
```

See [claude-code-agent.ts](./examples/claude-code-agent.ts) for the complete implementation showing:
- Parallel test execution across repositories
- Code quality analysis
- Multi-environment deployments
- Automated dependency migrations
- Proper error handling and cleanup

## Requirements

- Node.js >= 18.0.0
- VibeBox API server running (local or remote)

## License

MIT © VibeBox Team

## Support

- [Documentation](https://github.com/yourusername/vibebox-sdk)
- [API Reference](https://api.vibebox.dev/docs)
- [GitHub Issues](https://github.com/yourusername/vibebox-sdk/issues)

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) for details.
