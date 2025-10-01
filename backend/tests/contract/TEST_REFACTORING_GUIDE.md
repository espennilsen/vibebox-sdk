# Contract Test Refactoring Guide

## Overview

This guide documents the refactoring pattern for contract tests to eliminate code duplication using new helper functions in `test-utils.ts`.

## Current Problems

The existing 196 contract tests have the following issues:

1. **Invalid Authentication**: Every test uses `createMockToken()` which returns an invalid JWT that fails authentication
2. **Repeated Setup**: Every test file repeats the same supertest request setup with `supertest('http://localhost:3000')`
3. **Duplicated Error Handling**: Manual API calls with duplicated error handling logic
4. **No Test Data Generators**: Tests manually create test data inline, making maintenance difficult

## Expected Helper Functions

The following helper functions should be available in `/workspace/backend/tests/contract/helpers/test-utils.ts`:

### 1. `getAuthToken()` - Get Valid Authentication Token

```typescript
/**
 * Gets a valid authentication token for testing
 * This replaces createMockToken() which returned invalid tokens
 *
 * @param userId - Optional user ID to authenticate as (defaults to test user)
 * @returns Promise<string> - Valid Bearer token
 *
 * @example
 * const token = await getAuthToken();
 * const response = await apiRequest('GET', '/users/me', { token });
 */
export async function getAuthToken(userId?: string): Promise<string>
```

### 2. `apiRequest()` - Simplified API Request Helper

```typescript
/**
 * Makes an authenticated API request with simplified syntax
 *
 * @param method - HTTP method (GET, POST, PATCH, DELETE)
 * @param path - API path (e.g., '/users/me')
 * @param options - Request options
 * @returns Promise<supertest.Response>
 *
 * @example
 * // GET request with authentication
 * const response = await apiRequest('GET', '/users/me', { token });
 *
 * // POST request with body
 * const response = await apiRequest('POST', '/teams', {
 *   token,
 *   body: { name: 'Test Team', slug: 'test-team' }
 * });
 *
 * // Request without authentication
 * const response = await apiRequest('POST', '/auth/login', {
 *   body: { email: 'user@example.com', password: 'password' }
 * });
 */
export async function apiRequest(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  options?: {
    token?: string;
    body?: any;
    query?: Record<string, string>;
    headers?: Record<string, string>;
  }
): Promise<supertest.Response>
```

### 3. Test Data Generators

```typescript
/**
 * Generates valid test data for various entities
 */
export const TestData = {
  /**
   * Generate valid user data
   */
  user: (overrides?: Partial<UserData>) => ({
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    displayName: 'Test User',
    ...overrides
  }),

  /**
   * Generate valid team data
   */
  team: (overrides?: Partial<TeamData>) => ({
    name: `Test Team ${Date.now()}`,
    slug: `test-team-${Date.now()}`,
    description: 'A test team',
    ...overrides
  }),

  /**
   * Generate valid project data
   */
  project: (overrides?: Partial<ProjectData>) => ({
    name: `Test Project ${Date.now()}`,
    slug: `test-project-${Date.now()}`,
    description: 'A test project',
    ...overrides
  }),

  /**
   * Generate valid environment data
   */
  environment: (projectId: string, overrides?: Partial<EnvironmentData>) => ({
    name: `Test Env ${Date.now()}`,
    slug: `test-env-${Date.now()}`,
    projectId,
    baseImage: 'node:20',
    cpuLimit: 2.0,
    memoryLimit: 4096,
    storageLimit: 20480,
    ...overrides
  })
};
```

## Refactoring Pattern

### Before (Current Pattern)

```typescript
describe('GET /users/me', () => {
  it('should return 200 with user profile when authenticated', async () => {
    // Arrange
    const authToken = createMockToken(); // INVALID TOKEN!

    // Act
    const response = await supertest('http://localhost:3000') // REPEATED!
      .get('/api/v1/users/me')
      .set('Authorization', authToken);

    // Assert
    expect(response.status).toBe(200);
    SchemaValidators.validateUser(response.body);
  });
});
```

### After (New Pattern)

```typescript
describe('GET /users/me', () => {
  it('should return 200 with user profile when authenticated', async () => {
    // Arrange
    const token = await getAuthToken(); // VALID TOKEN!

    // Act
    const response = await apiRequest('GET', '/users/me', { token }); // SIMPLIFIED!

    // Assert
    expect(response.status).toBe(200);
    SchemaValidators.validateUser(response.body);
  });
});
```

## Refactoring Checklist

### Step 1: Update Imports

```typescript
// OLD
import { SchemaValidators, createMockToken } from '../helpers/test-utils';

// NEW
import { SchemaValidators, getAuthToken, apiRequest, TestData } from '../helpers/test-utils';
```

### Step 2: Replace createMockToken() with getAuthToken()

```typescript
// OLD
const authToken = createMockToken();

// NEW
const token = await getAuthToken();
```

### Step 3: Replace supertest() calls with apiRequest()

```typescript
// OLD
const response = await supertest('http://localhost:3000')
  .get('/api/v1/users/me')
  .set('Authorization', authToken);

// NEW
const response = await apiRequest('GET', '/users/me', { token });
```

### Step 4: Use Test Data Generators

```typescript
// OLD
const teamData = {
  name: 'Test Team',
  slug: 'test-team',
  description: 'A test team'
};

// NEW
const teamData = TestData.team();
// OR with overrides
const teamData = TestData.team({ slug: 'specific-slug' });
```

## Test File Categories

### Category A: Standard Authenticated Endpoints (Easy Refactoring)

These files follow the standard pattern and can be refactored easily:

- `/workspace/backend/tests/contract/users/get-profile.test.ts`
- `/workspace/backend/tests/contract/users/update-profile.test.ts`
- `/workspace/backend/tests/contract/teams/create-team.test.ts`
- `/workspace/backend/tests/contract/teams/get-team.test.ts`
- `/workspace/backend/tests/contract/teams/list-teams.test.ts`
- `/workspace/backend/tests/contract/teams/update-team.test.ts`
- `/workspace/backend/tests/contract/teams/delete-team.test.ts`
- `/workspace/backend/tests/contract/teams/add-member.test.ts`
- `/workspace/backend/tests/contract/teams/list-members.test.ts`
- `/workspace/backend/tests/contract/projects/projects.test.ts`
- `/workspace/backend/tests/contract/environments/environments.test.ts`
- `/workspace/backend/tests/contract/sessions/sessions.test.ts`
- `/workspace/backend/tests/contract/extensions/extensions.test.ts`
- `/workspace/backend/tests/contract/logs/logs.test.ts`

**Pattern**: Replace `createMockToken()` with `await getAuthToken()` and `supertest()` with `apiRequest()`

### Category B: Public Endpoints (No Auth Required)

These files test public endpoints that don't require authentication:

- `/workspace/backend/tests/contract/auth/login.test.ts`
- `/workspace/backend/tests/contract/auth/register.test.ts`

**Pattern**: Use `apiRequest()` WITHOUT token parameter

### Category C: Special Auth Handling

These files have special authentication requirements:

- `/workspace/backend/tests/contract/auth/refresh.test.ts` - Uses refresh tokens
- `/workspace/backend/tests/contract/auth/oauth.test.ts` - OAuth flow

**Pattern**: May need custom helper functions or special handling

### Category D: Real-time/WebSocket

These files test WebSocket connections:

- `/workspace/backend/tests/contract/websocket/websocket.test.ts`

**Pattern**: May need WebSocket-specific helpers

## Example Refactoring: login.test.ts

See `/workspace/backend/tests/contract/auth/login.test.ts` for a complete reference example showing the new pattern.

## Benefits of New Pattern

1. **Valid Authentication**: Tests now use real JWT tokens that pass authentication
2. **DRY Principle**: Eliminates code duplication across 196 tests
3. **Maintainability**: Changes to API base URL or auth mechanism require updates in only one place
4. **Readability**: Tests are more concise and focus on the behavior being tested
5. **Reliability**: Test data generators ensure unique, valid data for each test run

## Next Steps

1. Verify the helper functions are implemented in `test-utils.ts`
2. Update `login.test.ts` as reference example
3. Batch update Category A files (standard authenticated endpoints)
4. Update Category B files (public endpoints)
5. Handle Category C files (special auth) with custom logic
6. Handle Category D files (WebSocket) with appropriate helpers
7. Run tests after each batch to verify refactoring
8. Update this guide based on lessons learned
