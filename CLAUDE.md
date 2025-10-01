# VibeBox - Development Environment Management Tool

> 🎯 **Vibe Coded** with [Claude Code](https://claude.com/claude-code) and [Spec Kit](https://github.com/anthropics/spec-kit)

**VibeBox** is a production-ready developer dashboard for managing Docker-based development environments with real-time collaboration, VS Code integration, and comprehensive tooling.

---

## 📚 Documentation

Complete documentation is available in the `.claude/` directory:

### Getting Started
- **[Quick Start Guide](./.claude/quick_start.md)** - Setup and onboarding (⭐ Start here)
  - Prerequisites and system requirements
  - Installation steps
  - First environment creation
  - Troubleshooting common issues

### Architecture & Design
- **[Spec Kit Contracts](./.claude/specs.md)** - Data models and architecture
  - Entity relationship diagrams
  - Data model definitions (10 core entities)
  - API contract overview
  - Security model
  - Performance requirements

### API Documentation
- **[API Reference](./.claude/api_reference.md)** - Complete API documentation
  - Authentication endpoints
  - REST API endpoints (40+ endpoints)
  - WebSocket API (real-time streaming)
  - Request/response examples
  - Error handling

### Development & Deployment
- **[Development Workflow](./.claude/dev_workflow.md)** - PR process and CI/CD
  - Branch strategy and Git workflow
  - Test-Driven Development (TDD) guidelines
  - Pull request process
  - Coderabbit AI review integration
  - Auto-merge workflow
  - Deployment process

- **[Secrets Management](./.claude/secrets_management.md)** - Production secrets management
  - Multi-provider support (AWS, GCP, Azure, Vault, K8s)
  - Secret rotation and migration
  - Configuration with secret references
  - Zero-downtime rotation strategies
  - Best practices and troubleshooting

- **[Kubernetes Deployment](./.claude/kubernetes.md)** - Production deployment guide
  - Prerequisites and cluster requirements
  - Installation methods (Helm, kubectl, scripts)
  - Configuration and secrets management
  - Scaling strategies (horizontal and vertical)
  - Backup and restore procedures
  - Security hardening
  - Monitoring and observability
  - Troubleshooting and disaster recovery

### Features & Guides
- **[tmux Guide](./.claude/tmux.md)** - Session management
  - tmux basics and key bindings
  - Multi-pane workflows
  - Session persistence and sharing
  - Pair programming setup

- **[Extensions Guide](./.claude/extensions.md)** - VS Code extension management
  - Installing and managing extensions
  - Popular extensions by language
  - Custom extension registry
  - Troubleshooting

- **[Logs Guide](./.claude/logs.md)** - Log management
  - Real-time log streaming
  - Historical log access
  - Retention policies (7-day, 20MB)
  - Filtering and export

- **[Security Guide](./.claude/security.md)** - Security best practices
  - Secrets management
  - Production security checklist
  - Database architecture
  - Encryption at rest
  - Incident response

### Help & Resources
- **[FAQ](./.claude/faq.md)** - Frequently asked questions
  - General questions
  - Technical details
  - Troubleshooting guide
  - Security questions

- **[License](./.claude/license.md)** - MIT License and attributions
  - Commercial use guidelines
  - Third-party licenses
  - Compliance information

---

## 🏗️ Project Structure

```
vibebox/
├── backend/          # Fastify API server (Node.js + TypeScript)
├── frontend/         # React dashboard (React + TypeScript + Material-UI)
├── shared/types/     # Shared TypeScript types
├── docs/            # Generated API documentation
├── specs/           # Spec Kit design artifacts
└── .claude/         # Comprehensive documentation
```

---

## Active Technologies

- **Backend**: Node.js 20+, TypeScript 5.x, Fastify, Prisma, dockerode
- **Frontend**: React 18+, TypeScript 5.x, Material-UI, Vite, xterm.js
- **Database**: PostgreSQL 16
- **Testing**: Vitest (unit/integration), Playwright (E2E)
- **Infrastructure**: Docker, Docker Compose

---

## 🚀 Quick Commands

```bash
# Development
npm run dev              # Start all services
npm test                # Run all tests
npm run lint             # Lint all code

# Docker
npm run docker:up        # Start Docker services
npm run docker:down      # Stop Docker services
npm run docker:reset     # Reset database

# Database
cd backend
npm run migrate          # Run migrations
npm run db:studio        # Open Prisma Studio
```

---

## Code Style

- **TypeScript**: Strict mode, explicit types, TSDoc comments for public APIs
- **Testing**: TDD approach - tests before implementation
- **Commits**: Conventional commits (feat, fix, docs, etc.)
- **Formatting**: ESLint + Prettier (auto-format on save)

---

## Recent Changes

- **2025-10-01**: Production secrets management implementation
  - Multi-provider secret manager (AWS, GCP, Azure, Vault, K8s)
  - Automatic provider detection and failover
  - Secret rotation scripts with zero-downtime support
  - Configuration enhancement with secret reference resolution
  - Kubernetes External Secrets Operator integration
  - Migration tools from .env to secret managers
  - Comprehensive secrets management documentation
  - Unit tests for all secret manager components

- **2025-10-01**: Security hardening and database configuration
  - Removed all hardcoded credentials from codebase
  - Enabled local PostgreSQL container in docker-compose
  - Converted all configs to use environment variables
  - Added comprehensive Security Guide (.claude/security.md)
  - Updated all documentation with secure defaults

- **2025-10-01**: Initial project setup and documentation
  - Monorepo structure with backend/frontend/shared
  - PostgreSQL schema with 10 core entities
  - Complete test infrastructure (Vitest + Playwright)
  - Comprehensive documentation suite
  - CI/CD pipeline with Coderabbit integration

- **001-develop-vibecode-a**: Added Node.js 20+ with TypeScript 5.x (backend), React 18+ with TypeScript 5.x (frontend) + Fastify (backend API), dockerode (Docker API), React, xterm.js (terminal), WebSocket (log streaming), Passport.js (OAuth), PostgreSQL driver

---

## 📖 Additional Resources

- **[README](./README.md)** - Project overview and quick start
- **[CONTRIBUTING](./CONTRIBUTING.md)** - Contribution guidelines
- **[LICENSE](./LICENSE)** - MIT License

---

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->

---

## 💡 Important Reminders

- Do what has been asked; nothing more, nothing less
- ALWAYS prefer editing an existing file to creating a new one
- Follow TDD principles: tests first, then implementation
- Add TSDoc comments to all public functions and classes
- **NEVER commit secrets** - use environment variables (see .claude/security.md)
