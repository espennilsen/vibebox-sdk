# VibeBox Quick Start Guide

> **Task T187**: Comprehensive setup and onboarding guide

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 20.0.0 or higher
- **npm**: Version 10.0.0 or higher
- **Docker**: Latest version with Docker Compose
- **PostgreSQL**: Access to PostgreSQL
- **Git**: For version control

### System Requirements

- **OS**: Linux, macOS, or Windows with WSL2
- **RAM**: Minimum 8GB (16GB recommended)
- **Disk Space**: At least 10GB free
- **Network**: Internet connection for package installation

## 🚀 Quick Setup (5 minutes)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd vibebox
```

### 2. Install Dependencies

```bash
# Install all workspace dependencies
npm install
```

This will install dependencies for:

- Backend (Fastify API)
- Frontend (React app)
- Shared types package

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings
nano .env  # or use your preferred editor
```

**Required Environment Variables:**

```bash
# Database (configure with your credentials)
DATABASE_URL="postgresql://<DB_USER>:<DB_PASSWORD>@localhost:5432/vibebox_dev?schema=public"
DATABASE_URL_TEST="postgresql://<DB_USER>:<DB_PASSWORD>@localhost:5432/vibebox_test?schema=public"

# JWT Secrets (change these in production!)
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"

# OAuth (optional - for GitHub/Google login)
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 4. Database Setup

**Option A: Using Prisma (if network available)**

```bash
cd backend

# Generate Prisma Client
npm run db:generate

# Run migrations
npm run migrate

cd ..
```

**Option B: Manual Migration (network issues)**

```bash
# Connect to PostgreSQL
psql -h <ip> -U vibebox -d vibebox_dev

# Run the migration SQL
\i backend/prisma/migrations/20241001_initial_schema/migration.sql

# Exit psql
\q
```

### 5. Start Development Servers

**Option A: Using npm scripts (recommended)**

```bash
# Start both frontend and backend
npm run dev
```

**Option B: Using Docker Compose**

```bash
# Start all services
npm run docker:up

# View logs
docker-compose logs -f

# Stop services
npm run docker:down
```

### 6. Access the Application

Once servers are running:

- **Frontend Dashboard**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api/v1/docs
- **Health Check**: http://localhost:3000/health

## 🎯 First Steps

### Create Your First User

1. Navigate to http://localhost:5173
2. Click "Sign Up"
3. Fill in:
   - Email: your@email.com
   - Password: (min 8 characters)
   - Display Name: Your Name
4. Click "Create Account"

### Create Your First Project

1. After login, click "New Project"
2. Enter project details:
   - Name: "My First Project"
   - Slug: "my-first-project"
   - Description: (optional)
3. Click "Create Project"

### Create Your First Environment

1. From the project page, click "Create Environment"
2. Configure environment:
   - **Basic Info**:
     - Name: "Development"
     - Slug: "dev"
     - Base Image: "node:20"
   - **Resources**:
     - CPU: 2 cores
     - Memory: 4096 MB
     - Storage: 20480 MB
   - **Ports** (optional):
     - Container Port: 3000
     - Host Port: 3000
     - Protocol: TCP
   - **Environment Variables** (optional):
     - Key: NODE_ENV
     - Value: development
   - **Extensions** (optional):
     - Search and select VS Code extensions
3. Click "Create Environment"

### Start Your Environment

1. Click "Start" on the environment card
2. Watch status change: stopped → starting → running
3. View real-time logs in the Logs tab
4. Open terminal in the Terminal tab

## 📚 Development Workflow

### Running Tests

```bash
# Run all tests
npm test

# Run backend tests only
npm run test --workspace=backend

# Run frontend tests only
npm run test --workspace=frontend

# Run tests in watch mode
npm run test:watch --workspace=backend

# Run E2E tests
npm run test:e2e --workspace=frontend
```

### Code Quality

```bash
# Lint all code
npm run lint

# Fix linting issues
npm run lint:fix --workspaces

# Format code
npm run format --workspaces
```

### Database Management

```bash
cd backend

# View database in browser (Prisma Studio)
npm run db:studio

# Create a new migration
npm run migrate

# Reset database (⚠️ destructive!)
npm run db:push
```

### Docker Commands

```bash
# Start services
npm run docker:up

# Stop services
npm run docker:down

# Reset everything (⚠️ deletes all data!)
npm run docker:reset

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

## 🔧 Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

```bash
# Find and kill process on port 3000 (backend)
lsof -ti:3000 | xargs kill -9

# Find and kill process on port 5173 (frontend)
lsof -ti:5173 | xargs kill -9
```

### Database Connection Failed

1. Verify PostgreSQL is running:

   ```bash
   # Check if container is running
   docker ps | grep vibebox-postgres

   # Or test connection
   psql -h localhost -U vibebox -d vibebox_dev -c "SELECT 1"
   ```

2. Check DATABASE_URL in .env file
3. Ensure PostgreSQL container is running: `docker-compose up postgres -d`

### Prisma Client Not Generated

If you see "Cannot find module '@prisma/client'":

```bash
cd backend
npm run db:generate
cd ..
```

### Frontend Build Errors

Clear cache and reinstall:

```bash
cd frontend
rm -rf node_modules dist .vite
npm install
npm run dev
cd ..
```

### Docker Issues

```bash
# Remove all containers and volumes
docker-compose down -v

# Rebuild images
docker-compose build --no-cache

# Restart
docker-compose up -d
```

## 🎓 Next Steps

Now that you're set up, explore:

1. **[API Reference](./.claude/api_reference.md)** - Learn the API endpoints
2. **[Architecture](./.claude/specs.md)** - Understand the system design
3. **[Development Workflow](./.claude/dev_workflow.md)** - PR process and CI/CD
4. **[tmux Guide](./.claude/tmux.md)** - Advanced session management
5. **[FAQ](./.claude/faq.md)** - Common questions

## 💡 Tips & Best Practices

### Environment Management

- **Keep environments stopped** when not in use to save resources
- **Use descriptive names** for projects and environments
- **Tag environments** with metadata in descriptions
- **Monitor resource usage** in the dashboard

### Team Collaboration

- **Create teams** for shared projects
- **Assign roles** appropriately (admin, developer, viewer)
- **Use team-owned projects** for collaboration
- **Share environment access** via teams

### Security

- **Never commit .env files** to version control
- **Rotate JWT secrets** regularly in production
- **Use SSH keys** for secure environment access
- **Enable OAuth** for easier authentication

### Performance

- **Limit concurrent environments** to 10 per user
- **Clean up old logs** regularly
- **Archive unused projects** to reduce clutter
- **Monitor Docker resource usage**

## 📞 Getting Help

- **Issues**: Open a GitHub issue
- **Discussions**: Start a GitHub discussion
- **FAQ**: Check [FAQ](./.claude/faq.md)
- **Documentation**: Browse `.claude/` directory

---

**Ready to build?** Start creating environments and happy coding! 🚀
