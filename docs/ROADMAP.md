# VibeBox Development Roadmap

> **Vision**: Transform VibeBox into an AI Sandbox platform for AI agents, focused on Node.js projects with Claude Code integration

**Target Release**: v2.0.0 - "AI Agent Sandboxes"

**Initial Focus**: Node.js/TypeScript development environments with Claude Code (AI coding assistant)

**Priority**: Developer Experience First

---

## 🎯 Product Vision

VibeBox will become a **developer-first sandbox platform** that enables:

1. **AI Agents** to spawn isolated Node.js environments and execute code safely
2. **Claude Code Integration** for AI-assisted development in secure containers
3. **SDK-First Access** via TypeScript/JavaScript for programmatic control
4. **Full-Featured Dashboard** for human developers and DevOps teams
5. **Self-Hosted First**, with hosted cloud offering in future roadmap

---

## 🏗️ Architecture Principles

- ✅ **Keep Docker containers** (not switching to Firecracker VMs)
- ✅ **Keep full UI** (dashboard remains a core feature)
- ✅ **Breaking changes allowed** (clean v2.0 architecture)
- ✅ **Node.js/TypeScript focus** for initial release
- ✅ **Claude Code integration** as primary AI coding assistant
- 🔮 **Hosted cloud version** (future, post-v2.0)

---

## 📋 Release Milestones

### Phase 1: SDK Foundation (4 weeks)
**Goal**: Enable programmatic sandbox management via TypeScript SDK

**Deliverables**:
- TypeScript/JavaScript SDK (`@vibebox/sdk`)
- API key authentication system
- Git integration (clone repos into `/repo`)
- Simplified REST API for AI agents
- Code execution engine for Node.js
- File upload/download API
- SDK documentation and examples

**Success Criteria**:
- Create sandbox with 3 lines of code
- Clone git repo into sandbox automatically
- Execute Node.js code programmatically
- Upload/download files via SDK
- <5 minutes to first running sandbox with cloned repo

---

### Phase 2: Claude Code Integration (3 weeks)
**Goal**: Deep integration with Claude Code for AI-assisted development

**Deliverables**:
- Claude Code agent configuration in sandboxes
- MCP (Model Context Protocol) server integration
- Pre-configured Node.js + Claude Code templates
- Real-time collaboration between Claude and human developers
- Claude Code session management API
- Specialized UI for Claude Code environments
- **Claude Code Agent SDK** - Orchestrator for controlling VibeBox
- **Multi-sandbox orchestration** - Parallel sandbox management

**Success Criteria**:
- Launch sandbox with Claude Code pre-installed
- Claude can read/write files in sandbox
- Claude can execute commands and see output
- Human developer can collaborate with Claude in same environment
- Claude Agent can orchestrate multiple sandboxes in parallel
- Agent can spin up N sandboxes for distributed tasks

---

### Phase 3: Performance & UX (3 weeks)
**Goal**: Optimize for speed and developer experience

**Deliverables**:
- Container pre-warming pools (Node.js images)
- Faster cold starts (<1s for Node.js)
- Pause/resume sandbox state
- Ephemeral sandboxes (auto-cleanup)
- Improved dashboard UX for AI workflows
- Quick-start CLI tool

**Success Criteria**:
- Container startup <1s (vs current ~2s)
- Pre-warmed pool maintains 5 ready containers
- Dashboard shows AI agent activity
- CLI: `vibebox create` → running in <10s

---

### Phase 4: Advanced Features (4 weeks)
**Goal**: Production-ready platform for AI agents

**Deliverables**:
- Multi-language support (Python, Go, Rust alongside Node.js)
- Sandbox templates marketplace
- Advanced monitoring and observability
- Cost tracking per sandbox
- Webhook notifications
- GraphQL API (alternative to REST)
- Enhanced security policies for AI agents

**Success Criteria**:
- Support 5+ language runtimes
- 10+ community-contributed templates
- Real-time cost dashboard
- Webhook integration examples

---

### Phase 5: Enterprise & Scale (4 weeks)
**Goal**: Enterprise-ready with high availability

**Deliverables**:
- High availability deployment (multi-region)
- Advanced RBAC for organizations
- Audit logging and compliance
- SLA monitoring and guarantees
- Advanced resource quotas
- Billing and usage metering
- White-label deployment options

**Success Criteria**:
- 99.9% uptime SLA
- Support 10,000+ concurrent sandboxes
- SOC 2 compliance documentation
- Enterprise customer deployments

---

## 🚀 Detailed Feature Breakdown

### Phase 1: SDK Foundation

#### 1.1 TypeScript SDK (`@vibebox/sdk`)
**Duration**: 2 weeks

**Tasks**:
- [ ] SDK package structure (`packages/sdk/`)
- [ ] Core client with authentication
- [ ] Sandbox CRUD operations
- [ ] Git integration API (clone, pull, push, commit)
- [ ] Code execution API
- [ ] File transfer API
- [ ] WebSocket integration (logs, terminal)
- [ ] Error handling and retries
- [ ] TypeScript types and JSDoc
- [ ] Unit tests (90% coverage)
- [ ] Integration tests with backend

**API Design**:
```typescript
import { VibeBox } from '@vibebox/sdk';

// Initialize client (auto-detects API key from env)
const vb = new VibeBox();

// Or with explicit config
const vb = new VibeBox({
  apiKey: 'vb_live_abc123',
  region: 'us-east-1'  // optional for cloud version
});

// ===== Quick Start: One-liner sandbox =====
// Create and auto-start sandbox in one call
const sandbox = await vb.sandbox('node-20-claude-code');

// ===== Or with full configuration =====
const sandbox = await vb.create({
  template: 'node-20-claude-code',
  name: 'my-dev-environment',
  autoStart: true,  // start immediately (default: true)
  ephemeral: false, // persistent sandbox (default: false)
  timeout: '2h'     // human-readable durations
});

// ===== Git repository integration =====
// Clone repository into sandbox at /repo
const sandbox = await vb.create({
  template: 'node-20-claude-code',
  git: {
    url: 'https://github.com/user/project.git',
    branch: 'main',  // optional, defaults to default branch
    path: '/repo'    // optional, defaults to /repo
  }
});

// Or clone after creation
await sandbox.git.clone('https://github.com/user/project.git');
await sandbox.git.clone('https://github.com/user/project.git', {
  branch: 'develop',
  path: '/repo',
  depth: 1  // shallow clone
});

// Git operations in sandbox
await sandbox.git.pull();
await sandbox.git.checkout('feature-branch');
await sandbox.git.commit('feat: add new feature', { all: true });
await sandbox.git.push();

// Quick workflow: clone, install, and run
const sandbox = await vb.create({
  template: 'node-20-claude-code',
  git: 'https://github.com/user/project.git'  // shorthand
});

await sandbox.run('npm install', { cwd: '/repo' });
await sandbox.run('npm test', { cwd: '/repo' });

// ===== Execute code with automatic cleanup =====
// Run code and get structured results
const result = await sandbox.run(`
  const fs = require('fs');
  const files = fs.readdirSync('.');
  console.log('Files:', files);
  return files;
`);

console.log(result.output);    // "Files: ['package.json', 'src']"
console.log(result.returnValue); // ['package.json', 'src']
console.log(result.exitCode);   // 0
console.log(result.duration);   // 142ms

// ===== Smart file operations =====
// Upload with auto-detection (single file or directory)
await sandbox.upload('./package.json');  // auto-destination: /workspace/package.json
await sandbox.upload('./src');           // auto-destination: /workspace/src/

// Or explicit paths
await sandbox.upload('./local.json', '/app/config.json');

// Upload with pattern matching
await sandbox.upload('./**/*.ts', { exclude: ['node_modules', 'dist'] });

// Download with smart defaults
const content = await sandbox.download('dist/bundle.js');  // returns Buffer
await sandbox.download('dist/', './local-dist/');          // directory sync

// ===== Real-time log streaming with built-in formatting =====
// Simple streaming
sandbox.onLog((log) => {
  console.log(log.text); // auto-formatted with timestamp
});

// Or with filtering
sandbox.onLog({
  filter: 'stdout',     // only stdout
  level: 'info'         // log level filtering
}, (log) => {
  console.log(log.text);
});

// ===== Execute commands with stream support =====
const cmd = await sandbox.exec('npm install', {
  stream: true,  // real-time output
  cwd: '/workspace'
});

cmd.onData((data) => console.log(data));
cmd.onComplete((result) => console.log('Done!', result.exitCode));

// Or await completion
const result = await sandbox.exec('npm test');

// ===== Fluent API for common workflows =====
await sandbox
  .upload('./src')
  .run('npm install')
  .run('npm build')
  .download('dist/', './local-dist/')
  .destroy();

// ===== Environment management =====
// Set environment variables
await sandbox.env.set('NODE_ENV', 'production');
await sandbox.env.set({ API_KEY: 'secret', PORT: '3000' });

// Get variables
const nodeEnv = await sandbox.env.get('NODE_ENV');

// ===== Claude Code integration (Phase 2) =====
// Enable Claude Code assistant
await sandbox.claude.enable();

// Ask Claude to perform tasks
await sandbox.claude.ask('Add error handling to src/index.ts');

// Review Claude's changes before applying
const changes = await sandbox.claude.pendingChanges();
await sandbox.claude.approve(); // or .reject()

// ===== Lifecycle management =====
await sandbox.pause();  // preserve state, stop billing
await sandbox.resume(); // quick restart from paused state
await sandbox.restart(); // full restart

// Auto-cleanup with context manager pattern
await vb.withSandbox('node-20', async (sandbox) => {
  await sandbox.run('npm install');
  const result = await sandbox.run('npm test');
  return result;
}); // automatically destroyed after block

// ===== Batch operations =====
// Create multiple sandboxes
const sandboxes = await vb.createMany([
  { template: 'node-20', name: 'worker-1' },
  { template: 'node-20', name: 'worker-2' },
  { template: 'python-3.11', name: 'ml-processor' }
]);

// Execute in parallel
const results = await Promise.all(
  sandboxes.map(s => s.run('npm test'))
);

// Cleanup all
await vb.destroyAll(sandboxes);

// ===== Error handling with retries =====
const result = await sandbox.run('flaky-script.js', {
  retries: 3,
  retryDelay: 1000,
  timeout: '30s'
}).catch((error) => {
  console.error('Failed after 3 retries:', error.message);
  console.error('Logs:', error.logs); // auto-attached logs
});

// ===== Sandbox snapshots (Phase 3) =====
const snapshot = await sandbox.snapshot('before-deploy');
await sandbox.run('npm run deploy');
// Rollback if needed
await sandbox.restore(snapshot);
```

#### 1.2 API Key Authentication
**Duration**: 3 days

**Tasks**:
- [ ] API key data model (`ApiKey` entity)
- [ ] API key generation endpoint
- [ ] API key validation middleware
- [ ] Scoped permissions (read, write, execute)
- [ ] Key rotation support
- [ ] Rate limiting per key
- [ ] Usage tracking per key

**Database Schema**:
```prisma
model ApiKey {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  name        String   // "Production Key", "CI/CD Key"
  keyHash     String   @unique // bcrypt hash
  keyPrefix   String   // "vb_live_" or "vb_test_"
  scopes      String[] // ["sandboxes:read", "sandboxes:write", "execute"]
  expiresAt   DateTime?
  lastUsedAt  DateTime?
  createdAt   DateTime @default(now())
}
```

#### 1.3 Git Integration Service
**Duration**: 4 days

**Tasks**:
- [ ] Git service (`git.service.ts`)
- [ ] Clone repository endpoint
- [ ] Git operations (pull, push, commit, checkout)
- [ ] Authentication support (SSH keys, tokens)
- [ ] Branch management
- [ ] Auto-clone during sandbox creation
- [ ] Git status and diff endpoints
- [ ] Webhook integration for auto-pull

**API Endpoints**:
```
POST   /api/v1/sandboxes/{id}/git/clone
POST   /api/v1/sandboxes/{id}/git/pull
POST   /api/v1/sandboxes/{id}/git/push
POST   /api/v1/sandboxes/{id}/git/commit
POST   /api/v1/sandboxes/{id}/git/checkout
GET    /api/v1/sandboxes/{id}/git/status
GET    /api/v1/sandboxes/{id}/git/diff
```

**Clone Request**:
```json
{
  "url": "https://github.com/user/project.git",
  "branch": "main",
  "path": "/repo",
  "depth": 1,
  "auth": {
    "type": "token",
    "token": "ghp_xxxxx"
  }
}
```

**Implementation**:
```typescript
export class GitService {
  async cloneRepository(
    containerId: string,
    url: string,
    options: GitCloneOptions
  ): Promise<GitCloneResult> {
    const { branch, path = '/repo', depth, auth } = options;

    // 1. Setup authentication if provided
    if (auth?.type === 'token') {
      await this.setupGitCredentials(containerId, auth.token);
    } else if (auth?.type === 'ssh') {
      await this.setupSSHKey(containerId, auth.privateKey);
    }

    // 2. Clone repository
    const cloneCmd = [
      'git', 'clone',
      branch ? `--branch ${branch}` : '',
      depth ? `--depth ${depth}` : '',
      url,
      path
    ].filter(Boolean).join(' ');

    const result = await this.dockerService.exec(containerId, {
      cmd: ['sh', '-c', cloneCmd],
      timeout: 300000, // 5 minutes
      attachStdout: true,
      attachStderr: true
    });

    // 3. Store git config in database
    await this.db.sandboxGitConfig.create({
      data: {
        sandboxId,
        repoUrl: url,
        branch: branch || 'main',
        path,
        clonedAt: new Date()
      }
    });

    return {
      success: result.exitCode === 0,
      path,
      branch: branch || await this.getCurrentBranch(containerId, path)
    };
  }

  async pull(containerId: string, path: string = '/repo') {
    return await this.dockerService.exec(containerId, {
      cmd: ['git', '-C', path, 'pull'],
      timeout: 120000
    });
  }

  async commit(
    containerId: string,
    message: string,
    options: GitCommitOptions
  ) {
    const { path = '/repo', all = false } = options;

    if (all) {
      await this.dockerService.exec(containerId, {
        cmd: ['git', '-C', path, 'add', '.']
      });
    }

    return await this.dockerService.exec(containerId, {
      cmd: ['git', '-C', path, 'commit', '-m', message]
    });
  }
}
```

#### 1.4 Code Execution Engine
**Duration**: 1 week

**Tasks**:
- [ ] Execution service (`execution.service.ts`)
- [ ] Language runtime detection
- [ ] Timeout and resource limits
- [ ] Stdout/stderr capture
- [ ] Exit code handling
- [ ] Execution history tracking
- [ ] WebSocket streaming for long-running tasks

**API Endpoint**:
```
POST /api/v1/sandboxes/{id}/execute
```

**Request**:
```json
{
  "code": "console.log('Hello from AI agent!');",
  "language": "javascript",
  "timeout": 30000,
  "env": {
    "NODE_ENV": "production"
  }
}
```

**Response**:
```json
{
  "executionId": "exec_123",
  "stdout": "Hello from AI agent!\n",
  "stderr": "",
  "exitCode": 0,
  "duration": 142,
  "status": "completed"
}
```

**Implementation**:
```typescript
export class ExecutionService {
  async execute(
    containerId: string,
    code: string,
    language: string,
    timeout: number
  ): Promise<ExecutionResult> {
    // 1. Create temp file in container
    const scriptPath = `/tmp/exec_${uuidv4()}.${this.getExtension(language)}`;

    // 2. Write code to file
    await this.dockerService.writeFile(containerId, scriptPath, code);

    // 3. Execute with timeout
    const result = await this.dockerService.exec(containerId, {
      cmd: [this.getRuntime(language), scriptPath],
      timeout,
      attachStdout: true,
      attachStderr: true
    });

    // 4. Cleanup
    await this.dockerService.removeFile(containerId, scriptPath);

    return {
      executionId: uuidv4(),
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      duration: result.duration,
      status: result.exitCode === 0 ? 'completed' : 'failed'
    };
  }
}
```

#### 1.5 File Transfer API
**Duration**: 4 days

**Tasks**:
- [ ] File service (`file.service.ts`)
- [ ] Upload endpoint (multipart)
- [ ] Download endpoint (streaming)
- [ ] List directory endpoint
- [ ] Delete file/directory endpoint
- [ ] Large file handling (chunked upload)
- [ ] File permissions preservation
- [ ] Progress callbacks for SDK

**API Endpoints**:
```
POST   /api/v1/sandboxes/{id}/files        # Upload
GET    /api/v1/sandboxes/{id}/files        # List
GET    /api/v1/sandboxes/{id}/files/{path} # Download
DELETE /api/v1/sandboxes/{id}/files/{path} # Delete
```

**SDK Usage**:
```typescript
// Upload single file
await sandbox.files.upload('./local.txt', '/workspace/remote.txt');

// Upload directory (recursive)
await sandbox.files.uploadDir('./src', '/workspace/src');

// Download file
const content = await sandbox.files.download('/workspace/output.txt');

// List directory
const files = await sandbox.files.list('/workspace');
// [{ path: '/workspace/package.json', size: 1024, isDir: false }, ...]

// Delete file
await sandbox.files.delete('/workspace/temp.txt');
```

---

### Phase 2: Claude Code Integration

#### 2.1 Claude Code Configuration
**Duration**: 1 week

**Tasks**:
- [ ] Research Claude Code installation in containers
- [ ] Create Dockerfile with Claude Code pre-installed
- [ ] Configure Claude Code settings (context, extensions)
- [ ] MCP (Model Context Protocol) server setup
- [ ] Auto-start Claude Code on sandbox creation
- [ ] Claude Code session management
- [ ] Health check for Claude Code availability

**Template Configuration**:
```yaml
# templates/node-20-claude-code.yaml
name: node-20-claude-code
displayName: "Node.js 20 + Claude Code"
description: "Node.js 20 development environment with Claude Code AI assistant"
baseImage: "vibebox/node-20-claude-code:latest"
preInstalled:
  - nodejs: "20.x"
  - npm: "latest"
  - claude-code: "latest"
  - git: "latest"
defaultEnv:
  NODE_ENV: "development"
  CLAUDE_CODE_ENABLED: "true"
autoStart:
  - claude-code
ports:
  - container: 3000
    protocol: tcp
    description: "Application port"
  - container: 8080
    protocol: tcp
    description: "Claude Code server"
```

#### 2.2 MCP Server Integration
**Duration**: 1 week

**Tasks**:
- [ ] MCP server implementation for VibeBox
- [ ] File system access for Claude
- [ ] Command execution permissions
- [ ] Git integration
- [ ] NPM/package manager access
- [ ] Environment variable management
- [ ] Resource monitoring for Claude

**MCP Capabilities**:
```typescript
// Claude can:
// 1. Read/write files in sandbox
await claude.fs.readFile('/workspace/src/index.ts');
await claude.fs.writeFile('/workspace/src/new.ts', content);

// 2. Execute commands
await claude.exec('npm install lodash');
await claude.exec('npm test');

// 3. Access Git
await claude.git.commit('feat: add new feature');
await claude.git.push();

// 4. Manage environment
await claude.env.set('API_KEY', 'secret');
const value = await claude.env.get('NODE_ENV');
```

#### 2.3 Claude Code Agent SDK (Orchestrator)
**Duration**: 1 week

**Tasks**:
- [ ] Claude Code Agent package (`@vibebox/claude-agent`)
- [ ] Agent SDK using Claude Agent SDK architecture
- [ ] Multi-sandbox orchestration engine
- [ ] Parallel task distribution
- [ ] Agent-to-sandbox communication
- [ ] Task queue and worker pool management
- [ ] Agent context management across sandboxes
- [ ] Error handling and recovery strategies
- [ ] Agent logging and observability

**Architecture**:
```typescript
// packages/claude-agent/
├── src/
│   ├── orchestrator.ts        // Main orchestrator class
│   ├── agent.ts                // Base agent implementation
│   ├── sandbox-pool.ts         // Sandbox pool manager
│   ├── task-queue.ts           // Task distribution
│   └── mcp-client.ts           // MCP integration
├── examples/
│   ├── parallel-testing.ts     // Run tests across N sandboxes
│   ├── distributed-build.ts    // Parallel build tasks
│   └── multi-repo-analysis.ts  // Analyze multiple repos
└── package.json
```

**Agent SDK API**:
```typescript
import { VibeBoxAgent } from '@vibebox/claude-agent';

// Initialize agent with VibeBox connection
const agent = new VibeBoxAgent({
  apiKey: process.env.VIBEBOX_API_KEY,
  claudeApiKey: process.env.ANTHROPIC_API_KEY,
  maxParallelSandboxes: 10
});

// ===== Single sandbox control =====
const task = await agent.task('Analyze this repository', {
  git: 'https://github.com/user/project.git',
  template: 'node-20-claude-code'
});

await task.waitForCompletion();
console.log(task.result);

// ===== Parallel sandbox orchestration =====
// Spin up N sandboxes for distributed work
const orchestrator = agent.orchestrate({
  maxWorkers: 5,
  template: 'node-20-claude-code'
});

// Distribute tasks across sandboxes
const tasks = [
  { repo: 'https://github.com/user/repo1.git', task: 'Run tests' },
  { repo: 'https://github.com/user/repo2.git', task: 'Run tests' },
  { repo: 'https://github.com/user/repo3.git', task: 'Run tests' },
  { repo: 'https://github.com/user/repo4.git', task: 'Run tests' },
  { repo: 'https://github.com/user/repo5.git', task: 'Run tests' }
];

const results = await orchestrator.executeAll(tasks);

// ===== Map-reduce pattern =====
const repos = [
  'https://github.com/user/repo1.git',
  'https://github.com/user/repo2.git',
  'https://github.com/user/repo3.git'
];

// Map: Run analysis in parallel sandboxes
const analyses = await agent.map(repos, async (repo, sandbox) => {
  await sandbox.git.clone(repo);
  await sandbox.run('npm install', { cwd: '/repo' });
  const result = await sandbox.run('npm test', { cwd: '/repo' });
  return {
    repo,
    passed: result.exitCode === 0,
    coverage: parseCoverage(result.output)
  };
});

// Reduce: Aggregate results
const summary = agent.reduce(analyses, (acc, result) => {
  acc.total++;
  if (result.passed) acc.passed++;
  acc.avgCoverage += result.coverage;
  return acc;
}, { total: 0, passed: 0, avgCoverage: 0 });

// ===== Worker pool for long-running tasks =====
const pool = await agent.createPool({
  workers: 5,
  template: 'node-20-claude-code',
  persistent: true  // keep sandboxes alive
});

// Submit tasks to pool
for (const repo of repositories) {
  pool.submit(async (sandbox) => {
    await sandbox.git.clone(repo);
    await sandbox.run('npm install', { cwd: '/repo' });
    await sandbox.run('npm test', { cwd: '/repo' });
  });
}

// Wait for all tasks
await pool.waitForCompletion();
await pool.shutdown();

// ===== Streaming results from multiple sandboxes =====
const stream = agent.streamResults({
  tasks: ['task1', 'task2', 'task3'],
  parallelism: 3
});

for await (const update of stream) {
  console.log(`Sandbox ${update.sandboxId}: ${update.status}`);
  console.log(update.logs);
}

// ===== Error handling and retries =====
const result = await agent.task('Build and test', {
  git: 'https://github.com/user/project.git',
  retries: 3,
  fallbackStrategy: 'cleanup-and-retry',
  onError: async (error, sandbox) => {
    // Custom error handling
    await sandbox.exec('cat /repo/build.log');
  }
});

// ===== Context sharing across sandboxes =====
const context = agent.createContext({
  sharedData: { apiKey: 'secret', baseUrl: 'https://api.example.com' }
});

await agent.map(repos, async (repo, sandbox) => {
  // Context is automatically available in all sandboxes
  const apiKey = await context.get('apiKey');
  await sandbox.env.set('API_KEY', apiKey);
}, { context });
```

**Orchestrator Implementation**:
```typescript
export class VibeBoxAgent {
  private vb: VibeBox;
  private anthropic: Anthropic;
  private activeSandboxes: Map<string, Sandbox> = new Map();
  private maxParallelSandboxes: number;

  constructor(options: AgentOptions) {
    this.vb = new VibeBox({ apiKey: options.apiKey });
    this.anthropic = new Anthropic({ apiKey: options.claudeApiKey });
    this.maxParallelSandboxes = options.maxParallelSandboxes || 10;
  }

  /**
   * Execute tasks in parallel across multiple sandboxes
   */
  async map<T, R>(
    items: T[],
    fn: (item: T, sandbox: Sandbox) => Promise<R>,
    options?: MapOptions
  ): Promise<R[]> {
    const { parallelism = this.maxParallelSandboxes, template = 'node-20' } = options || {};

    // Create sandbox pool
    const pool = new SandboxPool(this.vb, template, parallelism);
    await pool.initialize();

    try {
      // Execute tasks in parallel with concurrency limit
      const results = await Promise.all(
        items.map(async (item) => {
          const sandbox = await pool.acquire();
          try {
            return await fn(item, sandbox);
          } finally {
            await pool.release(sandbox);
          }
        })
      );

      return results;
    } finally {
      await pool.shutdown();
    }
  }

  /**
   * Create a persistent worker pool
   */
  async createPool(options: PoolOptions): Promise<WorkerPool> {
    const pool = new WorkerPool(this.vb, options);
    await pool.initialize();
    return pool;
  }

  /**
   * Execute a single task with Claude Code
   */
  async task(prompt: string, options: TaskOptions): Promise<TaskResult> {
    const sandbox = await this.vb.create({
      template: options.template || 'node-20-claude-code',
      git: options.git,
      ephemeral: true
    });

    try {
      // Use Claude to execute the task
      const result = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20250129',
        max_tokens: 8192,
        messages: [{
          role: 'user',
          content: prompt
        }],
        tools: [
          {
            name: 'execute_code',
            description: 'Execute code in the sandbox',
            input_schema: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                language: { type: 'string' }
              }
            }
          },
          {
            name: 'read_file',
            description: 'Read file from sandbox',
            input_schema: {
              type: 'object',
              properties: {
                path: { type: 'string' }
              }
            }
          }
        ]
      });

      // Process Claude's tool calls
      for (const block of result.content) {
        if (block.type === 'tool_use') {
          if (block.name === 'execute_code') {
            await sandbox.run(block.input.code);
          } else if (block.name === 'read_file') {
            await sandbox.download(block.input.path);
          }
        }
      }

      return {
        success: true,
        result: result.content
      };
    } finally {
      if (options.ephemeral !== false) {
        await sandbox.destroy();
      }
    }
  }
}
```

**Use Cases**:
1. **Parallel Testing**: Run test suites across multiple sandboxes
2. **Multi-repo Analysis**: Analyze multiple repositories simultaneously
3. **Distributed Builds**: Build different components in parallel
4. **Batch Processing**: Process large datasets across workers
5. **CI/CD Pipelines**: Orchestrate complex deployment workflows
6. **Code Review**: Review multiple PRs in parallel
7. **Migration Tasks**: Update multiple repositories simultaneously

#### 2.4 Claude Code UI Components
**Duration**: 1 week

**Tasks**:
- [ ] Claude Code status indicator in dashboard
- [ ] Real-time Claude activity feed
- [ ] Claude conversation history viewer
- [ ] Files changed by Claude (diff viewer)
- [ ] Approve/reject Claude suggestions UI
- [ ] Claude Code configuration panel
- [ ] Performance metrics for Claude operations
- [ ] Multi-sandbox orchestration dashboard
- [ ] Agent task queue visualization
- [ ] Parallel execution monitoring

**UI Features**:
- **Activity Feed**: Show what Claude is doing in real-time
- **Collaboration Mode**: Toggle between human and Claude control
- **Change Review**: Approve file changes before applying
- **Context Inspector**: View what context Claude has access to
- **Orchestration Dashboard**: Monitor parallel sandbox execution
- **Task Queue**: View pending, running, and completed agent tasks

---

### Phase 3: Performance & UX

#### 3.1 Container Pre-warming
**Duration**: 1 week

**Tasks**:
- [ ] Pool manager service (`pool.service.ts`)
- [ ] Pre-warm containers on app startup
- [ ] Dynamic pool sizing based on demand
- [ ] Image-specific pools (Node.js, Python, etc.)
- [ ] Health checks for pooled containers
- [ ] Pool metrics and monitoring
- [ ] Graceful pool shutdown

**Implementation**:
```typescript
export class PoolService {
  private pools: Map<string, Container[]> = new Map();

  async initialize() {
    // Pre-warm 5 Node.js containers
    await this.warmPool('node:20', 5);
    await this.warmPool('vibebox/node-20-claude-code:latest', 3);
  }

  async acquire(image: string): Promise<Container> {
    const pool = this.pools.get(image) || [];

    if (pool.length > 0) {
      const container = pool.shift();
      this.replenishPool(image); // Background replenishment
      return container;
    }

    // No pre-warmed container available, create new
    return await this.createContainer(image);
  }

  async release(container: Container) {
    await container.stop();
    await container.remove();
  }
}
```

#### 3.2 Pause/Resume Sandboxes
**Duration**: 4 days

**Tasks**:
- [ ] Pause endpoint (`POST /sandboxes/{id}/pause`)
- [ ] Resume endpoint (`POST /sandboxes/{id}/resume`)
- [ ] State persistence during pause
- [ ] Auto-pause on idle (configurable timeout)
- [ ] Resume optimization (fast restart)
- [ ] UI indicators for paused state

**Docker Integration**:
```typescript
export class DockerService {
  async pauseContainer(containerId: string) {
    const container = this.docker.getContainer(containerId);
    await container.pause();

    await this.db.environment.update({
      where: { containerId },
      data: { status: 'paused', pausedAt: new Date() }
    });
  }

  async resumeContainer(containerId: string) {
    const container = this.docker.getContainer(containerId);
    await container.unpause();

    await this.db.environment.update({
      where: { containerId },
      data: { status: 'running', pausedAt: null }
    });
  }
}
```

#### 3.3 Ephemeral Sandboxes
**Duration**: 3 days

**Tasks**:
- [ ] Ephemeral sandbox flag in data model
- [ ] Auto-cleanup job (cron)
- [ ] Configurable TTL (time-to-live)
- [ ] SDK support for ephemeral mode
- [ ] Warning UI for ephemeral sandboxes
- [ ] Resource limits for ephemeral sandboxes

**SDK Usage**:
```typescript
// Create ephemeral sandbox (auto-cleanup after 30 minutes)
const sandbox = await vb.create({
  template: 'node-20',
  ephemeral: true,
  timeout: '30m' // human-readable: '30m', '2h', '1d'
});

// Or use the quick helper for one-time use
const sandbox = await vb.ephemeral('node-20', '1h');

// One-shot execution with auto-cleanup
const result = await vb.runOnce('node-20', `
  console.log("Hello from ephemeral sandbox!");
  return { status: 'success' };
`);
// Sandbox automatically destroyed after execution

// Execute multiple tasks in ephemeral sandbox
const result = await vb.withEphemeral('node-20', async (sandbox) => {
  await sandbox.upload('./package.json');
  await sandbox.run('npm install');
  const testResult = await sandbox.run('npm test');
  return testResult;
}, { timeout: '15m' }); // auto-destroyed after callback
```

#### 3.4 Quick-Start CLI
**Duration**: 4 days

**Tasks**:
- [ ] CLI package (`@vibebox/cli`)
- [ ] Authentication commands
- [ ] Sandbox CRUD commands
- [ ] File upload/download commands
- [ ] Log streaming command
- [ ] Interactive mode
- [ ] Configuration file support

**CLI Commands**:
```bash
# Install
npm install -g @vibebox/cli

# Quick setup (interactive)
vibebox init
# Prompts for API key and preferences

# ===== Quick start shortcuts =====
# Create and connect to sandbox in one command
vibebox new node-20-claude-code
# Creates sandbox with auto-generated name and opens shell

# Or with custom name
vibebox new node-20 my-app

# Create sandbox with git repo
vibebox new node-20 my-app --git https://github.com/user/project.git
vibebox new node-20 my-app --git https://github.com/user/project.git --branch develop

# ===== Sandbox management =====
# List all sandboxes
vibebox ls

# Get sandbox details
vibebox info my-app

# Start/stop/restart
vibebox start my-app
vibebox stop my-app
vibebox restart my-app

# Pause/resume (save costs)
vibebox pause my-app
vibebox resume my-app

# ===== File operations =====
# Upload (smart auto-detection)
vibebox push ./src my-app
vibebox push package.json my-app  # auto-destination: /workspace/package.json

# Download
vibebox pull my-app:dist ./local-dist
vibebox pull my-app:output.txt    # downloads to current directory

# Sync directory (watch mode)
vibebox sync ./src my-app --watch

# ===== Git operations =====
# Clone repository into existing sandbox
vibebox git clone my-app https://github.com/user/project.git
vibebox git clone my-app https://github.com/user/project.git --branch develop

# Git operations in /repo directory
vibebox git pull my-app
vibebox git status my-app
vibebox git diff my-app

# Checkout branch
vibebox git checkout my-app feature-branch

# Commit changes
vibebox git commit my-app "feat: add new feature"
vibebox git commit my-app "fix: bug" --all  # git add . && git commit

# Push changes
vibebox git push my-app

# Full workflow example
vibebox new node-20 my-app --git https://github.com/user/project.git
vibebox exec my-app "cd /repo && npm install"
vibebox exec my-app "cd /repo && npm test"
vibebox git commit my-app "test: add tests" --all
vibebox git push my-app

# ===== Code execution =====
# Execute command
vibebox exec my-app "npm install"
vibebox exec my-app "npm test"

# Execute in /repo directory
vibebox exec my-app "npm install" --cwd /repo
vibebox exec my-app "npm test" --cwd /repo

# Run script file
vibebox run my-app ./deploy.sh

# Interactive shell
vibebox shell my-app
vibebox sh my-app  # short alias

# ===== Logs and monitoring =====
# Stream logs
vibebox logs my-app
vibebox logs my-app -f           # follow mode
vibebox logs my-app --since 1h   # last hour
vibebox logs my-app --tail 100   # last 100 lines

# ===== One-shot operations =====
# Quick execution without persistent sandbox
vibebox exec-once node-20 "console.log('Hello!')"

# Run script in ephemeral sandbox
vibebox run-once node-20 ./test-script.js

# ===== Claude Code integration =====
# Enable Claude in existing sandbox
vibebox claude enable my-app

# Ask Claude to do something
vibebox claude ask my-app "Add tests for src/utils.ts"

# View Claude's activity
vibebox claude status my-app

# ===== Cleanup =====
# Destroy specific sandbox
vibebox rm my-app
vibebox destroy my-app  # verbose alias

# Destroy multiple
vibebox rm my-app worker-1 worker-2

# Destroy all ephemeral sandboxes
vibebox cleanup

# Destroy all sandboxes (with confirmation)
vibebox rm --all

# ===== Configuration =====
# Set default template
vibebox config set template node-20-claude-code

# View configuration
vibebox config list

# ===== Templates =====
# List available templates
vibebox templates

# Get template details
vibebox template info node-20-claude-code

# ===== Utility commands =====
# Check status
vibebox status

# View usage and costs
vibebox usage

# Generate API key
vibebox keys create "My CI/CD Key"
vibebox keys list
vibebox keys revoke key_123
```

---

### Phase 4: Advanced Features

#### 4.1 Multi-Language Support
**Duration**: 2 weeks

**Tasks**:
- [ ] Python runtime support
- [ ] Go runtime support
- [ ] Rust runtime support
- [ ] Ruby runtime support
- [ ] Language-specific templates
- [ ] Package manager integration (pip, cargo, bundler)
- [ ] Language detection in execution API

**Templates**:
- `node-20` - Node.js 20
- `node-20-claude-code` - Node.js 20 + Claude Code
- `python-3.11` - Python 3.11
- `python-3.11-claude-code` - Python 3.11 + Claude Code
- `go-1.21` - Go 1.21
- `rust-1.75` - Rust 1.75
- `fullstack` - Node.js + Python + database

#### 4.2 Sandbox Templates Marketplace
**Duration**: 1 week

**Tasks**:
- [ ] Template registry (database)
- [ ] Template submission API
- [ ] Template validation and review
- [ ] Public template marketplace UI
- [ ] Template versioning
- [ ] Template ratings and reviews
- [ ] Featured templates

**Community Templates**:
- `express-app` - Express.js starter
- `react-vite` - React + Vite
- `nextjs-14` - Next.js 14
- `fastify-prisma` - Fastify + Prisma
- `ai-agent-langchain` - LangChain + Claude Code
- `data-science` - Python + Jupyter + pandas

#### 4.3 Monitoring & Observability
**Duration**: 1 week

**Tasks**:
- [ ] Prometheus metrics export
- [ ] Grafana dashboard templates
- [ ] OpenTelemetry tracing
- [ ] Real-time resource monitoring
- [ ] Alert rules and notifications
- [ ] Performance dashboards
- [ ] SLO/SLI tracking

**Metrics**:
- Sandbox creation latency
- Code execution duration
- File transfer speed
- WebSocket connection count
- Error rates by endpoint
- Resource utilization (CPU, memory, disk)

#### 4.4 Webhook Notifications
**Duration**: 3 days

**Tasks**:
- [ ] Webhook configuration API
- [ ] Event subscription system
- [ ] Webhook delivery queue
- [ ] Retry logic with exponential backoff
- [ ] Webhook signature verification
- [ ] Event filtering
- [ ] Delivery history and logs

**Webhook Events**:
```typescript
enum WebhookEvent {
  SANDBOX_CREATED = 'sandbox.created',
  SANDBOX_STARTED = 'sandbox.started',
  SANDBOX_STOPPED = 'sandbox.stopped',
  SANDBOX_DESTROYED = 'sandbox.destroyed',
  EXECUTION_COMPLETED = 'execution.completed',
  EXECUTION_FAILED = 'execution.failed',
  FILE_UPLOADED = 'file.uploaded',
  RESOURCE_LIMIT_EXCEEDED = 'resource.limit_exceeded'
}
```

---

### Phase 5: Enterprise & Scale

#### 5.1 High Availability
**Duration**: 2 weeks

**Tasks**:
- [ ] Multi-region deployment guide
- [ ] Database replication (PostgreSQL)
- [ ] Redis cluster setup
- [ ] Load balancer configuration
- [ ] Health checks and auto-recovery
- [ ] Failover testing
- [ ] Disaster recovery plan

#### 5.2 Advanced RBAC
**Duration**: 1 week

**Tasks**:
- [ ] Organization entity
- [ ] Custom roles and permissions
- [ ] Resource-level access control
- [ ] Permission inheritance
- [ ] Audit trail for permissions
- [ ] SSO integration (SAML, OIDC)

#### 5.3 Billing & Metering
**Duration**: 2 weeks

**Tasks**:
- [ ] Usage tracking (CPU, memory, storage, execution time)
- [ ] Cost calculation engine
- [ ] Billing dashboard
- [ ] Usage reports and exports
- [ ] Quota enforcement
- [ ] Payment integration (Stripe)
- [ ] Invoice generation

---

## 🗓️ Timeline Overview

| Phase | Duration | Start | End | Status |
|-------|----------|-------|-----|--------|
| Phase 1: SDK Foundation | 4 weeks | Week 1 | Week 4 | 🔜 Not Started |
| Phase 2: Claude Code Integration | 3 weeks | Week 5 | Week 7 | 🔜 Not Started |
| Phase 3: Performance & UX | 3 weeks | Week 8 | Week 10 | 🔜 Not Started |
| Phase 4: Advanced Features | 4 weeks | Week 11 | Week 14 | 🔜 Not Started |
| Phase 5: Enterprise & Scale | 4 weeks | Week 15 | Week 18 | 🔜 Not Started |

**Total Duration**: 18 weeks (~4.5 months)

**Target v2.0 Release**: Q2 2025

---

## 🎯 Success Metrics

### Developer Experience
- [ ] Time to first sandbox: <5 minutes
- [ ] SDK installation: 1 command
- [ ] Code execution latency: <100ms overhead
- [ ] File upload speed: >10MB/s
- [ ] Dashboard load time: <2s

### Performance
- [ ] Container startup (cold): <1s
- [ ] Container startup (pre-warmed): <200ms
- [ ] API response time (p95): <200ms
- [ ] WebSocket latency: <50ms
- [ ] Concurrent sandboxes: 1,000+

### Reliability
- [ ] Uptime: 99.9%
- [ ] API error rate: <0.1%
- [ ] Container failure rate: <1%
- [ ] Data loss incidents: 0

### Adoption
- [ ] SDK downloads: 1,000+ (first month)
- [ ] Active sandboxes: 5,000+ (first quarter)
- [ ] GitHub stars: 1,000+
- [ ] Community templates: 50+
- [ ] Enterprise customers: 5+

---

## 🚧 Breaking Changes (v1.x → v2.0)

### API Changes
- ✂️ **Authentication**: JWT + new API key system
- ✂️ **Endpoints**: New `/sandboxes` resource (vs `/environments`)
- ✂️ **WebSocket**: New message format for Claude Code events
- ✂️ **Environment Variables**: New encryption method

### Database Schema
- ✂️ **New Tables**: `ApiKey`, `Execution`, `Template`, `Webhook`
- ✂️ **Renamed**: `Environment` → `Sandbox`
- ✂️ **Modified**: `Session` table for Claude Code sessions

### Migration Guide
- [ ] Automated migration script (v1 → v2)
- [ ] Data migration guide
- [ ] API compatibility layer (temporary)
- [ ] Deprecation timeline (3 months)

---

## 🔮 Future Roadmap (Post-v2.0)

### Hosted Cloud Version (v2.1)
**Timeline**: Q3 2025

**Features**:
- Multi-tenant SaaS deployment
- Managed infrastructure
- Automatic scaling
- Global CDN
- 24/7 support
- Usage-based pricing

### AI Agent Orchestration (v2.2)
**Timeline**: Q4 2025

**Features**:
- Multi-agent workflows
- Agent-to-agent communication
- Shared sandboxes for collaboration
- Agent marketplace
- Pre-built agent templates

### Browser-Based Sandboxes (v3.0)
**Timeline**: Q1 2026

**Features**:
- Headless browser support (Playwright)
- Web scraping capabilities
- Screenshot and PDF generation
- Automated testing
- Visual regression testing

---

## 📚 Documentation Plan

### Developer Docs
- [ ] Getting Started Guide
- [ ] SDK Reference (TypeScript)
- [ ] API Reference (REST, WebSocket, GraphQL)
- [ ] Claude Code Integration Guide
- [ ] Template Creation Guide
- [ ] Best Practices
- [ ] Troubleshooting

### Enterprise Docs
- [ ] Self-Hosting Guide
- [ ] Kubernetes Deployment
- [ ] High Availability Setup
- [ ] Security Hardening
- [ ] Monitoring and Alerting
- [ ] Backup and Recovery
- [ ] Compliance (SOC 2, GDPR)

### Community
- [ ] Contribution Guide
- [ ] Code of Conduct
- [ ] Issue Templates
- [ ] PR Templates
- [ ] Changelog
- [ ] Migration Guides

---

## 🤝 Community & Support

### Open Source
- GitHub Discussions for Q&A
- Discord server for real-time chat
- Monthly community calls
- Bug bounty program

### Enterprise Support
- Dedicated Slack channel
- SLA guarantees
- Priority bug fixes
- Custom feature development
- Training and onboarding

---

## ✅ Definition of Done

Each phase is considered "done" when:

1. ✅ All tasks completed and tested
2. ✅ Code reviewed and merged
3. ✅ Documentation updated
4. ✅ Tests passing (unit, integration, e2e)
5. ✅ Performance benchmarks met
6. ✅ Security review completed
7. ✅ User acceptance testing passed
8. ✅ Release notes published

---

**Last Updated**: 2025-11-18
**Status**: 🔜 Ready to Begin
**Next Step**: Start Phase 1.1 - TypeScript SDK Development

---

**Questions or Feedback?** Open a GitHub Discussion or contact the maintainers.
