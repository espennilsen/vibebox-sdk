# Contract Tests - VibeBox API

This directory contains all 40 contract tests for the VibeBox API endpoints, following Test-Driven Development (TDD) principles.

## Overview

These tests validate that API endpoints conform to the OpenAPI specification located at:
- `/workspace/specs/001-develop-vibecode-a/contracts/openapi.yaml`
- `/workspace/specs/001-develop-vibecode-a/contracts/websocket-spec.md`

**Important**: All tests are expected to FAIL until the corresponding API endpoints are implemented (Phase 3.4).

## Test Structure

```
contract/
├── helpers/
│   └── test-utils.ts          # Common test utilities and schema validators
├── auth/                       # Authentication endpoints (4 tests)
│   ├── register.test.ts        # POST /auth/register
│   ├── login.test.ts           # POST /auth/login
│   ├── oauth.test.ts           # GET /auth/oauth/{provider}
│   └── refresh.test.ts         # POST /auth/refresh
├── users/                      # User endpoints (2 tests)
│   ├── get-profile.test.ts     # GET /users/me
│   └── update-profile.test.ts  # PATCH /users/me
├── teams/                      # Team endpoints (7 tests)
│   ├── list-teams.test.ts      # GET /teams
│   ├── create-team.test.ts     # POST /teams
│   ├── get-team.test.ts        # GET /teams/{teamId}
│   ├── update-team.test.ts     # PATCH /teams/{teamId}
│   ├── delete-team.test.ts     # DELETE /teams/{teamId}
│   ├── list-members.test.ts    # GET /teams/{teamId}/members
│   └── add-member.test.ts      # POST /teams/{teamId}/members
├── projects/                   # Project endpoints (5 tests)
│   └── projects.test.ts        # All project CRUD operations
├── environments/               # Environment endpoints (14 tests)
│   └── environments.test.ts    # All environment operations
├── sessions/                   # Session endpoints (3 tests)
│   └── sessions.test.ts        # All session operations
├── extensions/                 # Extension endpoints (4 tests)
│   └── extensions.test.ts      # All extension operations
├── logs/                       # Log endpoints (1 test)
│   └── logs.test.ts            # GET /environments/{environmentId}/logs
└── websocket/                  # WebSocket tests (4 tests)
    └── websocket.test.ts       # All WebSocket endpoints
```

## Test Categories (40 Total Tests)

### Authentication (4 tests) - T027-T030
- `POST /auth/register` - User registration
- `POST /auth/login` - Email/password login
- `GET /auth/oauth/{provider}` - OAuth redirect (GitHub, Google)
- `POST /auth/refresh` - Token refresh

### Users (2 tests) - T031-T032
- `GET /users/me` - Get current user profile
- `PATCH /users/me` - Update user profile

### Teams (7 tests) - T033-T039
- `GET /teams` - List user's teams
- `POST /teams` - Create new team
- `GET /teams/{teamId}` - Get team details
- `PATCH /teams/{teamId}` - Update team
- `DELETE /teams/{teamId}` - Delete team
- `GET /teams/{teamId}/members` - List team members
- `POST /teams/{teamId}/members` - Add team member

### Projects (5 tests) - T040-T044
- `GET /projects` - List projects (with filters)
- `POST /projects` - Create project
- `GET /projects/{projectId}` - Get project details
- `PATCH /projects/{projectId}` - Update project
- `DELETE /projects/{projectId}` - Delete project

### Environments (14 tests) - T045-T054
- `GET /environments` - List environments (paginated)
- `POST /environments` - Create environment
- `GET /environments/{environmentId}` - Get environment details
- `PATCH /environments/{environmentId}` - Update environment
- `DELETE /environments/{environmentId}` - Delete environment
- `POST /environments/{environmentId}/start` - Start environment
- `POST /environments/{environmentId}/stop` - Stop environment
- `POST /environments/{environmentId}/ports` - Add port mapping
- `GET /environments/{environmentId}/variables` - List environment variables
- `POST /environments/{environmentId}/variables` - Add environment variable

### Sessions (3 tests) - T055-T057
- `GET /environments/{environmentId}/sessions` - List sessions
- `POST /environments/{environmentId}/sessions` - Create session (tmux, vscode_server, shell)
- `DELETE /sessions/{sessionId}` - Terminate session

### Extensions (4 tests) - T058-T061
- `GET /extensions` - Search extensions
- `GET /environments/{environmentId}/extensions` - List installed extensions
- `POST /environments/{environmentId}/extensions` - Install extension
- `DELETE /environments/{environmentId}/extensions/{extensionId}` - Uninstall extension

### Logs (1 test) - T062
- `GET /environments/{environmentId}/logs` - Get environment logs (with filters)

### WebSocket (4 tests) - T063-T066
- Connection authentication
- Log streaming (`/ws/environments/{environmentId}/logs`)
- Terminal connection (`/ws/environments/{environmentId}/terminal`)
- Status updates (`/ws/environments/{environmentId}/status`)

## Running Tests

```bash
# Run all contract tests
npm test --workspace=backend

# Run specific category
npm test --workspace=backend -- tests/contract/auth

# Run in watch mode during development
npm run test:watch --workspace=backend

# Run with coverage
npm run test:coverage --workspace=backend
```

## Test Utilities

The `helpers/test-utils.ts` file provides:

### Validation Functions
- `expectStatus(response, expectedStatus)` - Validate HTTP status codes
- `expectFields(obj, requiredFields)` - Validate required fields presence
- `isValidUUID(uuid)` - Validate UUID format
- `isValidISODate(date)` - Validate ISO 8601 date format
- `isValidEmail(email)` - Validate email format
- `isValidSlug(slug)` - Validate slug pattern (lowercase alphanumeric, 3-50 chars)

### Schema Validators
- `SchemaValidators.validateAuthResponse(body)` - Validates AuthResponse schema
- `SchemaValidators.validateUser(user)` - Validates User schema
- `SchemaValidators.validateTeam(team)` - Validates Team schema
- `SchemaValidators.validateTeamMember(member)` - Validates TeamMember schema
- `SchemaValidators.validateProject(project)` - Validates Project schema
- `SchemaValidators.validateEnvironment(env)` - Validates Environment schema
- `SchemaValidators.validateSession(session)` - Validates Session schema
- `SchemaValidators.validateExtension(ext)` - Validates Extension schema
- `SchemaValidators.validateEnvironmentExtension(envExt)` - Validates EnvironmentExtension schema
- `SchemaValidators.validateEnvironmentVariable(envVar)` - Validates EnvironmentVariable schema
- `SchemaValidators.validateLogEntry(log)` - Validates LogEntry schema
- `SchemaValidators.validatePagination(pagination)` - Validates Pagination schema
- `SchemaValidators.validateError(body)` - Validates Error response schema

### Test Helpers
- `createMockToken()` - Creates mock JWT token for testing (will fail authentication)

## Test Principles

1. **TDD Approach**: Tests are written BEFORE implementation
2. **Contract Validation**: Tests validate OpenAPI spec compliance
3. **Schema Validation**: All responses are validated against defined schemas
4. **Edge Cases**: Tests cover success paths, error conditions, and validation failures
5. **Authentication**: Tests verify auth requirements per endpoint
6. **Comprehensive Coverage**: 40 tests covering all API endpoints

## Expected Behavior (TDD)

Since the API endpoints are not yet implemented:
- All tests will currently FAIL (404 Not Found or similar errors)
- This is EXPECTED and follows TDD principles
- Tests should PASS after implementing Phase 3.4 (API endpoints)

## Next Steps (Phase 3.4)

After these contract tests are complete:
1. Implement API endpoints in `/workspace/backend/src/api/`
2. Run tests to validate implementation
3. Fix any failures until all 40 tests pass
4. Verify test coverage meets 80%+ requirement

## Documentation References

- **OpenAPI Spec**: `/workspace/specs/001-develop-vibecode-a/contracts/openapi.yaml`
- **WebSocket Spec**: `/workspace/specs/001-develop-vibecode-a/contracts/websocket-spec.md`
- **API Reference**: `/workspace/.claude/api_reference.md`
- **Development Workflow**: `/workspace/.claude/dev_workflow.md`

## Notes

- Mock tokens are used for testing - they will fail actual authentication
- WebSocket tests use the `ws` package for connection testing
- Tests are isolated and can run in any order
- All tests include proper TSDoc comments for documentation
