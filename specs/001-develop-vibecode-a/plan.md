
# Implementation Plan: VibeCode - Dev Environment Management Tool

**Branch**: `001-develop-vibecode-a` | **Date**: 2025-09-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/Users/espen/Dev/vibebox/specs/001-develop-vibecode-a/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
VibeCode is a web-based development environment management tool that enables developers to create, manage, and collaborate on Docker-based development environments through a unified dashboard. The system provides real-time visibility into container status and logs, seamless VS Code extension management, embedded terminal access, and team collaboration features with role-based permissions. Key capabilities include multi-user environment sharing, automatic session management (tmux, VS Code Server), WebSocket-based log streaming, and support for up to 1,000+ environments across teams with configurable resource quotas.

## Technical Context
**Language/Version**: Node.js 20+ with TypeScript 5.x (backend), React 18+ with TypeScript 5.x (frontend)
**Primary Dependencies**: Fastify (backend API), dockerode (Docker API), React, xterm.js (terminal), WebSocket (log streaming), Passport.js (OAuth), PostgreSQL driver
**Storage**: PostgreSQL for user/project/environment metadata, Docker volumes for environment persistence, file-based log rotation (7-day retention, 20MB max)
**Testing**: Jest + Supertest (backend API), Jest + React Testing Library (frontend), Playwright (E2E)
**Target Platform**: Linux server (backend + Docker daemon), modern browsers (Chrome, Firefox, Safari)
**Project Type**: web (frontend + backend monorepo)
**Performance Goals**: Sub-second API response times for CRUD operations, <2s environment startup (excluding Docker spin-up), support 1,000+ total environments, 10 concurrent environments per user
**Constraints**: Real-time log streaming via WebSocket, collaborative multi-user access, 2 CPUs/4GB RAM per environment default quota, <200ms p95 for dashboard queries
**Scale/Scope**: Mid-sized organizations (100+ users, 1,000+ environments), team-based multi-tenancy, role-based access control

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: Constitution file is a template placeholder. Applying standard software engineering principles:

- **Modularity**: ✅ Backend services will be modular (Docker service, Auth service, Environment service, Log service)
- **Testability**: ✅ TDD approach with contract tests, unit tests, and E2E tests planned
- **Simplicity**: ✅ Using established patterns (REST API, WebSocket for streaming, standard OAuth)
- **Observability**: ✅ Structured logging, audit trails, real-time status monitoring required
- **Security**: ✅ Authentication (email/password + OAuth), role-based access control, isolated Docker containers
- **Performance**: ✅ Clear targets defined (sub-second API, <2s startup, quotas enforced)

**Initial Assessment**: PASS - No constitution violations. Standard web application architecture.

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
backend/
├── src/
│   ├── models/           # Database entities (User, Environment, Project, Session, etc.)
│   ├── services/         # Business logic (DockerService, AuthService, LogService, etc.)
│   ├── api/              # Fastify routes and handlers
│   ├── lib/              # Shared utilities (logger, config, validation)
│   └── types/            # TypeScript type definitions
├── tests/
│   ├── contract/         # API contract tests (OpenAPI validation)
│   ├── integration/      # Service integration tests
│   └── unit/             # Unit tests for services and models
└── package.json

frontend/
├── src/
│   ├── components/       # React components (Dashboard, EnvironmentPanel, Terminal, etc.)
│   ├── pages/            # Page-level components (Home, EnvironmentDetail, Settings)
│   ├── services/         # API clients and WebSocket handlers
│   ├── hooks/            # Custom React hooks
│   ├── types/            # TypeScript type definitions
│   └── lib/              # Utilities and helpers
├── tests/
│   ├── unit/             # Component unit tests
│   └── e2e/              # Playwright E2E tests
└── package.json

shared/
└── types/                # Shared TypeScript types between frontend and backend

docs/
└── api/                  # Generated API documentation
```

**Structure Decision**: Web application monorepo with separate backend and frontend directories. Shared types package for consistency across frontend/backend. This structure supports independent development and deployment of frontend/backend while maintaining type safety.

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
The /tasks command will generate a comprehensive, dependency-ordered task list from Phase 1 artifacts:

1. **Infrastructure Tasks** (1-5):
   - Initialize monorepo with backend/frontend/shared structure
   - Setup PostgreSQL database with migration tool (Prisma/TypeORM)
   - Configure Docker development environment
   - Setup testing framework (Jest, Playwright)
   - Configure CI/CD pipeline basics

2. **Data Model Tasks** (6-12):
   - Each entity from data-model.md → model file + migration [P]
   - Sequence: User → Team → UserTeam → Project → Environment → Session → Extension → EnvironmentExtension → LogEntry
   - Add validation logic per entity
   - Create database indexes from data-model.md

3. **Contract Test Tasks** (13-25):
   - Each OpenAPI endpoint → contract test file [P]
   - WebSocket spec → WebSocket test suite
   - Tests must fail initially (no implementation)
   - Group by resource: Auth (3), Users (2), Teams (4), Projects (3), Environments (8), Sessions (2), Extensions (3), Logs (2)

4. **Service Layer Tasks** (26-40):
   - DockerService (container lifecycle, log streaming) → implements environment operations
   - AuthService (JWT, OAuth, session management) → implements auth operations
   - LogService (streaming, persistence, rotation) → implements log operations
   - ExtensionService (marketplace search, installation) → implements extension operations
   - SessionService (tmux, VS Code Server management) → implements session operations
   - Each service makes contract tests pass

5. **API Layer Tasks** (41-52):
   - Fastify route handlers per resource [P]
   - Request validation middleware (JSON Schema from OpenAPI)
   - Error handling middleware
   - WebSocket handlers (logs, terminal, status)
   - Authentication middleware (JWT verification)
   - Authorization middleware (RBAC)

6. **Frontend Core Tasks** (53-65):
   - React app setup with TypeScript and routing
   - API client service (fetch wrapper with auth)
   - WebSocket client service (reconnection logic)
   - Authentication flow (login, register, OAuth)
   - Layout components (navbar, sidebar, footer)
   - Context providers (auth, theme, notifications)

7. **Frontend Feature Tasks** (66-85):
   - Dashboard page with environment cards [P]
   - Project page with environment list [P]
   - Environment detail page (status, actions) [P]
   - Log viewer component with virtual scrolling [P]
   - Terminal component (xterm.js integration) [P]
   - Extension manager component [P]
   - Session manager component [P]
   - Team management pages [P]
   - Settings page [P]
   - Real-time status updates (WebSocket integration)

8. **Integration Test Tasks** (86-100):
   - Each user story from quickstart.md → E2E test scenario
   - Critical flows: Registration → Create Project → Create Environment → Start → Logs → Terminal → Stop → Delete
   - Multi-user collaboration tests
   - Error handling tests (port conflicts, auth failures)

9. **Documentation Tasks** (101-105):
   - API documentation from OpenAPI spec (Swagger UI or ReDoc)
   - README with setup instructions
   - Development guide
   - Deployment guide
   - Architecture documentation

**Ordering Strategy**:
- **TDD Principle**: Tests written before implementation for every feature
- **Dependency Order**:
  - Infrastructure → Data Models → Services → API → Frontend
  - Within each layer: Core entities/services before dependent ones
- **Parallel Execution Markers [P]**:
  - Independent entity models can be created in parallel
  - Independent contract tests can be written in parallel
  - Independent UI components can be built in parallel
- **Vertical Slice Option**: After core infrastructure, can work in vertical slices (e.g., complete auth flow end-to-end before starting environment management)

**Estimated Output**: ~105 numbered, dependency-ordered tasks in tasks.md

**Task Template Format**:
```
## Task [###]: [Task Name]
**Type**: [setup|model|test|service|api|ui|integration|docs]
**Depends On**: [comma-separated task numbers or "none"]
**Parallel**: [yes|no]

### Description
[What needs to be done]

### Acceptance Criteria
- [ ] [Specific, testable criterion 1]
- [ ] [Specific, testable criterion 2]

### Files to Modify/Create
- [File path 1]
- [File path 2]

### Testing
[How to verify this task is complete]
```

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented (N/A - no deviations)

**Artifacts Generated**:
- [x] `/specs/001-develop-vibecode-a/plan.md` (this file)
- [x] `/specs/001-develop-vibecode-a/research.md` (technology decisions and rationale)
- [x] `/specs/001-develop-vibecode-a/data-model.md` (7 core entities + relationships)
- [x] `/specs/001-develop-vibecode-a/contracts/openapi.yaml` (REST API specification)
- [x] `/specs/001-develop-vibecode-a/contracts/websocket-spec.md` (WebSocket protocol)
- [x] `/specs/001-develop-vibecode-a/quickstart.md` (15 validation scenarios)
- [x] `/CLAUDE.md` (agent context file)

**Next Steps**:
Run `/tasks` command to generate detailed task breakdown for implementation phase.

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
