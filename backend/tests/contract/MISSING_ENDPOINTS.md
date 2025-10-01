# Missing API Endpoints

This document tracks API endpoints that are expected by the contract tests but return 404 (Not Found) responses, indicating they haven't been implemented yet.

**Last Updated:** 2025-10-01
**Test Refactoring Status:** 11/18 files refactored to use new helper functions

---

## Summary

Based on contract test execution, the following endpoints consistently return 404 status codes, indicating they are not yet implemented in the backend API.

### Implementation Status Legend
- ✅ **Implemented** - Endpoint exists and returns expected responses
- ❌ **Missing (404)** - Endpoint not found, needs implementation
- ⚠️ **Partial** - Endpoint exists but may have incomplete functionality

---

## User Endpoints

### PATCH /api/v1/users/me
- **Status:** ❌ Missing (404)
- **Method:** PATCH
- **Description:** Update current user profile
- **Expected By:** `tests/contract/users/update-profile.test.ts`
- **Request Body:**
  ```typescript
  {
    displayName?: string;
    avatarUrl?: string;
    sshPublicKey?: string;
    timezone?: string;
    locale?: string;
    notificationSettings?: object;
  }
  ```
- **Expected Response:** 200 with updated User object
- **Notes:** All profile update tests expect this endpoint

---

## Team Endpoints

### GET /api/v1/teams
- **Status:** ❌ Missing (404)
- **Method:** GET
- **Description:** List all teams for authenticated user
- **Expected By:** `tests/contract/teams/list-teams.test.ts`
- **Expected Response:** 200 with array of Team objects
- **Notes:** Should return empty array for users with no teams

### POST /api/v1/teams
- **Status:** ❌ Missing (404)
- **Method:** POST
- **Description:** Create a new team
- **Expected By:** `tests/contract/teams/create-team.test.ts`
- **Request Body:**
  ```typescript
  {
    name: string;        // required, max 100 chars
    slug: string;        // required, 3-50 chars, lowercase alphanumeric with hyphens
    description?: string;
  }
  ```
- **Expected Response:** 201 with created Team object
- **Validation:** Slug pattern: `/^[a-z0-9-]{3,50}$/`

### GET /api/v1/teams/{teamId}
- **Status:** ❌ Missing (404)
- **Method:** GET
- **Description:** Get team details by ID
- **Expected By:** `tests/contract/teams/get-team.test.ts`
- **Path Parameters:** `teamId` (UUID)
- **Expected Response:** 200 with Team object
- **Error Responses:** 400 (invalid UUID), 404 (team not found)

### PATCH /api/v1/teams/{teamId}
- **Status:** ❌ Missing (404)
- **Method:** PATCH
- **Description:** Update team details
- **Expected By:** `tests/contract/teams/update-team.test.ts`
- **Path Parameters:** `teamId` (UUID)
- **Request Body:**
  ```typescript
  {
    name?: string;
    description?: string;
  }
  ```
- **Expected Response:** 200 with updated Team object

### DELETE /api/v1/teams/{teamId}
- **Status:** ❌ Missing (404)
- **Method:** DELETE
- **Description:** Delete a team
- **Expected By:** `tests/contract/teams/delete-team.test.ts`
- **Path Parameters:** `teamId` (UUID)
- **Expected Response:** 204 (No Content)

### GET /api/v1/teams/{teamId}/members
- **Status:** ❌ Missing (404)
- **Method:** GET
- **Description:** List all members of a team
- **Expected By:** `tests/contract/teams/list-members.test.ts`
- **Path Parameters:** `teamId` (UUID)
- **Expected Response:** 200 with array of TeamMember objects

### POST /api/v1/teams/{teamId}/members
- **Status:** ❌ Missing (404)
- **Method:** POST
- **Description:** Add a member to a team
- **Expected By:** `tests/contract/teams/add-member.test.ts`
- **Path Parameters:** `teamId` (UUID)
- **Request Body:**
  ```typescript
  {
    email: string;    // required
    role: 'admin' | 'developer' | 'viewer';  // required enum
  }
  ```
- **Expected Response:** 201 with created TeamMember object

---

## Project Endpoints

### GET /api/v1/projects
- **Status:** ❌ Missing (404)
- **Method:** GET
- **Description:** List all projects for authenticated user
- **Expected By:** `tests/contract/projects/projects.test.ts`
- **Query Parameters:**
  - `teamId` (UUID, optional) - Filter by team
  - `archived` (boolean, optional) - Filter by archive status
- **Expected Response:** 200 with array of Project objects

### POST /api/v1/projects
- **Status:** ❌ Missing (404)
- **Method:** POST
- **Description:** Create a new project
- **Expected By:** `tests/contract/projects/projects.test.ts`
- **Request Body:**
  ```typescript
  {
    name: string;        // required
    slug: string;        // required, pattern: /^[a-z0-9-]{3,50}$/
    description?: string;
    teamId?: string;     // optional, for team-owned projects
  }
  ```
- **Expected Response:** 201 with created Project object

### GET /api/v1/projects/{projectId}
- **Status:** ❌ Missing (404)
- **Method:** GET
- **Description:** Get project details by ID
- **Expected By:** `tests/contract/projects/projects.test.ts`
- **Path Parameters:** `projectId` (UUID)
- **Expected Response:** 200 with Project object

### PATCH /api/v1/projects/{projectId}
- **Status:** ❌ Missing (404)
- **Method:** PATCH
- **Description:** Update project details
- **Expected By:** `tests/contract/projects/projects.test.ts`
- **Path Parameters:** `projectId` (UUID)
- **Request Body:**
  ```typescript
  {
    name?: string;
    description?: string;
    isArchived?: boolean;
  }
  ```
- **Expected Response:** 200 with updated Project object

### DELETE /api/v1/projects/{projectId}
- **Status:** ❌ Missing (404)
- **Method:** DELETE
- **Description:** Delete a project
- **Expected By:** `tests/contract/projects/projects.test.ts`
- **Path Parameters:** `projectId` (UUID)
- **Expected Response:** 204 (No Content)

---

## Environment Endpoints

### All Environment CRUD Operations
- **Status:** ❌ Missing (404)
- **Methods:** GET, POST, PATCH, DELETE
- **Description:** Full CRUD operations for development environments
- **Expected By:** `tests/contract/environments/environments.test.ts`
- **Base Path:** `/api/v1/environments`
- **Notes:** Large test file (583 lines) requires comprehensive endpoint implementation

**Expected Endpoints:**
- `GET /environments` - List environments
- `POST /environments` - Create environment
- `GET /environments/{envId}` - Get environment details
- `PATCH /environments/{envId}` - Update environment
- `DELETE /environments/{envId}` - Delete environment
- `POST /environments/{envId}/start` - Start environment
- `POST /environments/{envId}/stop` - Stop environment

---

## Session Endpoints

### All Session Operations
- **Status:** ❌ Missing (404)
- **Methods:** GET, POST, DELETE
- **Description:** tmux/VS Code session management
- **Expected By:** `tests/contract/sessions/sessions.test.ts`
- **Base Path:** `/api/v1/sessions`

**Expected Endpoints:**
- `GET /sessions` - List sessions
- `POST /sessions` - Create session
- `GET /sessions/{sessionId}` - Get session details
- `DELETE /sessions/{sessionId}` - Terminate session

---

## Extension Endpoints

### All Extension Operations
- **Status:** ❌ Missing (404)
- **Methods:** GET, POST, DELETE
- **Description:** VS Code extension management
- **Expected By:** `tests/contract/extensions/extensions.test.ts`
- **Base Path:** `/api/v1/extensions`

**Expected Endpoints:**
- `GET /extensions` - List available extensions
- `POST /environments/{envId}/extensions` - Install extension
- `GET /environments/{envId}/extensions` - List installed extensions
- `DELETE /environments/{envId}/extensions/{extensionId}` - Uninstall extension

---

## Log Endpoints

### All Log Operations
- **Status:** ❌ Missing (404)
- **Methods:** GET
- **Description:** Environment log streaming and retrieval
- **Expected By:** `tests/contract/logs/logs.test.ts`
- **Base Path:** `/api/v1/logs`

**Expected Endpoints:**
- `GET /environments/{envId}/logs` - Get environment logs
- `GET /environments/{envId}/logs/stream` - WebSocket log streaming
- Query parameters: `limit`, `since`, `stream` (stdout/stderr)

---

## Implementation Priority

Based on test dependencies and feature complexity:

### Phase 1 - Core Authentication & Users
1. ✅ `POST /auth/register` - Already implemented
2. ✅ `POST /auth/login` - Already implemented
3. ✅ `GET /users/me` - Already implemented
4. ❌ `PATCH /users/me` - **Implement first** (simple, no dependencies)

### Phase 2 - Team Management
5. ❌ `POST /teams` - Create team
6. ❌ `GET /teams` - List teams
7. ❌ `GET /teams/{teamId}` - Get team details
8. ❌ `PATCH /teams/{teamId}` - Update team
9. ❌ `DELETE /teams/{teamId}` - Delete team
10. ❌ `POST /teams/{teamId}/members` - Add member
11. ❌ `GET /teams/{teamId}/members` - List members

### Phase 3 - Project Management
12. ❌ `POST /projects` - Create project
13. ❌ `GET /projects` - List projects
14. ❌ `GET /projects/{projectId}` - Get project
15. ❌ `PATCH /projects/{projectId}` - Update project
16. ❌ `DELETE /projects/{projectId}` - Delete project

### Phase 4 - Environment Management (Complex)
17. ❌ All environment endpoints - Requires Docker integration

### Phase 5 - Sessions & Extensions (Complex)
18. ❌ All session endpoints - Requires tmux/VS Code integration
19. ❌ All extension endpoints - Requires VS Code extension API

### Phase 6 - Logging (Complex)
20. ❌ All log endpoints - Requires WebSocket streaming

---

## Testing Notes

- All endpoints require JWT Bearer token authentication (except `/auth/register` and `/auth/login`)
- UUID validation should return 400 for invalid formats
- Non-existent resources should return 404
- Missing authentication should return 401
- All responses should include `Content-Type: application/json`
- Validation errors should return 400 with error schema: `{ error: string, message: string }`

---

## Next Steps

1. **Run full test suite** after implementing each endpoint to verify compliance
2. **Update this document** as endpoints are implemented (mark with ✅)
3. **Add integration tests** for multi-step workflows (e.g., create team → add member → create project)
4. **Document WebSocket endpoints** separately once implemented
5. **Consider API versioning strategy** for future changes

---

## Related Files

- Test helper functions: `/workspace/backend/tests/contract/helpers/test-utils.ts`
- API specification: `/workspace/.claude/api_reference.md`
- OpenAPI schema: TBD (consider generating from Fastify routes)

---

*This document is automatically maintained during test refactoring and should be updated as endpoints are implemented.*
