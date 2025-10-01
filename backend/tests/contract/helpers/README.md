# Contract Test Helpers - Usage Guide

This document explains how to use the comprehensive helper functions in `test-utils.ts` to eliminate duplicate code in contract tests.

## Table of Contents

- [Authentication Helpers](#authentication-helpers)
- [API Request Helpers](#api-request-helpers)
- [Resource Creation Helpers](#resource-creation-helpers)
- [Test Data Generators](#test-data-generators)
- [Cleanup Helpers](#cleanup-helpers)
- [Schema Validators](#schema-validators)
- [Complete Examples](#complete-examples)

---

## Authentication Helpers

### `createTestUser()`

Creates a new test user via the registration API and returns credentials with auth tokens.

```typescript
import { createTestUser } from './helpers/test-utils';

it('should access protected endpoint', async () => {
  const user = await createTestUser();

  // user contains:
  // - email
  // - password
  // - displayName
  // - userId
  // - accessToken
  // - refreshToken

  const response = await supertest(BASE_URL)
    .get('/api/v1/projects')
    .set('Authorization', `Bearer ${user.accessToken}`);

  expect(response.status).toBe(200);
});
```

### `getAuthToken(credentials?)`

Gets a valid JWT token, either by logging in with existing credentials or creating a new user.

```typescript
import { getAuthToken } from './helpers/test-utils';

it('should authenticate with token', async () => {
  // Create new user and get token
  const token = await getAuthToken();

  // Use existing credentials
  const existingToken = await getAuthToken({
    email: 'user@example.com',
    password: 'password123'
  });
});
```

---

## API Request Helpers

### `authenticatedRequest(method, path, token, options?)`

Makes an authenticated API request with automatic header handling.

```typescript
import { createTestUser, authenticatedRequest } from './helpers/test-utils';

it('should create a team', async () => {
  const user = await createTestUser();

  const response = await authenticatedRequest(
    'POST',
    '/teams',
    user.accessToken!,
    {
      body: {
        name: 'My Team',
        slug: 'my-team'
      }
    }
  );

  expect(response.status).toBe(201);
});
```

**With query parameters:**

```typescript
const response = await authenticatedRequest(
  'GET',
  '/projects',
  token,
  {
    query: {
      teamId: 'team-id-here',
      archived: false
    }
  }
);
```

**With custom headers:**

```typescript
const response = await authenticatedRequest(
  'POST',
  '/teams',
  token,
  {
    body: { name: 'Team', slug: 'team' },
    headers: {
      'X-Custom-Header': 'value'
    }
  }
);
```

### `apiRequest(method, path, options?)`

Makes an unauthenticated API request (useful for testing public endpoints).

```typescript
import { apiRequest } from './helpers/test-utils';

it('should register new user', async () => {
  const response = await apiRequest('POST', '/auth/register', {
    body: {
      email: 'new@example.com',
      password: 'SecurePass123!',
      displayName: 'New User'
    }
  });

  expect(response.status).toBe(201);
});
```

---

## Resource Creation Helpers

### `createResource(type, data, token)`

Creates a test resource via API and returns the created resource with ID.

```typescript
import { createTestUser, createResource } from './helpers/test-utils';

it('should work with resources', async () => {
  const user = await createTestUser();

  // Create a team
  const team = await createResource('team', {
    name: 'My Team',
    slug: 'my-team'
  }, user.accessToken!);

  // Create a project
  const project = await createResource('project', {
    name: 'My Project',
    slug: 'my-project',
    teamId: team.id
  }, user.accessToken!);

  // Use the resources
  expect(team.data.name).toBe('My Team');
  expect(project.data.teamId).toBe(team.id);
});
```

### `deleteResource(type, id, token)`

Deletes a test resource via API.

```typescript
import { createTestUser, createResource, deleteResource } from './helpers/test-utils';

it('should cleanup resources', async () => {
  const user = await createTestUser();
  const team = await createResource('team', {
    name: 'Temp Team',
    slug: 'temp-team'
  }, user.accessToken!);

  // Delete the team
  await deleteResource('team', team.id, user.accessToken!);
});
```

---

## Test Data Generators

### `generateUser(overrides?)`

Generates unique user data for testing.

```typescript
import { generateUser, apiRequest } from './helpers/test-utils';

it('should register with generated data', async () => {
  const userData = generateUser({
    displayName: 'Custom Name'
  });

  const response = await apiRequest('POST', '/auth/register', {
    body: userData
  });

  expect(response.status).toBe(201);
});
```

### `generateTeam(overrides?)`

Generates unique team data for testing.

```typescript
import { generateTeam, createTestUser, authenticatedRequest } from './helpers/test-utils';

it('should create team with generated data', async () => {
  const user = await createTestUser();
  const teamData = generateTeam({
    description: 'Custom description'
  });

  const response = await authenticatedRequest(
    'POST',
    '/teams',
    user.accessToken!,
    { body: teamData }
  );

  expect(response.status).toBe(201);
});
```

### `generateProject(overrides?)`

Generates unique project data for testing.

```typescript
import { generateProject } from './helpers/test-utils';

const projectData = generateProject({
  teamId: team.id
});
```

### `generateEnvironment(projectId, overrides?)`

Generates unique environment data for testing.

```typescript
import { generateEnvironment } from './helpers/test-utils';

const envData = generateEnvironment(project.id, {
  baseImage: 'python:3.11-alpine'
});
```

---

## Cleanup Helpers

### `cleanupTestData()`

Cleans up all test data from the database. Use in `afterAll()` hooks.

```typescript
import { cleanupTestData } from './helpers/test-utils';

describe('My Test Suite', () => {
  afterAll(async () => {
    await cleanupTestData();
  });

  // Your tests here
});
```

### `cleanupTestUsers()`

Cleans up only test users (emails containing '@example.com').

```typescript
import { cleanupTestUsers } from './helpers/test-utils';

afterAll(async () => {
  await cleanupTestUsers();
});
```

---

## Schema Validators

All existing schema validators are still available:

```typescript
import { SchemaValidators } from './helpers/test-utils';

SchemaValidators.validateAuthResponse(response.body);
SchemaValidators.validateUser(user);
SchemaValidators.validateTeam(team);
SchemaValidators.validateProject(project);
SchemaValidators.validateEnvironment(env);
SchemaValidators.validateSession(session);
SchemaValidators.validateExtension(ext);
SchemaValidators.validateError(errorResponse);
// ... and more
```

---

## Complete Examples

### Example 1: Testing Team Creation

**Before (with duplicate code):**

```typescript
it('should create team', async () => {
  const authToken = createMockToken();
  const teamData = {
    name: 'Test Team',
    slug: 'test-team',
  };

  const response = await supertest('http://localhost:3000')
    .post('/api/v1/teams')
    .set('Authorization', authToken)
    .send(teamData)
    .set('Content-Type', 'application/json');

  expect(response.status).toBe(201);
});
```

**After (using helpers):**

```typescript
it('should create team', async () => {
  const user = await createTestUser();
  const teamData = generateTeam();

  const response = await authenticatedRequest(
    'POST',
    '/teams',
    user.accessToken!,
    { body: teamData }
  );

  expect(response.status).toBe(201);
  SchemaValidators.validateTeam(response.body);
});
```

### Example 2: Testing Project Listing with Filters

**Before (with duplicate code):**

```typescript
it('should filter projects by teamId', async () => {
  const authToken = createMockToken();
  const mockTeamId = '650e8400-e29b-41d4-a716-446655440000';

  const response = await supertest('http://localhost:3000')
    .get(`/api/v1/projects?teamId=${mockTeamId}`)
    .set('Authorization', authToken);

  expect([200, 401]).toContain(response.status);
});
```

**After (using helpers):**

```typescript
it('should filter projects by teamId', async () => {
  const user = await createTestUser();
  const team = await createResource('team', generateTeam(), user.accessToken!);

  const response = await authenticatedRequest(
    'GET',
    '/projects',
    user.accessToken!,
    { query: { teamId: team.id } }
  );

  expect(response.status).toBe(200);
});
```

### Example 3: Testing Environment Creation Flow

```typescript
it('should create environment for project', async () => {
  // Setup: Create user, team, and project
  const user = await createTestUser();
  const team = await createResource('team', generateTeam(), user.accessToken!);
  const project = await createResource('project',
    generateProject({ teamId: team.id }),
    user.accessToken!
  );

  // Test: Create environment
  const envData = generateEnvironment(project.id);
  const response = await authenticatedRequest(
    'POST',
    '/environments',
    user.accessToken!,
    { body: envData }
  );

  // Assert
  expect(response.status).toBe(201);
  SchemaValidators.validateEnvironment(response.body);
  expect(response.body.projectId).toBe(project.id);

  // Cleanup
  await deleteResource('environment', response.body.id, user.accessToken!);
  await deleteResource('project', project.id, user.accessToken!);
  await deleteResource('team', team.id, user.accessToken!);
});
```

### Example 4: Testing with Shared User Across Tests

```typescript
describe('Project CRUD Operations', () => {
  let user: TestUserCredentials;

  beforeAll(async () => {
    user = await createTestUser();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it('should create project', async () => {
    const projectData = generateProject();
    const response = await authenticatedRequest(
      'POST',
      '/projects',
      user.accessToken!,
      { body: projectData }
    );

    expect(response.status).toBe(201);
  });

  it('should list projects', async () => {
    const response = await authenticatedRequest(
      'GET',
      '/projects',
      user.accessToken!
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
```

---

## Migration Guide

To migrate existing tests to use the new helpers:

1. **Replace `createMockToken()`** with `createTestUser()` and use the returned `accessToken`
2. **Replace manual `supertest()` calls** with `authenticatedRequest()` or `apiRequest()`
3. **Use data generators** (`generateTeam()`, `generateProject()`, etc.) instead of hardcoded data
4. **Add cleanup hooks** with `cleanupTestData()` in `afterAll()`
5. **Use `createResource()`** for setting up test data dependencies

---

## Best Practices

1. **Use `beforeAll()` for shared user creation** to reduce API calls
2. **Clean up resources** in reverse order of creation (environment → project → team → user)
3. **Use generators** to ensure unique data and avoid conflicts
4. **Validate responses** with `SchemaValidators` to ensure API contract compliance
5. **Handle cleanup** with `afterAll()` hooks to prevent database pollution

---

## Constants

```typescript
export const BASE_URL = 'http://localhost:3000';
export const API_PREFIX = '/api/v1';
```

These constants are exported for consistency across all tests.
