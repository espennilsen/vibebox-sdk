# VibeBox - Dev Environment Management Tool

> 🎯 **Vibe Coded** with [Claude Code](https://claude.com/claude-code) and [Spec Kit](https://github.com/anthropics/spec-kit)

VibeBox is a production-ready developer dashboard that enables teams to create, manage, and collaborate on Docker-based development environments through a unified interface. Built with modern TypeScript, React, and Fastify.

## ✨ Features

- 🐳 **Docker-based Environments**: Create and manage isolated development containers
- 🔄 **Real-time Updates**: WebSocket-powered live status and log streaming
- 👥 **Team Collaboration**: Multi-user environments with role-based access control
- 🛠️ **VS Code Integration**: Manage extensions and embedded terminal access
- 📊 **Resource Management**: Configurable CPU, memory, and storage limits
- 🔐 **Secure Authentication**: Email/password + OAuth (GitHub/Google)
- 📝 **Session Management**: tmux and VS Code Server support
- 📈 **Log Management**: 7-day rolling retention with real-time streaming

## 🏗️ Architecture

VibeBox follows a monorepo structure with strict separation of concerns:

```
vibebox/
├── backend/          # Fastify API server
├── frontend/         # React + Material-UI dashboard
├── shared/types/     # Shared TypeScript types
├── docs/             # API documentation
└── specs/            # Spec Kit design artifacts
```

**Tech Stack:**
- **Backend**: Node.js 20+, TypeScript 5.x, Fastify, Prisma, dockerode
- **Frontend**: React 18+, TypeScript 5.x, Material-UI, xterm.js
- **Database**: PostgreSQL 16
- **Testing**: Vitest (unit/integration), Playwright (E2E)
- **Infrastructure**: Docker, Docker Compose

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ and npm 10+
- Docker and Docker Compose
- PostgreSQL 16 (or use provided Docker setup)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd vibebox
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up database**
   ```bash
   # Start PostgreSQL
   docker-compose up postgres -d

   # Apply migration
   export POSTGRES_PASSWORD=vibebox_dev_pass  # or your password
   ./scripts/setup-db.sh

   # Generate Prisma Client
   cd backend
   npm run db:generate
   cd ..

   # Verify (optional)
   ./scripts/verify-migration.sh
   ```

   📋 **Detailed instructions**: See [DEPLOYMENT_CHECKLIST.md](./docs/DEPLOYMENT_CHECKLIST.md)

5. **Start development servers**

   Option A: Using Docker Compose (recommended)
   ```bash
   npm run docker:up
   ```

   Option B: Local development
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - API Docs: http://localhost:3000/api/v1/docs

## 📖 Documentation

Comprehensive documentation is available in the `.claude/` directory:

- [**Quick Start Guide**](./.claude/quick_start.md) - Detailed setup instructions
- [**API Reference**](./.claude/api_reference.md) - Complete API documentation
- [**Spec Kit Contracts**](./.claude/specs.md) - Data models and contracts
- [**Development Workflow**](./.claude/dev_workflow.md) - PR process and CI/CD
- [**tmux Guide**](./.claude/tmux.md) - Session management tips
- [**Extensions Guide**](./.claude/extensions.md) - VS Code extension management
- [**Logs Guide**](./.claude/logs.md) - Log retention and filtering
- [**FAQ**](./.claude/faq.md) - Common questions and troubleshooting

## 🧪 Testing

```bash
# Run all tests
npm test

# Run backend tests
npm run test --workspace=backend

# Run frontend tests
npm run test --workspace=frontend

# Run E2E tests
npm run test:e2e --workspace=frontend

# Watch mode
npm run test:watch --workspace=backend
```

## 🛠️ Development

### Project Scripts

```bash
npm run dev              # Start all services in development mode
npm run build            # Build all workspaces
npm run lint             # Lint all workspaces
npm run docker:up        # Start Docker Compose services
npm run docker:down      # Stop Docker Compose services
npm run docker:reset     # Reset database and restart services
```

### Database Migrations

```bash
cd backend
npm run migrate          # Run migrations
npm run db:studio        # Open Prisma Studio
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for details.

### Development Workflow

1. Create a feature branch from `main`
2. Make your changes following our code style
3. Write tests for new functionality
4. Submit a pull request
5. Wait for Coderabbit review approval
6. Auto-merge on approval

See [Development Workflow](./.claude/dev_workflow.md) for detailed process.

## 📦 Deployment

VibeBox can be deployed using Docker Compose or Kubernetes. See the deployment guide for platform-specific instructions.

```bash
# Production build
npm run build

# Start production services
docker-compose -f docker-compose.prod.yml up -d
```

## 🔒 Security

- All API endpoints require authentication
- JWT tokens with short expiry + refresh tokens
- Row-level security in PostgreSQL
- Encrypted environment variables
- Docker container isolation

Report security vulnerabilities to: security@vibebox.dev

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details

## 🙏 Acknowledgments

- Built with [Claude Code](https://claude.com/claude-code)
- Design artifacts generated with [Spec Kit](https://github.com/anthropics/spec-kit)
- Powered by [Fastify](https://fastify.io/), [React](https://react.dev/), and [Prisma](https://www.prisma.io/)

---

**Status**: 🚧 Active Development

For questions or support, please open an issue on GitHub.
