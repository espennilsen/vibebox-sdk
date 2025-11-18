# Changelog

All notable changes to the VibeBox SDK and CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-11-18

### Added

#### CLI Package (@vibebox/cli)
- **NEW**: Complete command-line interface for VibeBox sandbox management
- **Initialization**: Interactive setup wizard with `vibebox init`
- **Configuration Management**: Full config system with get/set/list/delete/reset commands
- **Sandbox Management**:
  - Create sandboxes with `vibebox new` including git integration
  - List, info, start, stop, restart, pause, resume, delete commands
  - Support for ephemeral sandboxes with auto-cleanup
- **File Operations**:
  - Upload files/directories with `vibebox push`
  - Download files with `vibebox pull`
  - Real-time directory synchronization with `vibebox files sync --watch`
  - List and delete files in sandboxes
- **Git Integration**:
  - Clone repositories into sandboxes
  - Full git workflow support (pull, push, commit, checkout, status, diff)
  - Branch management
- **Code Execution**:
  - Execute commands with `vibebox exec`
  - Run local scripts with `vibebox run`
  - Streaming output support
  - Custom working directory and environment variables
- **Log Management**:
  - View sandbox logs with filtering
  - Real-time log streaming with `--follow`
  - Time-based filtering
- **Interactive Shell**: Direct shell access with `vibebox shell`
- **Utilities**: Status command, templates listing, update notifications

#### SDK Enhancements
- Improved build system with separate SDK and CLI builds
- Added CLI integration scripts
- Enhanced documentation

### Changed
- SDK package structure now includes CLI as sub-package
- Build scripts updated to support both SDK and CLI

### Documentation
- Comprehensive CLI README with examples and usage guides
- CLI implementation summary document
- Updated SDK documentation to include CLI references

## [1.0.0] - 2025-10-01

### Added
- Initial SDK release
- Core client for VibeBox API
- Sandbox resource management
- Git integration API
- Execution API
- API key management
- Error handling and retry utilities
- TypeScript types and interfaces
- WebSocket support
- Examples and documentation

[1.1.0]: https://github.com/espennilsen/vibebox-sdk/compare/sdk-v1.0.0...sdk-v1.1.0
[1.0.0]: https://github.com/espennilsen/vibebox-sdk/releases/tag/sdk-v1.0.0
