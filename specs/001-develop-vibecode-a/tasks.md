# Tasks: VibeCode - Dev Environment Management Tool

**Input**: Design documents from `/workspace/specs/001-develop-vibecode-a/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/openapi.yaml, contracts/websocket-spec.md, quickstart.md

---

## Execution Flow

This task list follows strict TDD (Test-Driven Development) principles:
1. **Setup infrastructure** → Database, testing frameworks, Docker config
2. **Write tests first** → Contract tests, integration tests (MUST FAIL)
3. **Implement code** → Make tests pass
4. **Refactor and polish** → Documentation, cleanup, optimization

**Parallel Execution**: Tasks marked with **[P]** can be executed in parallel as they operate on different files with no dependencies.

---

## Phase 3.1: Project Setup & Infrastructure (T001-T015)

### T001: Initialize monorepo structure
**Type**: setup | **Depends On**: none | **Parallel**: no

**Description**: Create the monorepo directory structure with backend, frontend, and shared directories as defined in plan.md.

**Acceptance Criteria**:
- [ ] Directory structure created: `backend/`, `frontend/`, `shared/`, `docs/`
- [ ] Each directory has appropriate subdirectories (src/, tests/, etc.)
- [ ] Root-level configuration files ready (package.json, tsconfig.json)

**Files to Create**:
- `backend/src/`, `backend/tests/contract/`, `backend/tests/integration/`, `backend/tests/unit/`
- `frontend/src/`, `frontend/tests/unit/`, `frontend/tests/e2e/`
- `shared/types/`
- `docs/api/`
- `.claude/` (for documentation)

---

### T002: [P] Initialize backend Node.js/TypeScript project
**Type**: setup | **Depends On**: T001 | **Parallel**: yes

**Description**: Initialize backend package.json with Fastify, dockerode, PostgreSQL driver, Passport.js, and TypeScript dependencies.

**Acceptance Criteria**:
- [ ] `backend/package.json` created with all required dependencies
- [ ] TypeScript configuration (`tsconfig.json`) set up
- [ ] Scripts defined: `dev`, `build`, `test`, `lint`
- [ ] Fastify, dockerode, pg, passport, @fastify/websocket installed

**Files to Create/Modify**:
- `backend/package.json`
- `backend/tsconfig.json`
- `backend/.eslintrc.js`
- `backend/.prettierrc`

---

### T003: [P] Initialize frontend React/TypeScript project
**Type**: setup | **Depends On**: T001 | **Parallel**: yes

**Description**: Initialize frontend package.json with React 18, TypeScript, Material UI, xterm.js, and testing libraries.

**Acceptance Criteria**:
- [ ] `frontend/package.json` created with all required dependencies
- [ ] Vite configuration for React + TypeScript
- [ ] Scripts defined: `dev`, `build`, `test`, `lint`
- [ ] React, Material-UI, xterm.js, React Testing Library installed

**Files to Create/Modify**:
- `frontend/package.json`
- `frontend/tsconfig.json`
- `frontend/vite.config.ts`
- `frontend/.eslintrc.js`

---

### T004: Set up PostgreSQL database schema
**Type**: setup | **Depends On**: T002 | **Parallel**: no

**Description**: Create PostgreSQL database schema with migration tool (Prisma or TypeORM) based on data-model.md entities.

**Acceptance Criteria**:
- [ ] Migration tool configured (Prisma recommended)
- [ ] Initial migration created for all 10 entities
- [ ] Database indexes defined from data-model.md
- [ ] Migration can be applied via `npm run migrate`

**Files to Create**:
- `backend/prisma/schema.prisma` OR `backend/src/migrations/`
- `backend/src/lib/db.ts` (database client)

---

### T005: Set up Docker Compose for local development
**Type**: setup | **Depends On**: T004 | **Parallel**: no

**Description**: Create docker-compose.yml for PostgreSQL, backend, and frontend development environment.

**Acceptance Criteria**:
- [ ] docker-compose.yml defines: postgres, backend, frontend services
- [ ] Environment variables configured via .env files
- [ ] Docker volumes for PostgreSQL persistence
- [ ] Health checks for services

**Files to Create**:
- `docker-compose.yml`
- `.env.example`
- `backend/Dockerfile.dev`
- `frontend/Dockerfile.dev`

---

### T006: [P] Configure Jest for backend testing
**Type**: setup | **Depends On**: T002 | **Parallel**: yes

**Description**: Set up Jest and Supertest for backend contract and integration tests.

**Acceptance Criteria**:
- [ ] Jest configuration for TypeScript
- [ ] Supertest installed for API testing
- [ ] Test script runs: `npm test`
- [ ] Coverage reporting configured

**Files to Create**:
- `backend/jest.config.js`
- `backend/tests/setup.ts`

---

### T007: [P] Configure Jest and React Testing Library for frontend
**Type**: setup | **Depends On**: T003 | **Parallel**: yes

**Description**: Set up Jest, React Testing Library, and @testing-library/user-event for frontend unit tests.

**Acceptance Criteria**:
- [ ] Jest configured for React + TypeScript
- [ ] React Testing Library and user-event installed
- [ ] Test script runs: `npm test`
- [ ] Coverage reporting configured

**Files to Create**:
- `frontend/jest.config.js`
- `frontend/tests/setup.ts`

---

### T008: Configure Playwright for E2E testing
**Type**: setup | **Depends On**: T003 | **Parallel**: no

**Description**: Set up Playwright for end-to-end testing based on quickstart.md scenarios.

**Acceptance Criteria**:
- [ ] Playwright installed and configured
- [ ] Test script: `npm run test:e2e`
- [ ] Browser configurations (Chrome, Firefox)
- [ ] Screenshot on failure enabled

**Files to Create**:
- `frontend/playwright.config.ts`
- `frontend/tests/e2e/.gitkeep`

---

### T009: [P] Set up linting and formatting tools
**Type**: setup | **Depends On**: T002, T003 | **Parallel**: yes

**Description**: Configure ESLint and Prettier for both backend and frontend with consistent rules.

**Acceptance Criteria**:
- [ ] ESLint configured with TypeScript parser
- [ ] Prettier configured
- [ ] Lint scripts: `npm run lint`, `npm run format`
- [ ] Pre-commit hooks with husky (optional)

**Files to Create/Modify**:
- `backend/.eslintrc.js`, `backend/.prettierrc`
- `frontend/.eslintrc.js`, `frontend/.prettierrc`
- `.husky/pre-commit` (optional)

---

### T010: Create shared TypeScript types package
**Type**: setup | **Depends On**: T001 | **Parallel**: no

**Description**: Create shared types package for common types between frontend and backend based on OpenAPI schemas.

**Acceptance Criteria**:
- [ ] `shared/types/package.json` created
- [ ] Types exported: User, Team, Project, Environment, Session, Extension, etc.
- [ ] Build script generates `.d.ts` files
- [ ] Both backend and frontend can import shared types

**Files to Create**:
- `shared/types/package.json`
- `shared/types/tsconfig.json`
- `shared/types/src/index.ts`
- `shared/types/src/models.ts`

---

### T011: Set up backend logging infrastructure
**Type**: setup | **Depends On**: T002 | **Parallel**: no

**Description**: Configure structured logging with pino (recommended for Fastify) for backend services.

**Acceptance Criteria**:
- [ ] Pino logger configured
- [ ] Log levels: debug, info, warn, error
- [ ] Request logging middleware
- [ ] Log rotation configured (optional)

**Files to Create**:
- `backend/src/lib/logger.ts`
- `backend/src/lib/logger.config.ts`

---

### T012: Set up backend configuration management
**Type**: setup | **Depends On**: T002 | **Parallel**: no

**Description**: Create configuration module for environment variables and app settings.

**Acceptance Criteria**:
- [ ] Configuration module with type-safe env variables
- [ ] Validation for required env vars
- [ ] Defaults for optional settings
- [ ] Export config object for use across app

**Files to Create**:
- `backend/src/lib/config.ts`
- `backend/src/lib/validate-env.ts`

---

### T013: Create Docker helper scripts
**Type**: setup | **Depends On**: T005 | **Parallel**: no

**Description**: Create helper scripts for common Docker operations during development.

**Acceptance Criteria**:
- [ ] Script to start all services: `npm run docker:up`
- [ ] Script to stop services: `npm run docker:down`
- [ ] Script to reset database: `npm run docker:reset`
- [ ] Scripts added to root package.json

**Files to Create**:
- `scripts/docker-up.sh`
- `scripts/docker-down.sh`
- `scripts/docker-reset.sh`
- `package.json` (root)

---

### T014: [P] Set up CI/CD pipeline basics
**Type**: setup | **Depends On**: T006, T007 | **Parallel**: yes

**Description**: Create GitHub Actions workflow for automated testing and linting.

**Acceptance Criteria**:
- [ ] GitHub Actions workflow file created
- [ ] Runs on: push to main, pull requests
- [ ] Steps: lint, test backend, test frontend
- [ ] Parallel job execution

**Files to Create**:
- `.github/workflows/ci.yml`

---

### T015: Create development environment documentation
**Type**: setup | **Depends On**: T001-T014 | **Parallel**: no

**Description**: Create setup instructions for developers to get the project running locally.

**Acceptance Criteria**:
- [ ] README with setup steps
- [ ] Prerequisites listed (Node.js, Docker, PostgreSQL)
- [ ] Quick start commands
- [ ] Troubleshooting section

**Files to Create**:
- `README.md` (root)
- `CONTRIBUTING.md`

---

## Phase 3.2: Data Models (T016-T026)

**CRITICAL: All model tasks must complete before service layer implementation**

### T016: [P] Create User model and migration
**Type**: model | **Depends On**: T004 | **Parallel**: yes

**Description**: Implement User entity from data-model.md with all fields, validation, and indexes.

**Acceptance Criteria**:
- [ ] User model defined with all fields from data-model.md:216-256
- [ ] Validation rules applied (email format, display name length, SSH key format)
- [ ] Indexes created (email unique, created_at)
- [ ] Migration file generated

**Files to Create/Modify**:
- `backend/prisma/schema.prisma` (User model) OR
- `backend/src/models/user.ts` + `backend/src/migrations/001_create_users.ts`

---

### T017: [P] Create Team model and migration
**Type**: model | **Depends On**: T004 | **Parallel**: yes

**Description**: Implement Team entity from data-model.md with validation and indexes.

**Acceptance Criteria**:
- [ ] Team model defined with all fields from data-model.md:258-283
- [ ] Validation rules (slug pattern, name length)
- [ ] Indexes created (slug unique, name)
- [ ] Migration file generated

**Files to Create/Modify**:
- `backend/prisma/schema.prisma` (Team model) OR
- `backend/src/models/team.ts` + migration

---

### T018: [P] Create UserTeam junction model and migration
**Type**: model | **Depends On**: T016, T017 | **Parallel**: yes

**Description**: Implement UserTeam many-to-many relationship with role field.

**Acceptance Criteria**:
- [ ] UserTeam model with user_id, team_id, role, joined_at
- [ ] Role enum: admin, developer, viewer
- [ ] Unique constraint on (user_id, team_id)
- [ ] Indexes created

**Files to Create/Modify**:
- `backend/prisma/schema.prisma` (UserTeam model) OR
- `backend/src/models/user-team.ts` + migration

---

### T019: [P] Create Project model and migration
**Type**: model | **Depends On**: T016, T017 | **Parallel**: yes

**Description**: Implement Project entity with owner (User XOR Team) relationship.

**Acceptance Criteria**:
- [ ] Project model with all fields from data-model.md:285-341
- [ ] XOR constraint: exactly one of owner_id or team_id must be set
- [ ] Unique constraints on (slug, owner_id) and (slug, team_id)
- [ ] Indexes created

**Files to Create/Modify**:
- `backend/prisma/schema.prisma` (Project model) OR
- `backend/src/models/project.ts` + migration

---

### T020: [P] Create Environment model and migration
**Type**: model | **Depends On**: T019 | **Parallel**: yes

**Description**: Implement Environment entity with status state machine and resource limits.

**Acceptance Criteria**:
- [ ] Environment model with all fields from data-model.md:343-400
- [ ] Status enum: stopped, starting, running, stopping, error
- [ ] Resource limit validation (CPU, memory, storage)
- [ ] Unique constraint on (project_id, slug)
- [ ] Indexes created (project_id, status, container_id)

**Files to Create/Modify**:
- `backend/prisma/schema.prisma` (Environment model) OR
- `backend/src/models/environment.ts` + migration

---

### T021: [P] Create EnvironmentPort model and migration
**Type**: model | **Depends On**: T020 | **Parallel**: yes

**Description**: Implement EnvironmentPort entity for port mappings.

**Acceptance Criteria**:
- [ ] EnvironmentPort model with fields from data-model.md:402-428
- [ ] Port validation (1-65535 for container, 1024-65535 for host)
- [ ] Protocol enum: tcp, udp
- [ ] Unique constraints on (environment_id, container_port) and host_port

**Files to Create/Modify**:
- `backend/prisma/schema.prisma` (EnvironmentPort model) OR
- `backend/src/models/environment-port.ts` + migration

---

### T022: [P] Create EnvironmentVariable model and migration
**Type**: model | **Depends On**: T020 | **Parallel**: yes

**Description**: Implement EnvironmentVariable entity with encryption support.

**Acceptance Criteria**:
- [ ] EnvironmentVariable model from data-model.md:430-458
- [ ] Key validation (uppercase alphanumeric + underscore)
- [ ] is_encrypted flag
- [ ] Unique constraint on (environment_id, key)

**Files to Create/Modify**:
- `backend/prisma/schema.prisma` (EnvironmentVariable model) OR
- `backend/src/models/environment-variable.ts` + migration

---

### T023: [P] Create Session model and migration
**Type**: model | **Depends On**: T020 | **Parallel**: yes

**Description**: Implement Session entity for tmux/vscode_server/shell sessions.

**Acceptance Criteria**:
- [ ] Session model with all fields from data-model.md:460-498
- [ ] session_type enum: vscode_server, tmux, shell
- [ ] status enum: starting, active, idle, terminated
- [ ] Unique constraint on (environment_id, session_type, session_name)
- [ ] Indexes created

**Files to Create/Modify**:
- `backend/prisma/schema.prisma` (Session model) OR
- `backend/src/models/session.ts` + migration

---

### T024: [P] Create Extension model and migration
**Type**: model | **Depends On**: T004 | **Parallel**: yes

**Description**: Implement Extension catalog entity.

**Acceptance Criteria**:
- [ ] Extension model with fields from data-model.md:500-530
- [ ] extension_id validation (publisher.name format)
- [ ] is_custom flag for non-marketplace extensions
- [ ] Unique index on extension_id

**Files to Create/Modify**:
- `backend/prisma/schema.prisma` (Extension model) OR
- `backend/src/models/extension.ts` + migration

---

### T025: [P] Create EnvironmentExtension junction model and migration
**Type**: model | **Depends On**: T020, T024 | **Parallel**: yes

**Description**: Implement EnvironmentExtension many-to-many with installation status.

**Acceptance Criteria**:
- [ ] EnvironmentExtension model from data-model.md:532-564
- [ ] status enum: pending, installing, installed, failed, uninstalling
- [ ] Unique constraint on (environment_id, extension_id)
- [ ] Indexes created

**Files to Create/Modify**:
- `backend/prisma/schema.prisma` (EnvironmentExtension model) OR
- `backend/src/models/environment-extension.ts` + migration

---

### T026: [P] Create LogEntry model and migration
**Type**: model | **Depends On**: T020 | **Parallel**: yes

**Description**: Implement LogEntry entity with retention policy considerations.

**Acceptance Criteria**:
- [ ] LogEntry model with fields from data-model.md:566-596
- [ ] stream enum: stdout, stderr
- [ ] Composite index on (environment_id, timestamp DESC)
- [ ] Index on created_at for retention cleanup

**Files to Create/Modify**:
- `backend/prisma/schema.prisma` (LogEntry model) OR
- `backend/src/models/log-entry.ts` + migration

---

## Phase 3.3: Contract Tests (T027-T066)

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

All contract tests validate OpenAPI specification compliance. Tests should use Supertest and verify:
- Request/response schemas match OpenAPI spec
- HTTP status codes are correct
- Authentication/authorization requirements
- Error responses are properly formatted

### Authentication Endpoints Tests

### T027: [P] Contract test POST /auth/register
**Type**: test | **Depends On**: T006, T016 | **Parallel**: yes

**Description**: Test user registration endpoint validates request body and returns proper response per openapi.yaml:37-70.

**Acceptance Criteria**:
- [ ] Test successful registration (201 status, AuthResponse schema)
- [ ] Test email validation (400 for invalid email)
- [ ] Test password validation (400 for short password)
- [ ] Test duplicate email (409 status)
- [ ] Test MUST FAIL (no implementation yet)

**Files to Create**:
- `backend/tests/contract/auth-register.test.ts`

---

### T028: [P] Contract test POST /auth/login
**Type**: test | **Depends On**: T006, T016 | **Parallel**: yes

**Description**: Test login endpoint per openapi.yaml:72-98.

**Acceptance Criteria**:
- [ ] Test successful login (200, AuthResponse)
- [ ] Test invalid credentials (401)
- [ ] Test missing fields (400)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/auth-login.test.ts`

---

### T029: [P] Contract test GET /auth/oauth/{provider}
**Type**: test | **Depends On**: T006 | **Parallel**: yes

**Description**: Test OAuth redirect endpoint per openapi.yaml:100-114.

**Acceptance Criteria**:
- [ ] Test GitHub provider redirects (302)
- [ ] Test Google provider redirects (302)
- [ ] Test invalid provider (404 or 400)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/auth-oauth.test.ts`

---

### T030: [P] Contract test POST /auth/refresh
**Type**: test | **Depends On**: T006 | **Parallel**: yes

**Description**: Test token refresh endpoint per openapi.yaml:116-129.

**Acceptance Criteria**:
- [ ] Test successful refresh (200, new tokens)
- [ ] Test invalid refresh token (401)
- [ ] Test expired refresh token (401)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/auth-refresh.test.ts`

---

### User Endpoints Tests

### T031: [P] Contract test GET /users/me
**Type**: test | **Depends On**: T006, T016 | **Parallel**: yes

**Description**: Test get current user profile per openapi.yaml:132-142.

**Acceptance Criteria**:
- [ ] Test successful retrieval with valid JWT (200, User schema)
- [ ] Test unauthorized without JWT (401)
- [ ] Test invalid JWT (401)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/users-me-get.test.ts`

---

### T032: [P] Contract test PATCH /users/me
**Type**: test | **Depends On**: T006, T016 | **Parallel**: yes

**Description**: Test update user profile per openapi.yaml:144-173.

**Acceptance Criteria**:
- [ ] Test successful update (200, updated User)
- [ ] Test partial update (only displayName)
- [ ] Test invalid fields (400)
- [ ] Test unauthorized (401)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/users-me-patch.test.ts`

---

### Team Endpoints Tests

### T033: [P] Contract test GET /teams
**Type**: test | **Depends On**: T006, T017, T018 | **Parallel**: yes

**Description**: Test list user's teams per openapi.yaml:176-188.

**Acceptance Criteria**:
- [ ] Test returns array of teams (200)
- [ ] Test empty array for user with no teams
- [ ] Test unauthorized (401)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/teams-get.test.ts`

---

### T034: [P] Contract test POST /teams
**Type**: test | **Depends On**: T006, T017 | **Parallel**: yes

**Description**: Test create team per openapi.yaml:190-216.

**Acceptance Criteria**:
- [ ] Test successful creation (201, Team schema)
- [ ] Test slug validation (400 for invalid format)
- [ ] Test duplicate slug (409 or 400)
- [ ] Test unauthorized (401)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/teams-post.test.ts`

---

### T035: [P] Contract test GET /teams/{teamId}
**Type**: test | **Depends On**: T006, T017 | **Parallel**: yes

**Description**: Test get team details per openapi.yaml:218-230.

**Acceptance Criteria**:
- [ ] Test successful retrieval (200, Team schema)
- [ ] Test not found (404)
- [ ] Test unauthorized (401)
- [ ] Test forbidden (403 for non-member)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/teams-get-by-id.test.ts`

---

### T036: [P] Contract test PATCH /teams/{teamId}
**Type**: test | **Depends On**: T006, T017 | **Parallel**: yes

**Description**: Test update team per openapi.yaml:232-250.

**Acceptance Criteria**:
- [ ] Test successful update (200)
- [ ] Test admin-only (403 for non-admin)
- [ ] Test not found (404)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/teams-patch.test.ts`

---

### T037: [P] Contract test DELETE /teams/{teamId}
**Type**: test | **Depends On**: T006, T017 | **Parallel**: yes

**Description**: Test delete team per openapi.yaml:252-259.

**Acceptance Criteria**:
- [ ] Test successful deletion (204)
- [ ] Test admin-only (403)
- [ ] Test not found (404)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/teams-delete.test.ts`

---

### T038: [P] Contract test GET /teams/{teamId}/members
**Type**: test | **Depends On**: T006, T018 | **Parallel**: yes

**Description**: Test list team members per openapi.yaml:261-275.

**Acceptance Criteria**:
- [ ] Test returns array of TeamMember (200)
- [ ] Test member-only access (403 for non-members)
- [ ] Test not found (404)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/teams-members-get.test.ts`

---

### T039: [P] Contract test POST /teams/{teamId}/members
**Type**: test | **Depends On**: T006, T018 | **Parallel**: yes

**Description**: Test add team member per openapi.yaml:277-299.

**Acceptance Criteria**:
- [ ] Test successful member addition (201)
- [ ] Test admin-only (403)
- [ ] Test role validation (400 for invalid role)
- [ ] Test duplicate member (409 or 400)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/teams-members-post.test.ts`

---

### Project Endpoints Tests

### T040: [P] Contract test GET /projects
**Type**: test | **Depends On**: T006, T019 | **Parallel**: yes

**Description**: Test list projects per openapi.yaml:301-324.

**Acceptance Criteria**:
- [ ] Test returns array of projects (200)
- [ ] Test filter by teamId query param
- [ ] Test filter by archived query param
- [ ] Test unauthorized (401)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/projects-get.test.ts`

---

### T041: [P] Contract test POST /projects
**Type**: test | **Depends On**: T006, T019 | **Parallel**: yes

**Description**: Test create project per openapi.yaml:326-354.

**Acceptance Criteria**:
- [ ] Test personal project creation (201, no teamId)
- [ ] Test team project creation (201, with teamId)
- [ ] Test slug validation (400)
- [ ] Test XOR validation (400 if both owner_id and team_id)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/projects-post.test.ts`

---

### T042: [P] Contract test GET /projects/{projectId}
**Type**: test | **Depends On**: T006, T019 | **Parallel**: yes

**Description**: Test get project details per openapi.yaml:356-368.

**Acceptance Criteria**:
- [ ] Test successful retrieval (200, Project schema)
- [ ] Test not found (404)
- [ ] Test authorization (403 for non-owner/non-team-member)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/projects-get-by-id.test.ts`

---

### T043: [P] Contract test PATCH /projects/{projectId}
**Type**: test | **Depends On**: T006, T019 | **Parallel**: yes

**Description**: Test update project per openapi.yaml:370-390.

**Acceptance Criteria**:
- [ ] Test successful update (200)
- [ ] Test partial update
- [ ] Test owner-only (403)
- [ ] Test not found (404)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/projects-patch.test.ts`

---

### T044: [P] Contract test DELETE /projects/{projectId}
**Type**: test | **Depends On**: T006, T019 | **Parallel**: yes

**Description**: Test delete project per openapi.yaml:392-399.

**Acceptance Criteria**:
- [ ] Test successful deletion (204)
- [ ] Test owner-only (403)
- [ ] Test not found (404)
- [ ] Test cascading deletion of environments
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/projects-delete.test.ts`

---

### Environment Endpoints Tests

### T045: [P] Contract test GET /environments
**Type**: test | **Depends On**: T006, T020 | **Parallel**: yes

**Description**: Test list environments with pagination per openapi.yaml:402-443.

**Acceptance Criteria**:
- [ ] Test returns paginated environments (200)
- [ ] Test filter by projectId query param
- [ ] Test filter by status query param
- [ ] Test pagination (page, limit params)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/environments-get.test.ts`

---

### T046: [P] Contract test POST /environments
**Type**: test | **Depends On**: T006, T020 | **Parallel**: yes

**Description**: Test create environment per openapi.yaml:445-521.

**Acceptance Criteria**:
- [ ] Test successful creation with all fields (201)
- [ ] Test with ports and environment variables
- [ ] Test with extensions array
- [ ] Test resource limit validation (400)
- [ ] Test slug validation (400)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/environments-post.test.ts`

---

### T047: [P] Contract test GET /environments/{environmentId}
**Type**: test | **Depends On**: T006, T020 | **Parallel**: yes

**Description**: Test get environment details per openapi.yaml:523-535.

**Acceptance Criteria**:
- [ ] Test successful retrieval (200, Environment schema)
- [ ] Test not found (404)
- [ ] Test authorization (403)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/environments-get-by-id.test.ts`

---

### T048: [P] Contract test PATCH /environments/{environmentId}
**Type**: test | **Depends On**: T006, T020 | **Parallel**: yes

**Description**: Test update environment per openapi.yaml:537-559.

**Acceptance Criteria**:
- [ ] Test successful update (200)
- [ ] Test resource limit updates
- [ ] Test validation (400)
- [ ] Test not found (404)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/environments-patch.test.ts`

---

### T049: [P] Contract test DELETE /environments/{environmentId}
**Type**: test | **Depends On**: T006, T020 | **Parallel**: yes

**Description**: Test delete environment per openapi.yaml:561-568.

**Acceptance Criteria**:
- [ ] Test successful deletion (204)
- [ ] Test Docker container cleanup verified
- [ ] Test not found (404)
- [ ] Test authorization (403)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/environments-delete.test.ts`

---

### T050: [P] Contract test POST /environments/{environmentId}/start
**Type**: test | **Depends On**: T006, T020 | **Parallel**: yes

**Description**: Test start environment per openapi.yaml:570-584.

**Acceptance Criteria**:
- [ ] Test successful start (200, status changes to starting)
- [ ] Test already running (409)
- [ ] Test not found (404)
- [ ] Test authorization (403)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/environments-start.test.ts`

---

### T051: [P] Contract test POST /environments/{environmentId}/stop
**Type**: test | **Depends On**: T006, T020 | **Parallel**: yes

**Description**: Test stop environment per openapi.yaml:586-600.

**Acceptance Criteria**:
- [ ] Test successful stop (200, status changes to stopping)
- [ ] Test already stopped (409)
- [ ] Test not found (404)
- [ ] Test authorization (403)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/environments-stop.test.ts`

---

### T052: [P] Contract test POST /environments/{environmentId}/ports
**Type**: test | **Depends On**: T006, T021 | **Parallel**: yes

**Description**: Test add port mapping per openapi.yaml:602-625.

**Acceptance Criteria**:
- [ ] Test successful port addition (201)
- [ ] Test port validation (400)
- [ ] Test duplicate container port (409 or 400)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/environments-ports-post.test.ts`

---

### T053: [P] Contract test GET /environments/{environmentId}/variables
**Type**: test | **Depends On**: T006, T022 | **Parallel**: yes

**Description**: Test list environment variables per openapi.yaml:627-641.

**Acceptance Criteria**:
- [ ] Test returns array of variables (200)
- [ ] Test encrypted values not exposed
- [ ] Test authorization (403)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/environments-variables-get.test.ts`

---

### T054: [P] Contract test POST /environments/{environmentId}/variables
**Type**: test | **Depends On**: T006, T022 | **Parallel**: yes

**Description**: Test add environment variable per openapi.yaml:643-664.

**Acceptance Criteria**:
- [ ] Test successful addition (201)
- [ ] Test key validation (uppercase, alphanumeric + underscore)
- [ ] Test duplicate key (409 or 400)
- [ ] Test encryption flag
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/environments-variables-post.test.ts`

---

### Session Endpoints Tests

### T055: [P] Contract test GET /environments/{environmentId}/sessions
**Type**: test | **Depends On**: T006, T023 | **Parallel**: yes

**Description**: Test list environment sessions per openapi.yaml:667-681.

**Acceptance Criteria**:
- [ ] Test returns array of sessions (200)
- [ ] Test various session types (shell, tmux, vscode_server)
- [ ] Test authorization (403)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/sessions-get.test.ts`

---

### T056: [P] Contract test POST /environments/{environmentId}/sessions
**Type**: test | **Depends On**: T006, T023 | **Parallel**: yes

**Description**: Test create session per openapi.yaml:683-707.

**Acceptance Criteria**:
- [ ] Test successful creation (201, Session schema)
- [ ] Test session type validation
- [ ] Test unique session name constraint
- [ ] Test environment must be running
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/sessions-post.test.ts`

---

### T057: [P] Contract test DELETE /sessions/{sessionId}
**Type**: test | **Depends On**: T006, T023 | **Parallel**: yes

**Description**: Test terminate session per openapi.yaml:709-722.

**Acceptance Criteria**:
- [ ] Test successful termination (204)
- [ ] Test not found (404)
- [ ] Test authorization (403)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/sessions-delete.test.ts`

---

### Extension Endpoints Tests

### T058: [P] Contract test GET /extensions
**Type**: test | **Depends On**: T006, T024 | **Parallel**: yes

**Description**: Test search extensions per openapi.yaml:725-746.

**Acceptance Criteria**:
- [ ] Test search by query parameter
- [ ] Test filter by publisher
- [ ] Test returns array of Extension (200)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/extensions-get.test.ts`

---

### T059: [P] Contract test GET /environments/{environmentId}/extensions
**Type**: test | **Depends On**: T006, T025 | **Parallel**: yes

**Description**: Test list installed extensions per openapi.yaml:748-762.

**Acceptance Criteria**:
- [ ] Test returns array of EnvironmentExtension (200)
- [ ] Test includes status (pending, installing, installed)
- [ ] Test authorization (403)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/environments-extensions-get.test.ts`

---

### T060: [P] Contract test POST /environments/{environmentId}/extensions
**Type**: test | **Depends On**: T006, T025 | **Parallel**: yes

**Description**: Test install extension per openapi.yaml:764-786.

**Acceptance Criteria**:
- [ ] Test successful installation request (202, status pending)
- [ ] Test extension ID validation
- [ ] Test duplicate extension (409 or 400)
- [ ] Test authorization (403)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/environments-extensions-post.test.ts`

---

### T061: [P] Contract test DELETE /environments/{environmentId}/extensions/{extensionId}
**Type**: test | **Depends On**: T006, T025 | **Parallel**: yes

**Description**: Test uninstall extension per openapi.yaml:788-802.

**Acceptance Criteria**:
- [ ] Test successful uninstallation request (202)
- [ ] Test not found (404)
- [ ] Test authorization (403)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/environments-extensions-delete.test.ts`

---

### Log Endpoints Tests

### T062: [P] Contract test GET /environments/{environmentId}/logs
**Type**: test | **Depends On**: T006, T026 | **Parallel**: yes

**Description**: Test get environment logs per openapi.yaml:805-840.

**Acceptance Criteria**:
- [ ] Test returns array of LogEntry (200)
- [ ] Test filter by since/until timestamps
- [ ] Test tail parameter (limit results)
- [ ] Test stream filter (stdout, stderr, all)
- [ ] Test authorization (403)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/logs-get.test.ts`

---

### WebSocket Contract Tests

### T063: [P] WebSocket contract test - Log streaming
**Type**: test | **Depends On**: T006 | **Parallel**: yes

**Description**: Test log streaming WebSocket per websocket-spec.md:19-113.

**Acceptance Criteria**:
- [ ] Test authentication required
- [ ] Test connection success with valid token
- [ ] Test receives initial historical logs
- [ ] Test message schema validation (log, status, error, end types)
- [ ] Test client control messages (pause, resume, filter)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/websocket-logs.test.ts`

---

### T064: [P] WebSocket contract test - Terminal (PTY)
**Type**: test | **Depends On**: T006 | **Parallel**: yes

**Description**: Test terminal WebSocket per websocket-spec.md:115-189.

**Acceptance Criteria**:
- [ ] Test authentication required
- [ ] Test connection and session creation
- [ ] Test bidirectional communication (input/data messages)
- [ ] Test resize message
- [ ] Test message schema validation
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/websocket-terminal.test.ts`

---

### T065: [P] WebSocket contract test - Status updates
**Type**: test | **Depends On**: T006 | **Parallel**: yes

**Description**: Test status updates WebSocket per websocket-spec.md:191-240.

**Acceptance Criteria**:
- [ ] Test authentication required
- [ ] Test receives current status on connect
- [ ] Test receives updates when status changes
- [ ] Test status message schema validation
- [ ] Test metrics message (optional future)
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/websocket-status.test.ts`

---

### T066: [P] WebSocket integration test - Rate limiting and security
**Type**: test | **Depends On**: T006 | **Parallel**: yes

**Description**: Test WebSocket security features per websocket-spec.md:257-301.

**Acceptance Criteria**:
- [ ] Test rate limiting enforcement
- [ ] Test connection limits per user/environment
- [ ] Test message size limits
- [ ] Test automatic cleanup on suspicious activity
- [ ] Test MUST FAIL initially

**Files to Create**:
- `backend/tests/contract/websocket-security.test.ts`

---

## Phase 3.4: Service Layer (T067-T090)

**CRITICAL: Services implement business logic and make contract tests pass**

### T067: Create AuthService
**Type**: service | **Depends On**: T027-T030, T016 | **Parallel**: no

**Description**: Implement authentication service with email/password login, registration, and JWT token management.

**Acceptance Criteria**:
- [ ] Methods: register(), login(), refreshToken()
- [ ] Password hashing with bcrypt
- [ ] JWT generation and validation
- [ ] Refresh token rotation
- [ ] Contract tests T027-T030 PASS

**Files to Create**:
- `backend/src/services/auth.service.ts`
- `backend/src/lib/jwt.ts`
- `backend/src/lib/hash.ts`

---

### T068: Create OAuthService
**Type**: service | **Depends On**: T029, T067 | **Parallel**: no

**Description**: Implement OAuth authentication with Passport.js strategies for GitHub and Google.

**Acceptance Criteria**:
- [ ] Passport GitHub strategy configured
- [ ] Passport Google strategy configured
- [ ] OAuth callback handling
- [ ] User creation/linking on OAuth login
- [ ] Contract test T029 PASSES

**Files to Create**:
- `backend/src/services/oauth.service.ts`
- `backend/src/lib/passport.config.ts`

---

### T069: [P] Create UserService
**Type**: service | **Depends On**: T031-T032, T016 | **Parallel**: yes

**Description**: Implement user profile management service.

**Acceptance Criteria**:
- [ ] Methods: getUserById(), updateProfile(), getUserByEmail()
- [ ] Profile field validation
- [ ] SSH key validation
- [ ] Contract tests T031-T032 PASS

**Files to Create**:
- `backend/src/services/user.service.ts`

---

### T070: [P] Create TeamService
**Type**: service | **Depends On**: T033-T039, T017, T018 | **Parallel**: yes

**Description**: Implement team management service with member roles.

**Acceptance Criteria**:
- [ ] Methods: createTeam(), listTeams(), getTeam(), updateTeam(), deleteTeam()
- [ ] Methods: addMember(), removeMember(), listMembers(), updateMemberRole()
- [ ] Role-based authorization checks (admin, developer, viewer)
- [ ] Slug validation and uniqueness
- [ ] Contract tests T033-T039 PASS

**Files to Create**:
- `backend/src/services/team.service.ts`

---

### T071: [P] Create ProjectService
**Type**: service | **Depends On**: T040-T044, T019 | **Parallel**: yes

**Description**: Implement project management service with owner (User XOR Team) logic.

**Acceptance Criteria**:
- [ ] Methods: createProject(), listProjects(), getProject(), updateProject(), deleteProject()
- [ ] XOR constraint enforcement (owner_id XOR team_id)
- [ ] Authorization checks (owner or team member)
- [ ] Archive/unarchive functionality
- [ ] Contract tests T040-T044 PASS

**Files to Create**:
- `backend/src/services/project.service.ts`

---

### T072: Create DockerService
**Type**: service | **Depends On**: T045-T051, T020 | **Parallel**: no

**Description**: Implement Docker container management service using dockerode.

**Acceptance Criteria**:
- [ ] Methods: createContainer(), startContainer(), stopContainer(), deleteContainer()
- [ ] Methods: getContainerStatus(), getContainerLogs(), attachToContainer()
- [ ] Image pulling with progress tracking
- [ ] Port mapping configuration
- [ ] Volume management
- [ ] Resource limits enforcement (CPU, memory, storage)
- [ ] Container lifecycle state machine (stopped → starting → running → stopping → stopped)
- [ ] Contract tests T045-T051 PASS

**Files to Create**:
- `backend/src/services/docker.service.ts`
- `backend/src/lib/docker-client.ts`

---

### T073: Create EnvironmentService
**Type**: service | **Depends On**: T072, T020, T021, T022 | **Parallel**: no

**Description**: Implement environment management service orchestrating Docker, ports, and variables.

**Acceptance Criteria**:
- [ ] Methods: createEnvironment(), listEnvironments(), getEnvironment(), updateEnvironment(), deleteEnvironment()
- [ ] Methods: startEnvironment(), stopEnvironment()
- [ ] Integrates DockerService for container operations
- [ ] Manages EnvironmentPorts and EnvironmentVariables
- [ ] Environment status tracking and updates
- [ ] Error handling and status transitions
- [ ] Contract tests T045-T054 PASS

**Files to Create**:
- `backend/src/services/environment.service.ts`

---

### T074: [P] Create SessionService
**Type**: service | **Depends On**: T055-T057, T023, T072 | **Parallel**: yes

**Description**: Implement session management service for tmux, shell, and VS Code Server.

**Acceptance Criteria**:
- [ ] Methods: createSession(), listSessions(), getSession(), terminateSession()
- [ ] Methods: attachToSession(), detachFromSession()
- [ ] tmux session management (create, attach, list)
- [ ] Shell session spawning
- [ ] VS Code Server integration (future placeholder)
- [ ] Idle timeout tracking
- [ ] Contract tests T055-T057 PASS

**Files to Create**:
- `backend/src/services/session.service.ts`

---

### T075: [P] Create ExtensionService
**Type**: service | **Depends On**: T058-T061, T024, T025 | **Parallel**: yes

**Description**: Implement VS Code extension management service.

**Acceptance Criteria**:
- [ ] Methods: searchExtensions(), getExtension(), installExtension(), uninstallExtension()
- [ ] Methods: listInstalledExtensions(), syncExtensions()
- [ ] VS Code Marketplace API integration
- [ ] Extension installation state tracking (pending → installing → installed)
- [ ] Custom extension support
- [ ] Contract tests T058-T061 PASS

**Files to Create**:
- `backend/src/services/extension.service.ts`
- `backend/src/lib/vscode-marketplace.ts`

---

### T076: Create LogService
**Type**: service | **Depends On**: T062, T026, T072 | **Parallel**: no

**Description**: Implement log persistence and streaming service.

**Acceptance Criteria**:
- [ ] Methods: getLogs(), streamLogs(), persistLog(), cleanupOldLogs()
- [ ] Integrates with DockerService for container log streams
- [ ] Log rotation enforcement (20MB per environment)
- [ ] Retention policy enforcement (7 days)
- [ ] Efficient log querying with pagination
- [ ] Contract test T062 PASSES

**Files to Create**:
- `backend/src/services/log.service.ts`

---

### T077: Create WebSocketService
**Type**: service | **Depends On**: T063-T066, T076, T072 | **Parallel**: no

**Description**: Implement WebSocket connection management and message routing.

**Acceptance Criteria**:
- [ ] Connection authentication and authorization
- [ ] Connection pool management (per user, per environment limits)
- [ ] Message routing to appropriate handlers
- [ ] Rate limiting enforcement
- [ ] Reconnection handling
- [ ] Graceful connection cleanup
- [ ] Contract tests T063-T066 PASS

**Files to Create**:
- `backend/src/services/websocket.service.ts`
- `backend/src/lib/websocket-connection.ts`

---

### T078: [P] Create EncryptionService
**Type**: service | **Depends On**: T022 | **Parallel**: yes

**Description**: Implement encryption/decryption service for sensitive environment variables.

**Acceptance Criteria**:
- [ ] Methods: encrypt(), decrypt()
- [ ] AES-256 encryption
- [ ] Key management (from config/env)
- [ ] Automatic encryption for common secret patterns (API_KEY, SECRET, PASSWORD)

**Files to Create**:
- `backend/src/services/encryption.service.ts`
- `backend/src/lib/crypto.ts`

---

### T079: [P] Create NotificationService (stub for future)
**Type**: service | **Depends On**: T016 | **Parallel**: yes

**Description**: Create notification service stub for future email/webhook notifications.

**Acceptance Criteria**:
- [ ] Interface defined: sendNotification(), queueNotification()
- [ ] Stub implementation (console.log for now)
- [ ] Extensible for future email/webhook integration

**Files to Create**:
- `backend/src/services/notification.service.ts`

---

### T080: Create AuditLogService (optional)
**Type**: service | **Depends On**: T016 | **Parallel**: no

**Description**: Create audit logging service for security-relevant actions.

**Acceptance Criteria**:
- [ ] Methods: logAction(), queryAuditLogs()
- [ ] Captures: user, action, resource, timestamp, IP, user agent
- [ ] Async logging (non-blocking)
- [ ] Query interface for compliance

**Files to Create**:
- `backend/src/services/audit-log.service.ts`

---

## Phase 3.5: API Layer - Middleware & Core Setup (T081-T090)

### T081: Create authentication middleware
**Type**: api | **Depends On**: T067 | **Parallel**: no

**Description**: Implement JWT authentication middleware for Fastify routes.

**Acceptance Criteria**:
- [ ] Middleware: authenticateRequest()
- [ ] Extract and verify JWT from Authorization header
- [ ] Attach user to request object
- [ ] Return 401 for invalid/expired tokens
- [ ] Skip authentication for public routes

**Files to Create**:
- `backend/src/api/middleware/auth.middleware.ts`

---

### T082: Create authorization middleware
**Type**: api | **Depends On**: T081, T070, T071 | **Parallel**: no

**Description**: Implement role-based authorization middleware.

**Acceptance Criteria**:
- [ ] Middleware: requireRole(role), requireOwnership(resourceType)
- [ ] Team role checks (admin, developer, viewer)
- [ ] Project ownership checks (user or team member)
- [ ] Environment access checks
- [ ] Return 403 for unauthorized access

**Files to Create**:
- `backend/src/api/middleware/authz.middleware.ts`

---

### T083: [P] Create request validation middleware
**Type**: api | **Depends On**: T002 | **Parallel**: yes

**Description**: Implement request body/query/param validation using JSON Schema from OpenAPI spec.

**Acceptance Criteria**:
- [ ] Middleware: validateRequest(schema)
- [ ] Validate request body, query params, path params
- [ ] Return 400 with validation errors
- [ ] Integration with OpenAPI schemas

**Files to Create**:
- `backend/src/api/middleware/validation.middleware.ts`
- `backend/src/lib/validation-schemas.ts`

---

### T084: [P] Create error handling middleware
**Type**: api | **Depends On**: T002 | **Parallel**: yes

**Description**: Implement global error handler for consistent error responses.

**Acceptance Criteria**:
- [ ] Catch all unhandled errors
- [ ] Format errors per OpenAPI Error schema
- [ ] Log errors with context
- [ ] Return appropriate HTTP status codes
- [ ] Hide internal details in production

**Files to Create**:
- `backend/src/api/middleware/error.middleware.ts`

---

### T085: [P] Create request logging middleware
**Type**: api | **Depends On**: T011 | **Parallel**: yes

**Description**: Implement request/response logging middleware.

**Acceptance Criteria**:
- [ ] Log all incoming requests (method, path, user)
- [ ] Log response status and duration
- [ ] Exclude sensitive data (passwords, tokens)
- [ ] Integration with pino logger

**Files to Create**:
- `backend/src/api/middleware/logging.middleware.ts`

---

### T086: [P] Create CORS middleware
**Type**: api | **Depends On**: T002 | **Parallel**: yes

**Description**: Configure CORS for frontend access.

**Acceptance Criteria**:
- [ ] Allow frontend origin (configurable)
- [ ] Allow credentials (cookies)
- [ ] Appropriate headers allowed/exposed
- [ ] Preflight request handling

**Files to Create**:
- `backend/src/api/middleware/cors.middleware.ts`

---

### T087: Create rate limiting middleware
**Type**: api | **Depends On**: T002 | **Parallel**: no

**Description**: Implement rate limiting for API endpoints.

**Acceptance Criteria**:
- [ ] Per-IP rate limiting
- [ ] Per-user rate limiting (authenticated)
- [ ] Configurable limits per endpoint type
- [ ] Return 429 when limit exceeded
- [ ] Rate limit headers (X-RateLimit-*)

**Files to Create**:
- `backend/src/api/middleware/rate-limit.middleware.ts`

---

### T088: Create Fastify app setup
**Type**: api | **Depends On**: T081-T087 | **Parallel**: no

**Description**: Initialize Fastify app with all middleware and plugins.

**Acceptance Criteria**:
- [ ] Fastify instance creation
- [ ] Register all middleware in correct order
- [ ] WebSocket plugin setup (@fastify/websocket)
- [ ] Passport plugin setup
- [ ] Health check endpoint: GET /health
- [ ] Graceful shutdown handling

**Files to Create**:
- `backend/src/app.ts`
- `backend/src/server.ts`

---

### T089: Create API route registration
**Type**: api | **Depends On**: T088 | **Parallel**: no

**Description**: Set up route registration structure and base router.

**Acceptance Criteria**:
- [ ] Route prefix: /api/v1
- [ ] Route registration function
- [ ] Route organization by resource
- [ ] OpenAPI documentation endpoint

**Files to Create**:
- `backend/src/api/routes/index.ts`

---

### T090: Set up OpenAPI documentation endpoint
**Type**: api | **Depends On**: T089 | **Parallel**: no

**Description**: Serve OpenAPI spec and Swagger UI for API documentation.

**Acceptance Criteria**:
- [ ] Endpoint: GET /api/v1/docs (Swagger UI)
- [ ] Endpoint: GET /api/v1/docs/openapi.yaml (spec)
- [ ] Use @fastify/swagger plugin
- [ ] Generate spec from routes or serve static openapi.yaml

**Files to Create**:
- `backend/src/api/routes/docs.route.ts`

---

## Phase 3.6: API Layer - Route Implementations (T091-T130)

**Note**: Routes depend on corresponding services. All routes should:
- Use authentication middleware
- Use authorization middleware where appropriate
- Use validation middleware
- Return responses per OpenAPI schema

### Authentication Routes

### T091: Implement POST /auth/register route
**Type**: api | **Depends On**: T067, T088, T089 | **Parallel**: no

**Acceptance Criteria**:
- [ ] Route handler calls AuthService.register()
- [ ] Validation middleware applied
- [ ] Returns 201 with AuthResponse
- [ ] Contract test T027 PASSES

**Files to Create**:
- `backend/src/api/routes/auth.route.ts`

---

### T092: Implement POST /auth/login route
**Type**: api | **Depends On**: T091 | **Parallel**: no

**Acceptance Criteria**:
- [ ] Route handler calls AuthService.login()
- [ ] Returns 200 with AuthResponse
- [ ] Contract test T028 PASSES

**Files to Modify**:
- `backend/src/api/routes/auth.route.ts`

---

### T093: Implement GET /auth/oauth/{provider} and callback routes
**Type**: api | **Depends On**: T068, T088 | **Parallel**: no

**Acceptance Criteria**:
- [ ] Passport authentication flow
- [ ] Redirect to OAuth provider
- [ ] Callback route handles success/failure
- [ ] Contract test T029 PASSES

**Files to Modify**:
- `backend/src/api/routes/auth.route.ts`

---

### T094: Implement POST /auth/refresh route
**Type**: api | **Depends On**: T091 | **Parallel**: no

**Acceptance Criteria**:
- [ ] Route handler calls AuthService.refreshToken()
- [ ] Returns 200 with new tokens
- [ ] Contract test T030 PASSES

**Files to Modify**:
- `backend/src/api/routes/auth.route.ts`

---

### User Routes

### T095: [P] Implement GET /users/me route
**Type**: api | **Depends On**: T069, T081, T089 | **Parallel**: yes

**Acceptance Criteria**:
- [ ] Route handler calls UserService.getUserById()
- [ ] Authentication required
- [ ] Returns 200 with User schema
- [ ] Contract test T031 PASSES

**Files to Create**:
- `backend/src/api/routes/users.route.ts`

---

### T096: [P] Implement PATCH /users/me route
**Type**: api | **Depends On**: T095 | **Parallel**: no (same file as T095)

**Acceptance Criteria**:
- [ ] Route handler calls UserService.updateProfile()
- [ ] Validation middleware applied
- [ ] Returns 200 with updated User
- [ ] Contract test T032 PASSES

**Files to Modify**:
- `backend/src/api/routes/users.route.ts`

---

### Team Routes

### T097: [P] Implement GET /teams route
**Type**: api | **Depends On**: T070, T081, T089 | **Parallel**: yes

**Acceptance Criteria**:
- [ ] Route handler calls TeamService.listTeams()
- [ ] Returns 200 with array of Team
- [ ] Contract test T033 PASSES

**Files to Create**:
- `backend/src/api/routes/teams.route.ts`

---

### T098: Implement POST /teams route
**Type**: api | **Depends On**: T097 | **Parallel**: no (same file)

**Acceptance Criteria**:
- [ ] Route handler calls TeamService.createTeam()
- [ ] Validation middleware applied
- [ ] Returns 201 with Team
- [ ] Contract test T034 PASSES

**Files to Modify**:
- `backend/src/api/routes/teams.route.ts`

---

### T099: Implement GET /teams/{teamId} route
**Type**: api | **Depends On**: T097 | **Parallel**: no (same file)

**Acceptance Criteria**:
- [ ] Route handler calls TeamService.getTeam()
- [ ] Authorization: team member only
- [ ] Returns 200 with Team
- [ ] Contract test T035 PASSES

**Files to Modify**:
- `backend/src/api/routes/teams.route.ts`

---

### T100: Implement PATCH /teams/{teamId} route
**Type**: api | **Depends On**: T097, T082 | **Parallel**: no (same file)

**Acceptance Criteria**:
- [ ] Route handler calls TeamService.updateTeam()
- [ ] Authorization: admin only
- [ ] Returns 200
- [ ] Contract test T036 PASSES

**Files to Modify**:
- `backend/src/api/routes/teams.route.ts`

---

### T101: Implement DELETE /teams/{teamId} route
**Type**: api | **Depends On**: T097, T082 | **Parallel**: no (same file)

**Acceptance Criteria**:
- [ ] Route handler calls TeamService.deleteTeam()
- [ ] Authorization: admin only
- [ ] Returns 204
- [ ] Contract test T037 PASSES

**Files to Modify**:
- `backend/src/api/routes/teams.route.ts`

---

### T102: Implement GET /teams/{teamId}/members route
**Type**: api | **Depends On**: T097 | **Parallel**: no (same file)

**Acceptance Criteria**:
- [ ] Route handler calls TeamService.listMembers()
- [ ] Authorization: team member
- [ ] Returns 200 with array of TeamMember
- [ ] Contract test T038 PASSES

**Files to Modify**:
- `backend/src/api/routes/teams.route.ts`

---

### T103: Implement POST /teams/{teamId}/members route
**Type**: api | **Depends On**: T097, T082 | **Parallel**: no (same file)

**Acceptance Criteria**:
- [ ] Route handler calls TeamService.addMember()
- [ ] Authorization: admin only
- [ ] Returns 201
- [ ] Contract test T039 PASSES

**Files to Modify**:
- `backend/src/api/routes/teams.route.ts`

---

### Project Routes

### T104: [P] Implement GET /projects route
**Type**: api | **Depends On**: T071, T081, T089 | **Parallel**: yes

**Acceptance Criteria**:
- [ ] Route handler calls ProjectService.listProjects()
- [ ] Query params: teamId, archived
- [ ] Returns 200 with array of Project
- [ ] Contract test T040 PASSES

**Files to Create**:
- `backend/src/api/routes/projects.route.ts`

---

### T105: Implement POST /projects route
**Type**: api | **Depends On**: T104 | **Parallel**: no (same file)

**Acceptance Criteria**:
- [ ] Route handler calls ProjectService.createProject()
- [ ] Validation middleware applied
- [ ] Returns 201 with Project
- [ ] Contract test T041 PASSES

**Files to Modify**:
- `backend/src/api/routes/projects.route.ts`

---

### T106: Implement GET /projects/{projectId} route
**Type**: api | **Depends On**: T104, T082 | **Parallel**: no (same file)

**Acceptance Criteria**:
- [ ] Route handler calls ProjectService.getProject()
- [ ] Authorization: owner or team member
- [ ] Returns 200 with Project
- [ ] Contract test T042 PASSES

**Files to Modify**:
- `backend/src/api/routes/projects.route.ts`

---

### T107: Implement PATCH /projects/{projectId} route
**Type**: api | **Depends On**: T104, T082 | **Parallel**: no (same file)

**Acceptance Criteria**:
- [ ] Route handler calls ProjectService.updateProject()
- [ ] Authorization: owner only
- [ ] Returns 200
- [ ] Contract test T043 PASSES

**Files to Modify**:
- `backend/src/api/routes/projects.route.ts`

---

### T108: Implement DELETE /projects/{projectId} route
**Type**: api | **Depends On**: T104, T082 | **Parallel**: no (same file)

**Acceptance Criteria**:
- [ ] Route handler calls ProjectService.deleteProject()
- [ ] Authorization: owner only
- [ ] Returns 204
- [ ] Contract test T044 PASSES

**Files to Modify**:
- `backend/src/api/routes/projects.route.ts`

---

### Environment Routes

### T109: [P] Implement GET /environments route
**Type**: api | **Depends On**: T073, T081, T089 | **Parallel**: yes

**Acceptance Criteria**:
- [ ] Route handler calls EnvironmentService.listEnvironments()
- [ ] Query params: projectId, status, page, limit
- [ ] Returns 200 with paginated environments
- [ ] Contract test T045 PASSES

**Files to Create**:
- `backend/src/api/routes/environments.route.ts`

---

### T110: Implement POST /environments route
**Type**: api | **Depends On**: T109 | **Parallel**: no (same file)

**Acceptance Criteria**:
- [ ] Route handler calls EnvironmentService.createEnvironment()
- [ ] Validation middleware applied
- [ ] Handles ports, variables, extensions arrays
- [ ] Returns 201 with Environment
- [ ] Contract test T046 PASSES

**Files to Modify**:
- `backend/src/api/routes/environments.route.ts`

---

### T111: Implement GET /environments/{environmentId} route
**Type**: api | **Depends On**: T109, T082 | **Parallel**: no (same file)

**Acceptance Criteria**:
- [ ] Route handler calls EnvironmentService.getEnvironment()
- [ ] Authorization: project member
- [ ] Returns 200 with Environment
- [ ] Contract test T047 PASSES

**Files to Modify**:
- `backend/src/api/routes/environments.route.ts`

---

### T112: Implement PATCH /environments/{environmentId} route
**Type**: api | **Depends On**: T109, T082 | **Parallel**: no (same file)

**Acceptance Criteria**:
- [ ] Route handler calls EnvironmentService.updateEnvironment()
- [ ] Authorization: project owner or developer
- [ ] Returns 200
- [ ] Contract test T048 PASSES

**Files to Modify**:
- `backend/src/api/routes/environments.route.ts`

---

### T113: Implement DELETE /environments/{environmentId} route
**Type**: api | **Depends On**: T109, T082 | **Parallel**: no (same file)

**Acceptance Criteria**:
- [ ] Route handler calls EnvironmentService.deleteEnvironment()
- [ ] Authorization: project owner
- [ ] Cleanup Docker container
- [ ] Returns 204
- [ ] Contract test T049 PASSES

**Files to Modify**:
- `backend/src/api/routes/environments.route.ts`

---

### T114: Implement POST /environments/{environmentId}/start route
**Type**: api | **Depends On**: T109, T082 | **Parallel**: no (same file)

**Acceptance Criteria**:
- [ ] Route handler calls EnvironmentService.startEnvironment()
- [ ] Authorization: project member
- [ ] Returns 200 with updated Environment
- [ ] Contract test T050 PASSES

**Files to Modify**:
- `backend/src/api/routes/environments.route.ts`

---

### T115: Implement POST /environments/{environmentId}/stop route
**Type**: api | **Depends On**: T109, T082 | **Parallel**: no (same file)

**Acceptance Criteria**:
- [ ] Route handler calls EnvironmentService.stopEnvironment()
- [ ] Authorization: project member
- [ ] Returns 200 with updated Environment
- [ ] Contract test T051 PASSES

**Files to Modify**:
- `backend/src/api/routes/environments.route.ts`

---

### T116: Implement POST /environments/{environmentId}/ports route
**Type**: api | **Depends On**: T109 | **Parallel**: no (same file)

**Acceptance Criteria**:
- [ ] Route handler adds port mapping
- [ ] Validation applied
- [ ] Returns 201
- [ ] Contract test T052 PASSES

**Files to Modify**:
- `backend/src/api/routes/environments.route.ts`

---

### T117: Implement GET /environments/{environmentId}/variables route
**Type**: api | **Depends On**: T109, T078 | **Parallel**: no (same file)

**Acceptance Criteria**:
- [ ] Route handler lists environment variables
- [ ] Encrypted values not exposed (mask or exclude)
- [ ] Returns 200
- [ ] Contract test T053 PASSES

**Files to Modify**:
- `backend/src/api/routes/environments.route.ts`

---

### T118: Implement POST /environments/{environmentId}/variables route
**Type**: api | **Depends On**: T109, T078 | **Parallel**: no (same file)

**Acceptance Criteria**:
- [ ] Route handler adds environment variable
- [ ] Auto-encrypt sensitive patterns
- [ ] Returns 201
- [ ] Contract test T054 PASSES

**Files to Modify**:
- `backend/src/api/routes/environments.route.ts`

---

### Session Routes

### T119: [P] Implement GET /environments/{environmentId}/sessions route
**Type**: api | **Depends On**: T074, T081, T089 | **Parallel**: yes

**Acceptance Criteria**:
- [ ] Route handler calls SessionService.listSessions()
- [ ] Authorization: environment access
- [ ] Returns 200 with array of Session
- [ ] Contract test T055 PASSES

**Files to Create**:
- `backend/src/api/routes/sessions.route.ts`

---

### T120: Implement POST /environments/{environmentId}/sessions route
**Type**: api | **Depends On**: T119 | **Parallel**: no (same file)

**Acceptance Criteria**:
- [ ] Route handler calls SessionService.createSession()
- [ ] Validation applied (sessionType, sessionName)
- [ ] Returns 201 with Session
- [ ] Contract test T056 PASSES

**Files to Modify**:
- `backend/src/api/routes/sessions.route.ts`

---

### T121: Implement DELETE /sessions/{sessionId} route
**Type**: api | **Depends On**: T119, T082 | **Parallel**: no (same file)

**Acceptance Criteria**:
- [ ] Route handler calls SessionService.terminateSession()
- [ ] Authorization: environment access
- [ ] Returns 204
- [ ] Contract test T057 PASSES

**Files to Modify**:
- `backend/src/api/routes/sessions.route.ts`

---

### Extension Routes

### T122: [P] Implement GET /extensions route
**Type**: api | **Depends On**: T075, T081, T089 | **Parallel**: yes

**Acceptance Criteria**:
- [ ] Route handler calls ExtensionService.searchExtensions()
- [ ] Query params: query, publisher
- [ ] Returns 200 with array of Extension
- [ ] Contract test T058 PASSES

**Files to Create**:
- `backend/src/api/routes/extensions.route.ts`

---

### T123: Implement GET /environments/{environmentId}/extensions route
**Type**: api | **Depends On**: T122 | **Parallel**: no (same file)

**Acceptance Criteria**:
- [ ] Route handler calls ExtensionService.listInstalledExtensions()
- [ ] Authorization: environment access
- [ ] Returns 200 with array of EnvironmentExtension
- [ ] Contract test T059 PASSES

**Files to Modify**:
- `backend/src/api/routes/extensions.route.ts`

---

### T124: Implement POST /environments/{environmentId}/extensions route
**Type**: api | **Depends On**: T122, T082 | **Parallel**: no (same file)

**Acceptance Criteria**:
- [ ] Route handler calls ExtensionService.installExtension()
- [ ] Authorization: environment access
- [ ] Returns 202 (async installation)
- [ ] Contract test T060 PASSES

**Files to Modify**:
- `backend/src/api/routes/extensions.route.ts`

---

### T125: Implement DELETE /environments/{environmentId}/extensions/{extensionId} route
**Type**: api | **Depends On**: T122, T082 | **Parallel**: no (same file)

**Acceptance Criteria**:
- [ ] Route handler calls ExtensionService.uninstallExtension()
- [ ] Authorization: environment access
- [ ] Returns 202 (async uninstallation)
- [ ] Contract test T061 PASSES

**Files to Modify**:
- `backend/src/api/routes/extensions.route.ts`

---

### Log Routes

### T126: [P] Implement GET /environments/{environmentId}/logs route
**Type**: api | **Depends On**: T076, T081, T089 | **Parallel**: yes

**Acceptance Criteria**:
- [ ] Route handler calls LogService.getLogs()
- [ ] Query params: since, until, tail, stream
- [ ] Authorization: environment access
- [ ] Returns 200 with array of LogEntry
- [ ] Contract test T062 PASSES

**Files to Create**:
- `backend/src/api/routes/logs.route.ts`

---

## Phase 3.7: WebSocket Handlers (T127-T130)

### T127: Implement WebSocket log streaming handler
**Type**: websocket | **Depends On**: T077, T076 | **Parallel**: no

**Description**: Implement WebSocket endpoint for real-time log streaming per websocket-spec.md.

**Acceptance Criteria**:
- [ ] Endpoint: /ws/environments/{environmentId}/logs
- [ ] Authentication via token query param
- [ ] Send historical logs on connect
- [ ] Stream new logs in real-time
- [ ] Handle client control messages (pause, resume, filter)
- [ ] Fan-out pattern (1 Docker stream to N clients)
- [ ] Contract test T063 PASSES

**Files to Create**:
- `backend/src/api/websocket/logs.handler.ts`

---

### T128: Implement WebSocket terminal (PTY) handler
**Type**: websocket | **Depends On**: T077, T074, T072 | **Parallel**: no

**Description**: Implement WebSocket endpoint for terminal interaction per websocket-spec.md.

**Acceptance Criteria**:
- [ ] Endpoint: /ws/environments/{environmentId}/terminal
- [ ] Authentication via token query param
- [ ] Attach to container shell via dockerode
- [ ] Bidirectional data streaming (input/output)
- [ ] Handle resize messages
- [ ] Session tracking and cleanup
- [ ] Contract test T064 PASSES

**Files to Create**:
- `backend/src/api/websocket/terminal.handler.ts`

---

### T129: Implement WebSocket status updates handler
**Type**: websocket | **Depends On**: T077, T073 | **Parallel**: no

**Description**: Implement WebSocket endpoint for environment status updates per websocket-spec.md.

**Acceptance Criteria**:
- [ ] Endpoint: /ws/environments/{environmentId}/status
- [ ] Authentication via token query param
- [ ] Send current status on connect
- [ ] Push status updates when environment state changes
- [ ] Optional metrics updates (CPU, memory)
- [ ] Contract test T065 PASSES

**Files to Create**:
- `backend/src/api/websocket/status.handler.ts`

---

### T130: Implement WebSocket rate limiting and security
**Type**: websocket | **Depends On**: T127-T129 | **Parallel**: no

**Description**: Add rate limiting and security features to WebSocket handlers per websocket-spec.md.

**Acceptance Criteria**:
- [ ] Connection limits per user (100 concurrent)
- [ ] Connection limits per environment (50 concurrent)
- [ ] Message rate limiting enforcement
- [ ] Message size limits (64KB)
- [ ] Automatic cleanup on suspicious activity
- [ ] Contract test T066 PASSES

**Files to Modify**:
- `backend/src/api/websocket/*.handler.ts`
- `backend/src/services/websocket.service.ts`

---

## Phase 3.8: Frontend Core Setup (T131-T145)

### T131: Create React app structure
**Type**: frontend | **Depends On**: T003 | **Parallel**: no

**Description**: Set up React app with routing and initial structure.

**Acceptance Criteria**:
- [ ] React Router configured
- [ ] Route structure defined (/, /login, /dashboard, /projects/:id, /environments/:id)
- [ ] Layout components placeholder
- [ ] Entry point (main.tsx)

**Files to Create**:
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/routes.tsx`
- `frontend/index.html`

---

### T132: [P] Create API client service
**Type**: frontend | **Depends On**: T003, T010 | **Parallel**: yes

**Description**: Create typed API client for backend communication using shared types.

**Acceptance Criteria**:
- [ ] Fetch wrapper with error handling
- [ ] JWT token management (attach to requests)
- [ ] Response parsing and validation
- [ ] Methods for all API endpoints
- [ ] TypeScript types from shared package

**Files to Create**:
- `frontend/src/services/api.service.ts`
- `frontend/src/lib/fetch-client.ts`

---

### T133: [P] Create WebSocket client service
**Type**: frontend | **Depends On**: T003 | **Parallel**: yes

**Description**: Create WebSocket client with reconnection logic.

**Acceptance Criteria**:
- [ ] WebSocket connection management
- [ ] Automatic reconnection with exponential backoff
- [ ] Message parsing and routing
- [ ] Connection state tracking
- [ ] Token authentication support

**Files to Create**:
- `frontend/src/services/websocket.service.ts`
- `frontend/src/lib/websocket-client.ts`

---

### T134: Create authentication context and hooks
**Type**: frontend | **Depends On**: T132 | **Parallel**: no

**Description**: Implement React Context for authentication state.

**Acceptance Criteria**:
- [ ] AuthContext with user state
- [ ] Methods: login(), register(), logout(), refreshToken()
- [ ] Persist tokens in localStorage/cookies
- [ ] Protected route wrapper
- [ ] useAuth() hook

**Files to Create**:
- `frontend/src/context/AuthContext.tsx`
- `frontend/src/hooks/useAuth.ts`
- `frontend/src/components/ProtectedRoute.tsx`

---

### T135: [P] Create theme context
**Type**: frontend | **Depends On**: T003 | **Parallel**: yes

**Description**: Set up Material-UI theme with light/dark mode support.

**Acceptance Criteria**:
- [ ] Material-UI ThemeProvider configured
- [ ] Light/dark theme definitions
- [ ] Theme toggle functionality
- [ ] Persist theme preference
- [ ] useTheme() hook

**Files to Create**:
- `frontend/src/context/ThemeContext.tsx`
- `frontend/src/theme/index.ts`
- `frontend/src/hooks/useTheme.ts`

---

### T136: [P] Create notification context (toast/snackbar)
**Type**: frontend | **Depends On**: T003 | **Parallel**: yes

**Description**: Implement global notification system for user feedback.

**Acceptance Criteria**:
- [ ] NotificationContext with show/hide methods
- [ ] Material-UI Snackbar integration
- [ ] Types: success, error, warning, info
- [ ] Auto-dismiss after timeout
- [ ] useNotification() hook

**Files to Create**:
- `frontend/src/context/NotificationContext.tsx`
- `frontend/src/hooks/useNotification.ts`

---

### T137: Create layout components
**Type**: frontend | **Depends On**: T131, T134 | **Parallel**: no

**Description**: Create main layout components (navbar, sidebar, footer).

**Acceptance Criteria**:
- [ ] MainLayout with navbar + sidebar + content area
- [ ] Navbar: logo, user menu, theme toggle
- [ ] Sidebar: navigation links (Dashboard, Projects, Teams)
- [ ] Responsive design (collapse sidebar on mobile)
- [ ] Footer component

**Files to Create**:
- `frontend/src/components/layout/MainLayout.tsx`
- `frontend/src/components/layout/Navbar.tsx`
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/components/layout/Footer.tsx`

---

### T138: [P] Create loading and error boundary components
**Type**: frontend | **Depends On**: T003 | **Parallel**: yes

**Description**: Create reusable loading and error handling components.

**Acceptance Criteria**:
- [ ] LoadingSpinner component
- [ ] LoadingOverlay component
- [ ] ErrorBoundary component (React error boundary)
- [ ] ErrorMessage component (display API errors)

**Files to Create**:
- `frontend/src/components/common/LoadingSpinner.tsx`
- `frontend/src/components/common/ErrorBoundary.tsx`
- `frontend/src/components/common/ErrorMessage.tsx`

---

### T139: Create login page
**Type**: frontend | **Depends On**: T134, T137 | **Parallel**: no

**Description**: Implement login page with email/password and OAuth options.

**Acceptance Criteria**:
- [ ] Email/password login form
- [ ] Form validation (email format, required fields)
- [ ] OAuth buttons (GitHub, Google)
- [ ] Error display
- [ ] Redirect to dashboard on success
- [ ] Link to registration page

**Files to Create**:
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/components/auth/LoginForm.tsx`

---

### T140: [P] Create registration page
**Type**: frontend | **Depends On**: T134, T137 | **Parallel**: yes

**Description**: Implement registration page.

**Acceptance Criteria**:
- [ ] Registration form (email, password, displayName)
- [ ] Form validation (password strength, email format)
- [ ] Error display
- [ ] Redirect to dashboard on success
- [ ] Link to login page

**Files to Create**:
- `frontend/src/pages/RegisterPage.tsx`
- `frontend/src/components/auth/RegisterForm.tsx`

---

### T141: [P] Create user profile page
**Type**: frontend | **Depends On**: T134, T137 | **Parallel**: yes

**Description**: Implement user profile edit page.

**Acceptance Criteria**:
- [ ] Profile form (displayName, avatarUrl, timezone, locale, sshPublicKey)
- [ ] Form validation
- [ ] Save button with loading state
- [ ] Success/error notifications
- [ ] Avatar upload (optional)

**Files to Create**:
- `frontend/src/pages/ProfilePage.tsx`
- `frontend/src/components/profile/ProfileForm.tsx`

---

### T142: Create dashboard page skeleton
**Type**: frontend | **Depends On**: T137 | **Parallel**: no

**Description**: Create dashboard page with placeholder for environment cards.

**Acceptance Criteria**:
- [ ] Dashboard page component
- [ ] Page title and actions
- [ ] Grid layout for environment cards
- [ ] Empty state message
- [ ] Loading state

**Files to Create**:
- `frontend/src/pages/DashboardPage.tsx`

---

### T143: [P] Create projects list page skeleton
**Type**: frontend | **Depends On**: T137 | **Parallel**: yes

**Description**: Create projects list page with placeholder.

**Acceptance Criteria**:
- [ ] Projects list page component
- [ ] Create project button
- [ ] Empty state message
- [ ] Loading state

**Files to Create**:
- `frontend/src/pages/ProjectsPage.tsx`

---

### T144: [P] Create teams list page skeleton
**Type**: frontend | **Depends On**: T137 | **Parallel**: yes

**Description**: Create teams list page with placeholder.

**Acceptance Criteria**:
- [ ] Teams list page component
- [ ] Create team button
- [ ] Empty state message
- [ ] Loading state

**Files to Create**:
- `frontend/src/pages/TeamsPage.tsx`

---

### T145: [P] Create settings page
**Type**: frontend | **Depends On**: T137 | **Parallel**: yes

**Description**: Create settings page for user preferences.

**Acceptance Criteria**:
- [ ] Settings page with tabs (Profile, Preferences, Security)
- [ ] Placeholder sections for each tab
- [ ] Navigation between tabs

**Files to Create**:
- `frontend/src/pages/SettingsPage.tsx`

---

## Phase 3.9: Frontend Feature Components (T146-T170)

### T146: Create environment card component
**Type**: frontend | **Depends On**: T142, T132 | **Parallel**: no

**Description**: Create environment card for dashboard display.

**Acceptance Criteria**:
- [ ] Environment card displays: name, status, base image
- [ ] Status badge with color coding (running=green, stopped=gray, error=red)
- [ ] Quick actions: Start, Stop, View Details
- [ ] Last activity timestamp
- [ ] Click to navigate to environment detail page

**Files to Create**:
- `frontend/src/components/environment/EnvironmentCard.tsx`

---

### T147: Integrate environment list in dashboard
**Type**: frontend | **Depends On**: T146, T132 | **Parallel**: no

**Description**: Fetch and display environments on dashboard using API client.

**Acceptance Criteria**:
- [ ] Fetch environments on page load
- [ ] Display environment cards in grid
- [ ] Loading state while fetching
- [ ] Error handling and display
- [ ] Empty state when no environments
- [ ] Filter by project (query param)

**Files to Modify**:
- `frontend/src/pages/DashboardPage.tsx`

---

### T148: Create project form component
**Type**: frontend | **Depends On**: T143, T132 | **Parallel**: no

**Description**: Create project creation/edit form.

**Acceptance Criteria**:
- [ ] Form fields: name, slug, description, teamId (optional)
- [ ] Form validation (slug format)
- [ ] Owner selection: Personal or Team (dropdown)
- [ ] Submit button with loading state
- [ ] Success/error notifications

**Files to Create**:
- `frontend/src/components/project/ProjectForm.tsx`
- `frontend/src/components/project/ProjectFormDialog.tsx`

---

### T149: Integrate projects list page
**Type**: frontend | **Depends On**: T148, T132 | **Parallel**: no

**Description**: Fetch and display projects with create/edit/delete actions.

**Acceptance Criteria**:
- [ ] Fetch projects on page load
- [ ] Display projects in list/grid
- [ ] Create project dialog
- [ ] Edit project action
- [ ] Delete project action with confirmation
- [ ] Archive/unarchive toggle
- [ ] Filter by team

**Files to Modify**:
- `frontend/src/pages/ProjectsPage.tsx`

---

### T150: Create environment form component
**Type**: frontend | **Depends On**: T132 | **Parallel**: no

**Description**: Create environment creation/edit form with multi-step wizard.

**Acceptance Criteria**:
- [ ] Step 1: Basic info (name, slug, description, baseImage)
- [ ] Step 2: Resource limits (CPU, memory, storage)
- [ ] Step 3: Port mappings (add/remove ports)
- [ ] Step 4: Environment variables (add/remove, mark as encrypted)
- [ ] Step 5: Extensions (search and select)
- [ ] Form validation at each step
- [ ] Navigation between steps
- [ ] Submit button

**Files to Create**:
- `frontend/src/components/environment/EnvironmentForm.tsx`
- `frontend/src/components/environment/EnvironmentFormWizard.tsx`

---

### T151: Create environment detail page
**Type**: frontend | **Depends On**: T132, T137 | **Parallel**: no

**Description**: Create environment detail page with tabs.

**Acceptance Criteria**:
- [ ] Page displays environment info (name, status, base image, resource limits)
- [ ] Tabs: Overview, Logs, Terminal, Sessions, Extensions, Settings
- [ ] Overview tab: Status, actions (start/stop/restart/delete), basic info
- [ ] Actions with loading states and confirmations
- [ ] Real-time status updates via WebSocket

**Files to Create**:
- `frontend/src/pages/EnvironmentDetailPage.tsx`
- `frontend/src/components/environment/EnvironmentOverview.tsx`

---

### T152: Create log viewer component
**Type**: frontend | **Depends On**: T133, T151 | **Parallel**: no

**Description**: Create log viewer component with virtual scrolling for Logs tab.

**Acceptance Criteria**:
- [ ] Display logs with timestamps
- [ ] Color coding for stdout (white/gray) and stderr (red)
- [ ] Virtual scrolling for performance (react-window or similar)
- [ ] Auto-scroll to bottom for new logs (toggle)
- [ ] Filter: stdout, stderr, all
- [ ] Search/filter logs by text
- [ ] WebSocket integration for real-time streaming
- [ ] Reconnection on disconnect

**Files to Create**:
- `frontend/src/components/logs/LogViewer.tsx`
- `frontend/src/hooks/useLogStream.ts`

---

### T153: Integrate log viewer in environment detail page
**Type**: frontend | **Depends On**: T152 | **Parallel**: no

**Description**: Add log viewer to Logs tab in environment detail page.

**Acceptance Criteria**:
- [ ] Logs tab displays LogViewer component
- [ ] Fetch historical logs on tab open
- [ ] Stream new logs via WebSocket
- [ ] Handle environment status (disable streaming if stopped)

**Files to Modify**:
- `frontend/src/pages/EnvironmentDetailPage.tsx`

---

### T154: Create terminal component
**Type**: frontend | **Depends On**: T133, T151 | **Parallel**: no

**Description**: Create terminal component using xterm.js for Terminal tab.

**Acceptance Criteria**:
- [ ] xterm.js terminal integration
- [ ] WebSocket connection for bidirectional communication
- [ ] Terminal resizing on window resize
- [ ] Copy/paste support
- [ ] ANSI color rendering
- [ ] Reconnection on disconnect
- [ ] Loading state while connecting
- [ ] Error display on connection failure

**Files to Create**:
- `frontend/src/components/terminal/Terminal.tsx`
- `frontend/src/hooks/useTerminal.ts`

---

### T155: Integrate terminal in environment detail page
**Type**: frontend | **Depends On**: T154 | **Parallel**: no

**Description**: Add terminal to Terminal tab in environment detail page.

**Acceptance Criteria**:
- [ ] Terminal tab displays Terminal component
- [ ] Connect on tab open
- [ ] Disconnect on tab close or environment stop
- [ ] Handle environment status (disable if stopped)

**Files to Modify**:
- `frontend/src/pages/EnvironmentDetailPage.tsx`

---

### T156: Create session list component
**Type**: frontend | **Depends On**: T132, T151 | **Parallel**: no

**Description**: Create session list component for Sessions tab.

**Acceptance Criteria**:
- [ ] Display list of sessions (type, name, status, PID, last activity)
- [ ] Create session button (opens dialog)
- [ ] Attach to session action (opens terminal with session)
- [ ] Terminate session action with confirmation
- [ ] Auto-refresh session list

**Files to Create**:
- `frontend/src/components/session/SessionList.tsx`
- `frontend/src/components/session/CreateSessionDialog.tsx`

---

### T157: Integrate sessions in environment detail page
**Type**: frontend | **Depends On**: T156 | **Parallel**: no

**Description**: Add session list to Sessions tab in environment detail page.

**Acceptance Criteria**:
- [ ] Sessions tab displays SessionList component
- [ ] Fetch sessions on tab open
- [ ] Handle session creation and termination
- [ ] Navigate to terminal tab with session attached

**Files to Modify**:
- `frontend/src/pages/EnvironmentDetailPage.tsx`

---

### T158: Create extension search and install component
**Type**: frontend | **Depends On**: T132, T151 | **Parallel**: no

**Description**: Create extension management component for Extensions tab.

**Acceptance Criteria**:
- [ ] Search box for extension search (VS Code Marketplace)
- [ ] Display search results (name, publisher, description, icon)
- [ ] Install button per result
- [ ] List of installed extensions with status (pending, installing, installed, failed)
- [ ] Uninstall button per installed extension
- [ ] Real-time status updates (polling or WebSocket)

**Files to Create**:
- `frontend/src/components/extension/ExtensionManager.tsx`
- `frontend/src/components/extension/ExtensionSearchResults.tsx`
- `frontend/src/components/extension/InstalledExtensionsList.tsx`

---

### T159: Integrate extensions in environment detail page
**Type**: frontend | **Depends On**: T158 | **Parallel**: no

**Description**: Add extension manager to Extensions tab in environment detail page.

**Acceptance Criteria**:
- [ ] Extensions tab displays ExtensionManager component
- [ ] Fetch installed extensions on tab open
- [ ] Handle extension installation/uninstallation

**Files to Modify**:
- `frontend/src/pages/EnvironmentDetailPage.tsx`

---

### T160: Create environment settings tab
**Type**: frontend | **Depends On**: T151, T132 | **Parallel**: no

**Description**: Create settings tab in environment detail page for editing environment configuration.

**Acceptance Criteria**:
- [ ] Edit basic info (name, description)
- [ ] Edit resource limits (CPU, memory, storage)
- [ ] Port mappings management (add, remove)
- [ ] Environment variables management (add, remove, edit, encryption toggle)
- [ ] Save button with confirmation
- [ ] Validation and error handling

**Files to Create**:
- `frontend/src/components/environment/EnvironmentSettings.tsx`

**Files to Modify**:
- `frontend/src/pages/EnvironmentDetailPage.tsx`

---

### T161: Create team form component
**Type**: frontend | **Depends On**: T144, T132 | **Parallel**: no

**Description**: Create team creation/edit form.

**Acceptance Criteria**:
- [ ] Form fields: name, slug, description
- [ ] Form validation (slug format)
- [ ] Submit button with loading state
- [ ] Success/error notifications

**Files to Create**:
- `frontend/src/components/team/TeamForm.tsx`
- `frontend/src/components/team/TeamFormDialog.tsx`

---

### T162: Create team detail page
**Type**: frontend | **Depends On**: T144, T132 | **Parallel**: no

**Description**: Create team detail page with members list and projects.

**Acceptance Criteria**:
- [ ] Team info display (name, description, avatar)
- [ ] Members list with roles
- [ ] Add member button (opens dialog)
- [ ] Remove member action (admin only)
- [ ] Change member role action (admin only)
- [ ] Team projects list
- [ ] Edit team button (admin only)
- [ ] Delete team button (admin only)

**Files to Create**:
- `frontend/src/pages/TeamDetailPage.tsx`
- `frontend/src/components/team/TeamMembersList.tsx`
- `frontend/src/components/team/AddMemberDialog.tsx`

---

### T163: Integrate teams list page
**Type**: frontend | **Depends On**: T161, T162, T132 | **Parallel**: no

**Description**: Fetch and display teams with create/edit actions.

**Acceptance Criteria**:
- [ ] Fetch teams on page load
- [ ] Display teams in list/grid
- [ ] Create team dialog
- [ ] Click team to navigate to detail page

**Files to Modify**:
- `frontend/src/pages/TeamsPage.tsx`

---

### T164: Create project detail page
**Type**: frontend | **Depends On**: T143, T132 | **Parallel**: no

**Description**: Create project detail page with environments list.

**Acceptance Criteria**:
- [ ] Project info display (name, description, owner)
- [ ] Environments list for this project (reuse EnvironmentCard)
- [ ] Create environment button (opens wizard)
- [ ] Edit project button (owner only)
- [ ] Delete project button (owner only) with confirmation
- [ ] Archive toggle (owner only)

**Files to Create**:
- `frontend/src/pages/ProjectDetailPage.tsx`

---

### T165: [P] Create status indicator component
**Type**: frontend | **Depends On**: T003 | **Parallel**: yes

**Description**: Create reusable status indicator component with color coding.

**Acceptance Criteria**:
- [ ] Display status with appropriate color
- [ ] Support statuses: stopped, starting, running, stopping, error
- [ ] Icon + text display
- [ ] Pulsing animation for transient states (starting, stopping)

**Files to Create**:
- `frontend/src/components/common/StatusIndicator.tsx`

---

### T166: [P] Create confirmation dialog component
**Type**: frontend | **Depends On**: T003 | **Parallel**: yes

**Description**: Create reusable confirmation dialog for destructive actions.

**Acceptance Criteria**:
- [ ] Confirmation dialog with title, message, and actions
- [ ] Confirm and cancel buttons
- [ ] Optional: Require typing confirmation text for critical actions

**Files to Create**:
- `frontend/src/components/common/ConfirmDialog.tsx`

---

### T167: Implement real-time status updates across pages
**Type**: frontend | **Depends On**: T133, T147, T151 | **Parallel**: no

**Description**: Add WebSocket status updates to dashboard and environment pages.

**Acceptance Criteria**:
- [ ] Dashboard environment cards update in real-time
- [ ] Environment detail page updates in real-time
- [ ] Status changes trigger UI updates (badges, action buttons)
- [ ] WebSocket connection shared across components (context or hook)

**Files to Create**:
- `frontend/src/hooks/useEnvironmentStatus.ts`

**Files to Modify**:
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/EnvironmentDetailPage.tsx`

---

### T168: [P] Create breadcrumb navigation component
**Type**: frontend | **Depends On**: T137 | **Parallel**: yes

**Description**: Create breadcrumb component for page navigation.

**Acceptance Criteria**:
- [ ] Displays breadcrumb trail (Home > Projects > Project Name > Environment Name)
- [ ] Clickable breadcrumb items navigate back
- [ ] Auto-generates from route

**Files to Create**:
- `frontend/src/components/common/Breadcrumb.tsx`

**Files to Modify**:
- `frontend/src/components/layout/MainLayout.tsx`

---

### T169: [P] Create empty state component
**Type**: frontend | **Depends On**: T003 | **Parallel**: yes

**Description**: Create reusable empty state component for lists.

**Acceptance Criteria**:
- [ ] Displays icon, title, description
- [ ] Optional action button (e.g., "Create your first project")
- [ ] Reusable across different pages

**Files to Create**:
- `frontend/src/components/common/EmptyState.tsx`

---

### T170: Add pagination component and logic
**Type**: frontend | **Depends On**: T147 | **Parallel**: no

**Description**: Create pagination component and integrate with environment list.

**Acceptance Criteria**:
- [ ] Pagination component (Material-UI Pagination)
- [ ] Page change handlers
- [ ] Integrate with GET /environments pagination
- [ ] Display total count

**Files to Create**:
- `frontend/src/components/common/Pagination.tsx`

**Files to Modify**:
- `frontend/src/pages/DashboardPage.tsx`

---

## Phase 3.10: Integration & E2E Tests (T171-T185)

**Note**: E2E tests based on quickstart.md validation scenarios using Playwright.

### T171: [P] E2E test: User registration and authentication
**Type**: test | **Depends On**: T008, T139, T140 | **Parallel**: yes

**Description**: E2E test for Scenario 1 from quickstart.md.

**Acceptance Criteria**:
- [ ] Test user registration flow
- [ ] Test login flow
- [ ] Test OAuth login (GitHub/Google)
- [ ] Test redirect to dashboard
- [ ] Test profile display

**Files to Create**:
- `frontend/tests/e2e/auth.spec.ts`

---

### T172: [P] E2E test: Create team and invite member
**Type**: test | **Depends On**: T008, T162, T163 | **Parallel**: yes

**Description**: E2E test for Scenario 2 from quickstart.md.

**Acceptance Criteria**:
- [ ] Test team creation
- [ ] Test team member invitation
- [ ] Test team page display

**Files to Create**:
- `frontend/tests/e2e/teams.spec.ts`

---

### T173: [P] E2E test: Create project
**Type**: test | **Depends On**: T008, T149, T164 | **Parallel**: yes

**Description**: E2E test for Scenario 3 from quickstart.md.

**Acceptance Criteria**:
- [ ] Test personal project creation
- [ ] Test team project creation
- [ ] Test project appears in list
- [ ] Test navigate to project page

**Files to Create**:
- `frontend/tests/e2e/projects.spec.ts`

---

### T174: [P] E2E test: Create environment
**Type**: test | **Depends On**: T008, T150, T151 | **Parallel**: yes

**Description**: E2E test for Scenario 4 from quickstart.md.

**Acceptance Criteria**:
- [ ] Test environment creation wizard
- [ ] Test environment configuration (ports, env vars, extensions)
- [ ] Test environment appears in project

**Files to Create**:
- `frontend/tests/e2e/environment-create.spec.ts`

---

### T175: [P] E2E test: Start environment and view logs
**Type**: test | **Depends On**: T008, T151, T153 | **Parallel**: yes

**Description**: E2E test for Scenario 5 from quickstart.md.

**Acceptance Criteria**:
- [ ] Test start environment action
- [ ] Test status changes (stopped → starting → running)
- [ ] Test logs tab displays logs
- [ ] Test real-time log streaming

**Files to Create**:
- `frontend/tests/e2e/environment-start-logs.spec.ts`

---

### T176: [P] E2E test: Install VS Code extension
**Type**: test | **Depends On**: T008, T159 | **Parallel**: yes

**Description**: E2E test for Scenario 6 from quickstart.md.

**Acceptance Criteria**:
- [ ] Test extension search
- [ ] Test extension installation
- [ ] Test extension status updates (pending → installing → installed)

**Files to Create**:
- `frontend/tests/e2e/extensions.spec.ts`

---

### T177: [P] E2E test: Open embedded terminal
**Type**: test | **Depends On**: T008, T155 | **Parallel**: yes

**Description**: E2E test for Scenario 7 from quickstart.md.

**Acceptance Criteria**:
- [ ] Test terminal tab opens
- [ ] Test terminal connection
- [ ] Test command execution (node --version, pwd)
- [ ] Test terminal output displays

**Files to Create**:
- `frontend/tests/e2e/terminal.spec.ts`

---

### T178: [P] E2E test: Manage tmux session
**Type**: test | **Depends On**: T008, T157 | **Parallel**: yes

**Description**: E2E test for Scenario 8 from quickstart.md.

**Acceptance Criteria**:
- [ ] Test sessions tab displays auto-created session
- [ ] Test create tmux session
- [ ] Test attach to tmux session
- [ ] Test session list updates

**Files to Create**:
- `frontend/tests/e2e/sessions.spec.ts`

---

### T179: [P] E2E test: Stop environment
**Type**: test | **Depends On**: T008, T151 | **Parallel**: yes

**Description**: E2E test for Scenario 9 from quickstart.md.

**Acceptance Criteria**:
- [ ] Test stop environment action
- [ ] Test status changes (running → stopping → stopped)
- [ ] Test log stream disconnects
- [ ] Test terminal closes

**Files to Create**:
- `frontend/tests/e2e/environment-stop.spec.ts`

---

### T180: [P] E2E test: Environment restart and session recovery
**Type**: test | **Depends On**: T008, T151, T157 | **Parallel**: yes

**Description**: E2E test for Scenario 10 from quickstart.md.

**Acceptance Criteria**:
- [ ] Test restart environment
- [ ] Test sessions recreated
- [ ] Test terminal reconnects

**Files to Create**:
- `frontend/tests/e2e/environment-restart.spec.ts`

---

### T181: [P] E2E test: Filter environments by project
**Type**: test | **Depends On**: T008, T147 | **Parallel**: yes

**Description**: E2E test for Scenario 11 from quickstart.md.

**Acceptance Criteria**:
- [ ] Test create multiple projects
- [ ] Test project filter in dashboard
- [ ] Test environment counts per project

**Files to Create**:
- `frontend/tests/e2e/environment-filter.spec.ts`

---

### T182: [P] E2E test: Collaborative access (multi-user)
**Type**: test | **Depends On**: T008, T162, T151 | **Parallel**: yes

**Description**: E2E test for Scenario 12 from quickstart.md.

**Acceptance Criteria**:
- [ ] Test team member access to team environment
- [ ] Test real-time status sync between users
- [ ] Test shared terminal session (tmux)

**Files to Create**:
- `frontend/tests/e2e/collaboration.spec.ts`

---

### T183: [P] E2E test: Delete environment
**Type**: test | **Depends On**: T008, T151 | **Parallel**: yes

**Description**: E2E test for Scenario 13 from quickstart.md.

**Acceptance Criteria**:
- [ ] Test delete environment action
- [ ] Test confirmation dialog
- [ ] Test environment removed from list
- [ ] Test 404 when accessing deleted environment

**Files to Create**:
- `frontend/tests/e2e/environment-delete.spec.ts`

---

### T184: [P] E2E test: Error handling - Port conflict
**Type**: test | **Depends On**: T008, T151 | **Parallel**: yes

**Description**: E2E test for Scenario 14 from quickstart.md.

**Acceptance Criteria**:
- [ ] Test create two environments with same port mapping
- [ ] Test start first environment (success)
- [ ] Test start second environment (fails with error)
- [ ] Test error message displayed

**Files to Create**:
- `frontend/tests/e2e/error-handling.spec.ts`

---

### T185: Performance test: API response times
**Type**: test | **Depends On**: T091-T126 | **Parallel**: no

**Description**: Performance tests for API endpoints from quickstart.md.

**Acceptance Criteria**:
- [ ] Test GET /environments response time < 500ms
- [ ] Test POST /environments response time < 1000ms
- [ ] Test POST /environments/{id}/start response time < 2000ms
- [ ] Test GET /environments/{id}/logs response time < 500ms
- [ ] Run with realistic data volume (100 environments)

**Files to Create**:
- `backend/tests/performance/api-performance.test.ts`

---

## Phase 3.11: Documentation (T186-T196)

**Note**: All documentation files as specified in the original user request.

### T186: Create comprehensive CLAUDE.md (README)
**Type**: docs | **Depends On**: T001-T185 | **Parallel**: no

**Description**: Create comprehensive README explaining VibeBox is "vibe coded" with Claude Code and Spec Kit.

**Acceptance Criteria**:
- [ ] Introduction explaining "vibe coding" with Claude Code and Spec Kit
- [ ] Project overview and key features
- [ ] Architecture diagram (visual or ASCII)
- [ ] Technology stack summary
- [ ] Navigation links to all dedicated docs in .claude/
- [ ] Quick start guide reference
- [ ] Contributing guidelines reference
- [ ] License reference

**Files to Create**:
- `CLAUDE.md` (root)

---

### T187: [P] Create quick_start.md
**Type**: docs | **Depends On**: T001-T015 | **Parallel**: yes

**Description**: Create quick start guide for developers.

**Acceptance Criteria**:
- [ ] Prerequisites (Node.js 20+, Docker, PostgreSQL)
- [ ] Clone repository steps
- [ ] Environment setup (copy .env.example, configure)
- [ ] Database migration steps
- [ ] Start backend and frontend commands
- [ ] Access URLs (frontend, backend, API docs)
- [ ] First user registration
- [ ] Create first project and environment

**Files to Create**:
- `.claude/quick_start.md`

---

### T188: [P] Create specs.md
**Type**: docs | **Depends On**: plan.md, data-model.md, contracts/ | **Parallel**: yes

**Description**: Create Spec Kit contracts and resource models documentation.

**Acceptance Criteria**:
- [ ] Overview of Spec Kit approach
- [ ] Link to plan.md, data-model.md
- [ ] Summary of data models (10 entities)
- [ ] Summary of API contracts (REST + WebSocket)
- [ ] Entity relationships diagram (Mermaid or ASCII)
- [ ] Link to OpenAPI spec

**Files to Create**:
- `.claude/specs.md`

---

### T189: [P] Create api_reference.md
**Type**: docs | **Depends On**: T090, contracts/openapi.yaml | **Parallel**: yes

**Description**: Create API reference documentation.

**Acceptance Criteria**:
- [ ] Link to Swagger UI endpoint
- [ ] Authentication guide (JWT, OAuth)
- [ ] Base URL and versioning
- [ ] Endpoint summary by resource (Auth, Users, Teams, Projects, Environments, Sessions, Extensions, Logs)
- [ ] Example requests/responses for key endpoints
- [ ] Error codes and responses
- [ ] Rate limiting information

**Files to Create**:
- `.claude/api_reference.md`

---

### T190: [P] Create dev_workflow.md
**Type**: docs | **Depends On**: T014 | **Parallel**: yes

**Description**: Create PR/CI process and Coderabbit integration documentation.

**Acceptance Criteria**:
- [ ] GitHub workflow overview
- [ ] Branch naming conventions
- [ ] Pull request process
- [ ] Coderabbit review integration
- [ ] Auto-merge conditions (Coderabbit approval required)
- [ ] CI/CD pipeline steps (lint, test, build)
- [ ] Deployment process

**Files to Create**:
- `.claude/dev_workflow.md`

---

### T191: [P] Create tmux.md
**Type**: docs | **Depends On**: T074, T157 | **Parallel**: yes

**Description**: Create tmux session management guide.

**Acceptance Criteria**:
- [ ] tmux overview and benefits
- [ ] Creating tmux sessions in VibeBox
- [ ] Attaching to tmux sessions
- [ ] tmux commands reference (basic)
- [ ] Multi-user collaboration with tmux
- [ ] Session persistence and recovery

**Files to Create**:
- `.claude/tmux.md`

---

### T192: [P] Create extensions.md
**Type**: docs | **Depends On**: T075, T158 | **Parallel**: yes

**Description**: Create extension installation and registry management guide.

**Acceptance Criteria**:
- [ ] VS Code extension overview
- [ ] Searching and installing extensions via UI
- [ ] Custom extension registry (future feature)
- [ ] Extension installation process
- [ ] Troubleshooting extension issues

**Files to Create**:
- `.claude/extensions.md`

---

### T193: [P] Create logs.md
**Type**: docs | **Depends On**: T076, T152 | **Parallel**: yes

**Description**: Create log retention, filtering, and export guide.

**Acceptance Criteria**:
- [ ] Log retention policy (7 days, 20MB per environment)
- [ ] Log rotation details
- [ ] Real-time log streaming via WebSocket
- [ ] Log filtering (stdout, stderr, search)
- [ ] Log export (future feature)
- [ ] Accessing historical logs via API

**Files to Create**:
- `.claude/logs.md`

---

### T194: [P] Create faq.md
**Type**: docs | **Depends On**: T001-T185 | **Parallel**: yes

**Description**: Create FAQ with common questions and troubleshooting.

**Acceptance Criteria**:
- [ ] Common questions (What is VibeBox? How do I create an environment? How do I share an environment with my team?)
- [ ] Troubleshooting (Environment fails to start, Logs not streaming, Terminal not connecting, Performance issues)
- [ ] Solutions for common errors (port conflicts, authentication failures, Docker daemon errors)

**Files to Create**:
- `.claude/faq.md`

---

### T195: [P] Create license.md
**Type**: docs | **Depends On**: none | **Parallel**: yes

**Description**: Create licensing information document.

**Acceptance Criteria**:
- [ ] License type (e.g., MIT, Apache 2.0, or proprietary)
- [ ] Copyright information
- [ ] Third-party licenses (dependencies)
- [ ] License text

**Files to Create**:
- `.claude/license.md`
- `LICENSE` (root, if applicable)

---

### T196: Update CLAUDE.md with documentation links
**Type**: docs | **Depends On**: T186-T195 | **Parallel**: no

**Description**: Update main CLAUDE.md with proper navigation to all dedicated docs.

**Acceptance Criteria**:
- [ ] Documentation section in CLAUDE.md
- [ ] Links to all .claude/*.md files
- [ ] Brief description for each doc
- [ ] Table of contents (optional)

**Files to Modify**:
- `CLAUDE.md`

---

## Dependencies Summary

### Critical Paths:
1. **Setup → Models → Services → API → Frontend → E2E Tests → Documentation**
2. **Contract Tests MUST fail before implementation (TDD principle)**
3. **Backend API complete before frontend integration**
4. **All core features complete before documentation**

### Parallel Execution Examples:

```bash
# Example 1: Data Models (T016-T026 in parallel)
Task agent 1: "Create User model T016"
Task agent 2: "Create Team model T017"
Task agent 3: "Create UserTeam model T018"
Task agent 4: "Create Project model T019"
# ... etc

# Example 2: Contract Tests (T027-T066 in parallel)
Task agent 1: "Contract test POST /auth/register T027"
Task agent 2: "Contract test POST /auth/login T028"
Task agent 3: "Contract test GET /auth/oauth/{provider} T029"
# ... etc

# Example 3: E2E Tests (T171-T184 in parallel)
Task agent 1: "E2E test user registration T171"
Task agent 2: "E2E test create team T172"
Task agent 3: "E2E test create project T173"
# ... etc
```

---

## Validation Checklist

**Gate: Verify before marking tasks.md as complete**

- [x] All contracts from openapi.yaml have corresponding test tasks
- [x] All WebSocket specs have corresponding test tasks
- [x] All entities from data-model.md have model tasks
- [x] All tests come before implementation (TDD)
- [x] Parallel tasks [P] are truly independent (different files, no dependencies)
- [x] Each task specifies exact file paths
- [x] No task modifies same file as another [P] task
- [x] All documentation files from user request included (CLAUDE.md, quick_start.md, specs.md, api_reference.md, dev_workflow.md, tmux.md, extensions.md, logs.md, faq.md, license.md)
- [x] All quickstart.md scenarios have corresponding E2E test tasks
- [x] Task numbering is sequential (T001-T196)
- [x] Dependencies clearly specified

---

## Task Statistics

- **Total Tasks**: 196
- **Setup Tasks**: 15 (T001-T015)
- **Model Tasks**: 11 (T016-T026)
- **Contract Test Tasks**: 40 (T027-T066)
- **Service Tasks**: 14 (T067-T080)
- **API Middleware Tasks**: 10 (T081-T090)
- **API Route Tasks**: 36 (T091-T126)
- **WebSocket Tasks**: 4 (T127-T130)
- **Frontend Core Tasks**: 15 (T131-T145)
- **Frontend Feature Tasks**: 25 (T146-T170)
- **E2E Test Tasks**: 15 (T171-T185)
- **Documentation Tasks**: 11 (T186-T196)

**Estimated Total Time**:
- Solo developer: ~6-8 weeks
- Team of 3-5: ~2-3 weeks (with parallel execution)

---

**Status**: ✅ Task list complete and ready for `/implement` command or manual execution

**Next Steps**:
1. Review task list for completeness
2. Execute tasks sequentially or in parallel (where marked [P])
3. Commit after each task or logical group
4. Run tests continuously (contract tests → integration tests → E2E tests)
5. Update progress tracking as tasks complete
