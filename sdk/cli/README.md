# @vibebox/cli

Official command-line interface for VibeBox - Quick-start tool for managing development sandboxes.

[![npm version](https://badge.fury.io/js/@vibebox%2Fcli.svg)](https://www.npmjs.com/package/@vibebox/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
# Global installation (recommended)
npm install -g @vibebox/cli

# Or use with npx
npx @vibebox/cli
```

## Quick Start

```bash
# Initialize CLI configuration
vibebox init

# Create a new sandbox
vibebox new node-20 my-sandbox

# List all sandboxes
vibebox ls

# Open interactive shell
vibebox shell my-sandbox

# Execute command
vibebox exec my-sandbox "npm install"

# View logs
vibebox logs my-sandbox -f

# Delete sandbox
vibebox rm my-sandbox
```

## Commands

### Initialization

#### `vibebox init`

Initialize VibeBox CLI configuration interactively.

```bash
vibebox init              # Interactive setup
vibebox init -y           # Use defaults
```

### Configuration

#### `vibebox config`

Manage CLI configuration.

```bash
vibebox config list                    # List all config
vibebox config get apiKey              # Get specific value
vibebox config set apiKey vb_xxx       # Set value
vibebox config delete apiKey           # Delete value
vibebox config path                    # Show config file path
vibebox config reset                   # Reset all config
```

Configuration is stored in `~/.config/vibebox/config.json`.

### Sandbox Management

#### `vibebox new <template> [name]`

Create a new sandbox.

```bash
vibebox new node-20                           # Auto-generated name
vibebox new node-20 my-app                    # With custom name
vibebox new node-20 my-app --git <url>        # Clone git repo
vibebox new node-20 my-app --ephemeral        # Ephemeral sandbox
vibebox new node-20 my-app --timeout 2h       # Auto-cleanup after 2h
```

**Options:**
- `-g, --git <url>` - Clone git repository
- `-b, --branch <branch>` - Git branch to clone
- `-e, --ephemeral` - Create ephemeral sandbox (auto-cleanup)
- `--timeout <duration>` - Auto-cleanup timeout (e.g., 30m, 2h)
- `--auto-start` - Start immediately (default: true)
- `--no-auto-start` - Don't start automatically

#### `vibebox ls`

List all sandboxes.

```bash
vibebox ls                # Running sandboxes
vibebox ls -a             # All sandboxes
vibebox ls -j             # JSON output
vibebox ls -l 100         # Limit results
```

#### `vibebox info <sandbox>`

Get sandbox information.

```bash
vibebox info my-sandbox
vibebox info my-sandbox -j     # JSON output
```

#### `vibebox sandbox start|stop|restart <sandbox>`

Control sandbox lifecycle.

```bash
vibebox sandbox start my-sandbox
vibebox sandbox stop my-sandbox
vibebox sandbox restart my-sandbox
```

#### `vibebox sandbox pause|resume <sandbox>`

Pause and resume sandboxes to save resources.

```bash
vibebox sandbox pause my-sandbox      # Pause (save state, stop billing)
vibebox sandbox resume my-sandbox     # Resume from paused state
```

#### `vibebox rm <sandbox...>`

Delete sandboxes.

```bash
vibebox rm my-sandbox                 # Delete one
vibebox rm sandbox1 sandbox2          # Delete multiple
vibebox rm my-sandbox -f              # Skip confirmation
```

### File Operations

#### `vibebox files upload <local-path> <sandbox> [remote-path]`

Upload files to sandbox.

```bash
vibebox files upload ./package.json my-sandbox
vibebox files upload ./src my-sandbox /workspace/src
vibebox files upload . my-sandbox --exclude node_modules dist

# Shortcut
vibebox push ./src my-sandbox
```

#### `vibebox files download <sandbox> <remote-path> [local-path]`

Download files from sandbox.

```bash
vibebox files download my-sandbox /workspace/dist ./dist
vibebox files download my-sandbox /workspace/output.txt

# Shortcut
vibebox pull my-sandbox dist ./local-dist
```

#### `vibebox files list <sandbox> [path]`

List files in sandbox directory.

```bash
vibebox files list my-sandbox
vibebox files list my-sandbox /workspace -l     # Long format
vibebox files list my-sandbox /workspace -a     # Show hidden
```

#### `vibebox files sync <local-path> <sandbox> [remote-path]`

Sync local directory with sandbox (watch mode).

```bash
vibebox files sync ./src my-sandbox /workspace/src
vibebox files sync ./src my-sandbox --exclude node_modules .git
```

Press Ctrl+C to stop syncing.

### Git Operations

#### `vibebox git clone <sandbox> <url>`

Clone git repository into sandbox.

```bash
vibebox git clone my-sandbox https://github.com/user/repo.git
vibebox git clone my-sandbox <url> -b develop
vibebox git clone my-sandbox <url> -p /app
vibebox git clone my-sandbox <url> --depth 1
```

#### `vibebox git pull|push <sandbox>`

Pull or push changes.

```bash
vibebox git pull my-sandbox
vibebox git push my-sandbox
vibebox git push my-sandbox -f        # Force push
```

#### `vibebox git commit <sandbox> <message>`

Commit changes.

```bash
vibebox git commit my-sandbox "feat: add new feature"
vibebox git commit my-sandbox "fix: bug" -a     # Stage all changes
```

#### `vibebox git checkout <sandbox> <branch>`

Checkout branch.

```bash
vibebox git checkout my-sandbox main
vibebox git checkout my-sandbox feature -b      # Create new branch
```

#### `vibebox git status|diff <sandbox>`

View git status and diff.

```bash
vibebox git status my-sandbox
vibebox git diff my-sandbox
vibebox git diff my-sandbox --cached            # Staged changes
```

### Code Execution

#### `vibebox exec <sandbox> <command>`

Execute command in sandbox.

```bash
vibebox exec my-sandbox "npm install"
vibebox exec my-sandbox "npm test" --cwd /repo
vibebox exec my-sandbox "node app.js" -s        # Stream output
vibebox exec my-sandbox "build.sh" -e NODE_ENV=production
```

**Options:**
- `--cwd <path>` - Working directory (default: /workspace)
- `-s, --stream` - Stream output in real-time
- `-t, --timeout <ms>` - Timeout in milliseconds (default: 120000)
- `-e, --env <key=value...>` - Environment variables

#### `vibebox run <sandbox> <script-path>`

Run local script file in sandbox.

```bash
vibebox run my-sandbox ./deploy.sh
vibebox run my-sandbox ./test.js -s           # Stream output
vibebox run my-sandbox ./script.py --cwd /app
```

### Logs

#### `vibebox logs <sandbox>`

View sandbox logs.

```bash
vibebox logs my-sandbox                  # Last 100 lines
vibebox logs my-sandbox -f               # Follow (stream)
vibebox logs my-sandbox -t 50            # Last 50 lines
vibebox logs my-sandbox --since 1h       # Last hour
vibebox logs my-sandbox --filter stderr  # Only stderr
vibebox logs my-sandbox --timestamps     # Show timestamps
```

### Interactive Shell

#### `vibebox shell <sandbox>`

Open interactive shell in sandbox.

```bash
vibebox shell my-sandbox
vibebox sh my-sandbox                    # Shortcut alias
vibebox shell my-sandbox --shell /bin/zsh
vibebox shell my-sandbox --cwd /repo
```

Type `exit` to close the shell.

### Utilities

#### `vibebox status`

Show CLI status and configuration.

```bash
vibebox status
```

#### `vibebox templates`

List available sandbox templates.

```bash
vibebox templates
```

## Environment Variables

- `VIBEBOX_API_KEY` - API key for authentication (overrides config)
- `VIBEBOX_API_URL` - API URL (overrides config)
- `DEBUG` - Enable debug output
- `VERBOSE` - Enable verbose logging

```bash
export VIBEBOX_API_KEY=vb_live_abc123
export VIBEBOX_API_URL=https://api.vibebox.dev

vibebox ls
```

## Configuration

Configuration is stored in `~/.config/vibebox/config.json`.

**Available settings:**
- `apiKey` - API key for authentication
- `apiUrl` - Base URL for VibeBox API
- `defaultTemplate` - Default sandbox template
- `defaultRegion` - Default region for cloud deployments
- `verbose` - Enable verbose logging
- `editor` - Editor to use for file editing

## Examples

### Quick Development Workflow

```bash
# Create sandbox with git repo
vibebox new node-20 my-app --git https://github.com/user/project.git

# Open shell and work
vibebox shell my-app
> npm install
> npm test
> exit

# View logs
vibebox logs my-app -f

# Sync local changes
vibebox files sync ./src my-app /repo/src

# Execute commands
vibebox exec my-app "npm run build"

# Download build artifacts
vibebox pull my-app /repo/dist ./dist

# Cleanup
vibebox rm my-app
```

### CI/CD Integration

```bash
#!/bin/bash

# Create ephemeral sandbox for testing
vibebox new node-20-claude-code ci-test-$BUILD_ID \
  --git $GIT_URL \
  --branch $BRANCH \
  --ephemeral \
  --timeout 1h

# Run tests
vibebox exec ci-test-$BUILD_ID "cd /repo && npm install"
vibebox exec ci-test-$BUILD_ID "cd /repo && npm test"

# Check exit code
if [ $? -eq 0 ]; then
  echo "Tests passed!"
else
  echo "Tests failed!"
  vibebox logs ci-test-$BUILD_ID --tail 100
  exit 1
fi

# Sandbox auto-deletes after 1h
```

### Multi-Sandbox Development

```bash
# Create multiple sandboxes
vibebox new node-20 frontend --git https://github.com/user/frontend.git
vibebox new node-20 backend --git https://github.com/user/backend.git
vibebox new python-3.11 ml-service --git https://github.com/user/ml.git

# List all
vibebox ls

# Work with each
vibebox shell frontend
vibebox shell backend
vibebox shell ml-service

# View logs from all
vibebox logs frontend -f &
vibebox logs backend -f &
vibebox logs ml-service -f &
```

## Troubleshooting

### Authentication Failed

```bash
# Check status
vibebox status

# Reconfigure
vibebox init

# Or set API key directly
vibebox config set apiKey vb_your_api_key
```

### Sandbox Not Found

```bash
# List all sandboxes
vibebox ls -a

# Check by ID instead of name
vibebox info <sandbox-id>
```

### Connection Issues

```bash
# Verify API URL
vibebox config get apiUrl

# Test with verbose logging
vibebox ls --verbose

# Or debug mode
DEBUG=* vibebox ls
```

## Related Packages

- [@vibebox/sdk](https://www.npmjs.com/package/@vibebox/sdk) - TypeScript SDK for programmatic access
- [@vibebox/claude-agent](https://www.npmjs.com/package/@vibebox/claude-agent) - Claude Code agent orchestrator

## Documentation

- [Quick Start Guide](../../.claude/quick_start.md)
- [API Reference](../../.claude/api_reference.md)
- [WebSocket Guide](../../.claude/websocket_guide.md)
- [Development Workflow](../../.claude/dev_workflow.md)

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## Support

- GitHub Issues: https://github.com/yourusername/vibebox/issues
- Documentation: https://vibebox.dev/docs
- Discord: https://discord.gg/vibebox
