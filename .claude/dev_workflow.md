# VibeBox Development Workflow

> **Task T190**: PR/CI process and Coderabbit integration documentation

## 📋 Overview

VibeBox follows a structured development workflow with automated code review, continuous integration, and auto-merge capabilities. This document outlines the complete process from feature development to production deployment.

## 🔄 Development Workflow Overview

```
Feature Request → Branch → Develop → Test → PR → Coderabbit Review → Auto-Merge → Deploy
```

## 🌳 Branch Strategy

### Main Branches

- **`main`**: Production-ready code
- **`develop`**: Integration branch for features
- **`001-develop-vibecode-a`**: Current development branch

### Feature Branches

**Naming Convention**:
```
<type>/<short-description>

Examples:
feature/user-authentication
fix/environment-startup-error
docs/api-reference-update
refactor/docker-service-cleanup
```

**Branch Types**:
- `feature/`: New features
- `fix/`: Bug fixes
- `docs/`: Documentation changes
- `refactor/`: Code refactoring
- `test/`: Test additions/updates
- `chore/`: Build/tooling changes

### Creating a Feature Branch

```bash
# Update main branch
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/my-new-feature

# Push to remote
git push -u origin feature/my-new-feature
```

## 💻 Development Process

### 1. Setup Development Environment

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
cd backend && npm run migrate && cd ..

# Start development servers
npm run dev
```

### 2. Test-Driven Development (TDD)

**VibeBox follows strict TDD principles**:

1. **Write the test first** (it should fail)
2. **Implement the feature** (make the test pass)
3. **Refactor** (improve code while tests pass)

**Example Flow**:

```bash
# 1. Write contract test
# Edit: backend/tests/contract/environments-post.test.ts

# 2. Run test (it should fail)
npm run test --workspace=backend

# 3. Implement feature
# Edit: backend/src/api/routes/environments.route.ts

# 4. Run test (it should pass)
npm run test --workspace=backend

# 5. Refactor and commit
git add .
git commit -m "feat(api): add environment creation endpoint"
```

### 3. Code Quality Checks

Before committing, ensure code quality:

```bash
# Lint code
npm run lint --workspaces

# Fix linting issues
npm run lint:fix --workspaces

# Format code
npm run format --workspaces

# Run all tests
npm test
```

### 4. Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tooling changes
- `perf`: Performance improvements

**Examples**:

```bash
# Feature
git commit -m "feat(api): add environment start endpoint"

# Bug fix
git commit -m "fix(frontend): resolve terminal reconnection issue"

# Documentation
git commit -m "docs(api): update authentication section"

# Multiple paragraphs
git commit -m "feat(docker): implement container lifecycle management

- Add DockerService with create, start, stop methods
- Integrate dockerode for Docker API communication
- Handle container state transitions with proper error handling

Closes #123"
```

## 🔀 Pull Request Process

### 1. Creating a Pull Request

```bash
# Ensure your branch is up to date
git checkout feature/my-new-feature
git fetch origin
git rebase origin/main

# Push changes
git push origin feature/my-new-feature

# Create PR on GitHub
```

**PR Title Format**:
```
<type>(<scope>): <description>

Example: feat(api): add environment management endpoints
```

### 2. Pull Request Template

When creating a PR, include:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changes Made
- List of specific changes
- Another change
- And another

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
[Add screenshots for UI changes]

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests pass locally

## Related Issues
Closes #123
Relates to #456
```

### 3. Automated Checks

When you create a PR, CI automatically runs:

1. **Linting** (ESLint + Prettier)
2. **Type Checking** (TypeScript)
3. **Unit Tests** (Vitest)
4. **Integration Tests** (Vitest)
5. **Build** (TypeScript compilation)

**CI Configuration**: `.github/workflows/ci.yml`

```yaml
# Example CI steps
- Lint backend and frontend
- Run backend tests with PostgreSQL
- Run frontend tests
- Build all workspaces
```

### 4. Coderabbit Review

**Coderabbit** is our AI code reviewer that:

- Analyzes code changes
- Checks for bugs and security issues
- Ensures best practices
- Validates test coverage
- Reviews documentation

**Review Process**:

1. PR created → Coderabbit automatically triggered
2. Coderabbit analyzes all changes
3. Coderabbit posts review comments
4. Developer addresses feedback
5. Coderabbit re-reviews
6. Coderabbit approves when ready

**Approval Required**: PRs cannot be merged without Coderabbit approval.

### 5. Auto-Merge

Once Coderabbit approves:

1. PR automatically merges to target branch
2. Deployment pipeline triggered (if configured)
3. Branch automatically deleted

**Auto-Merge Conditions**:
- ✅ All CI checks pass
- ✅ Coderabbit approval received
- ✅ No merge conflicts
- ✅ Branch is up to date

## 🧪 Testing Requirements

### Test Coverage

**Minimum Coverage**: 80% for new code

**Critical Paths** (100% coverage required):
- Authentication/authorization
- Docker container management
- WebSocket connections
- Database operations

### Test Hierarchy

```
E2E Tests (Playwright)
    ↓
Integration Tests (Vitest)
    ↓
Contract Tests (Vitest + Supertest)
    ↓
Unit Tests (Vitest)
```

### Running Tests

```bash
# All tests
npm test

# Backend tests only
npm run test --workspace=backend

# Frontend tests only
npm run test --workspace=frontend

# Watch mode
npm run test:watch --workspace=backend

# Coverage report
npm run test:coverage --workspace=backend

# E2E tests
npm run test:e2e --workspace=frontend

# Single test file
npm run test backend/tests/contract/auth.test.ts
```

### Writing Tests

**Contract Test Example**:

```typescript
// backend/tests/contract/auth-register.test.ts
import { describe, it, expect } from 'vitest';
import { build } from '../helpers/app';

describe('POST /auth/register', () => {
  it('should register a new user', async () => {
    const app = await build();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        displayName: 'Test User',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toHaveProperty('accessToken');
    expect(response.json()).toHaveProperty('user');
    expect(response.json().user.email).toBe('test@example.com');

    await app.close();
  });
});
```

## 🚀 Deployment

### Environments

- **Development**: Local development environment
- **Staging**: Pre-production testing (optional)
- **Production**: Live environment

### Deployment Process

**Automatic Deployment** (on merge to main):

```
Merge to main
    ↓
CI runs tests
    ↓
Build Docker images
    ↓
Push to registry
    ↓
Deploy to production
    ↓
Health checks
    ↓
Rollback if failed
```

### Manual Deployment

```bash
# Build production images
npm run build

# Deploy with Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Check deployment
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs
```

### Rollback

If deployment fails:

```bash
# Rollback to previous version
git revert <commit-hash>
git push origin main

# Or manual rollback
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --force-recreate
```

## 🐛 Bug Fix Workflow

### 1. Identify Bug

- Create GitHub issue with bug template
- Add labels: `bug`, `priority:high/medium/low`
- Assign to team member

### 2. Create Fix Branch

```bash
git checkout main
git pull origin main
git checkout -b fix/bug-description
```

### 3. Write Failing Test

```typescript
// Test that reproduces the bug
it('should not crash when environment has no ports', async () => {
  // Test that currently fails
});
```

### 4. Fix the Bug

Implement fix to make the test pass.

### 5. Submit PR

```bash
git add .
git commit -m "fix(api): prevent crash when environment has no ports

Previously, environments without port mappings would cause
a null pointer exception. This fix adds proper null checking
and returns an empty array instead.

Fixes #123"

git push origin fix/bug-description
```

## 📊 Code Review Guidelines

### For Reviewers (Coderabbit + Humans)

**Check for**:
- [ ] Code follows style guide
- [ ] Tests cover new functionality
- [ ] No security vulnerabilities
- [ ] Performance implications considered
- [ ] Documentation updated
- [ ] Backward compatibility maintained
- [ ] Error handling is robust
- [ ] Logging is appropriate

**Review Comments**:
- Be constructive and respectful
- Provide specific suggestions
- Explain the "why" behind feedback
- Approve when ready (don't nitpick)

### For Authors

**Before Requesting Review**:
- [ ] Self-review completed
- [ ] All tests pass locally
- [ ] Code is formatted
- [ ] Commit messages are clear
- [ ] PR description is complete

**Addressing Feedback**:
- Respond to all comments
- Make requested changes
- Push updates
- Re-request review
- Resolve conversations when addressed

## 🔐 Security Workflow

### Security Issues

**DO NOT** create public GitHub issues for security vulnerabilities.

**Instead**:
1. Email: security@vibecode.dev
2. Include: Description, steps to reproduce, impact
3. Wait for response before public disclosure

### Security Checks

CI automatically runs:
- Dependency vulnerability scanning
- Static code analysis
- Secret detection

## 📈 Performance Monitoring

### Performance Requirements

From specifications:
- API response times: <1s
- Environment startup: <2s
- Dashboard load: <2s
- Log streaming latency: <100ms

### Performance Tests

```bash
# Run performance tests
npm run test:performance --workspace=backend
```

## 🎓 Best Practices

### Code Style

- Use TypeScript strict mode
- Add TSDoc comments for public APIs
- Keep functions small and focused
- Use meaningful variable names
- Avoid code duplication

### Git Practices

- Commit often, push regularly
- Write clear commit messages
- Keep commits focused (one change per commit)
- Rebase before merging to keep history clean
- Never force push to `main` or `develop`

### Testing Practices

- Write tests first (TDD)
- Test edge cases
- Use meaningful test descriptions
- Mock external dependencies
- Clean up after tests

## 📞 Getting Help

- **Questions**: Open a GitHub discussion
- **Bugs**: Create a GitHub issue
- **Features**: Create a feature request issue
- **Documentation**: Check `.claude/` directory
- **Chat**: Team Slack channel (if available)

---

## 🔗 Related Documentation

- **[Quick Start Guide](./quick_start.md)** - Setup instructions
- **[API Reference](./api_reference.md)** - API documentation
- **[Spec Kit Contracts](./specs.md)** - Data models
- **[Contributing Guide](../CONTRIBUTING.md)** - Contribution guidelines

---

**Happy Coding!** 🚀

Remember: Quality > Speed. Write tests, review carefully, and ship with confidence.
