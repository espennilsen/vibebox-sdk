# Contributing to VibeBox

Thank you for your interest in contributing to VibeBox! This document provides guidelines and instructions for contributing.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)

## Code of Conduct

Please be respectful and constructive in all interactions. We're building a welcoming community for all developers.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
   ```bash
   git clone https://github.com/YOUR_USERNAME/vibebox.git
   cd vibebox
   ```
3. **Install dependencies**
   ```bash
   npm install
   ```
4. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### 1. Set Up Development Environment

- Copy `.env.example` to `.env` and configure
- Run database migrations: `cd backend && npm run migrate`
- Start development servers: `npm run dev`

### 2. Make Your Changes

- Write clean, readable code following our standards
- Add tests for new functionality
- Update documentation as needed
- Commit often with clear messages

### 3. Test Your Changes

```bash
# Lint your code
npm run lint

# Run unit tests
npm test

# Run E2E tests
npm run test:e2e --workspace=frontend
```

### 4. Submit Pull Request

- Push your branch to your fork
- Open a pull request against `main`
- Fill out the PR template completely
- Wait for Coderabbit review
- Address any feedback

## Coding Standards

### TypeScript

- Use strict TypeScript mode
- Define explicit types for function parameters and return values
- Use interfaces for object shapes
- Avoid `any` type - use `unknown` if necessary

### Code Style

- Follow existing code style (enforced by ESLint/Prettier)
- Use meaningful variable and function names
- Add TSDoc comments for public APIs
- Keep functions small and focused (single responsibility)

### File Organization

```
backend/src/
├── models/        # Database models (Prisma)
├── services/      # Business logic
├── api/
│   ├── routes/    # Route handlers
│   ├── middleware/# Middleware functions
│   └── websocket/ # WebSocket handlers
├── lib/           # Shared utilities
└── types/         # TypeScript types

frontend/src/
├── components/    # React components
├── pages/         # Page components
├── services/      # API clients
├── hooks/         # Custom React hooks
└── types/         # TypeScript types
```

## Testing Requirements

### Test-Driven Development (TDD)

VibeBox follows strict TDD principles:

1. **Write tests first** - Before implementing any feature
2. **Watch tests fail** - Ensure tests actually test something
3. **Implement code** - Make the tests pass
4. **Refactor** - Clean up while keeping tests green

### Test Coverage

- Minimum 80% code coverage for new code
- 100% coverage for critical paths (auth, payments, etc.)
- All public APIs must have tests

### Test Types

**Backend:**
- Contract tests (API schema validation)
- Integration tests (service interactions)
- Unit tests (pure functions)

**Frontend:**
- Component tests (React Testing Library)
- Integration tests (user flows)
- E2E tests (Playwright)

## Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] Commit messages are clear and descriptive
- [ ] No merge conflicts with main branch

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
```

### Review Process

1. **Automated Checks**: CI pipeline must pass
2. **Coderabbit Review**: AI review must approve
3. **Human Review**: Optional for complex changes
4. **Auto-merge**: Automatic merge on Coderabbit approval

## Issue Reporting

### Bug Reports

Include:
- Clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)
- Screenshots if applicable

### Feature Requests

Include:
- Clear use case
- Proposed solution
- Alternative solutions considered
- Additional context

### Questions

- Check FAQ and documentation first
- Search existing issues
- Provide context for your question

## Git Commit Messages

Follow conventional commits:

```
type(scope): subject

body

footer
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tooling changes

**Examples:**
```
feat(api): add environment start endpoint

Implements POST /api/v1/environments/:id/start
with Docker container lifecycle management.

Closes #123
```

```
fix(frontend): resolve terminal reconnection issue

Terminal now properly reconnects after environment
restart with exponential backoff.

Fixes #456
```

## Development Tips

### Hot Reload

Both frontend and backend support hot reload in development mode:
```bash
npm run dev  # Starts both with hot reload
```

### Database Changes

When modifying the schema:
```bash
cd backend
npm run migrate  # Create and apply migration
npm run db:generate  # Regenerate Prisma client
```

### Debugging

- Backend: Use VS Code debugger or `console.log`
- Frontend: React DevTools + browser console
- Database: Prisma Studio (`npm run db:studio`)

## Questions?

- Open a GitHub issue with the `question` label
- Check existing documentation in `.claude/`
- Review the FAQ: `.claude/faq.md`

---

Thank you for contributing to VibeBox! 🎉
