# Contract Tests Refactoring - Quick Start Guide

## TL;DR

Replace `createMockToken()` and `supertest()` calls with new helper functions to fix 105 failing tests.

## Before You Start

1. Read the reference example: `/workspace/backend/tests/contract/auth/login.test.ts`
2. Review available helpers: `/workspace/backend/tests/contract/helpers/test-utils.ts`

## The Two Most Common Patterns

### Pattern 1: Authenticated Endpoint (Used in 14 files)

**BEFORE**:
```typescript
import { SchemaValidators, createMockToken } from '../helpers/test-utils';
import supertest from 'supertest';

it('should return user profile', async () => {
  const authToken = createMockToken(); // BROKEN - returns invalid token

  const response = await supertest('http://localhost:3000')
    .get('/api/v1/users/me')
    .set('Authorization', authToken);

  expect(response.status).toBe(200);
});
```

**AFTER**:
```typescript
import { SchemaValidators, getAuthToken, authenticatedRequest } from '../helpers/test-utils';

it('should return user profile', async () => {
  const token = await getAuthToken(); // FIXED - returns VALID token

  const response = await authenticatedRequest('GET', '/users/me', token);

  expect(response.status).toBe(200);
});
```

### Pattern 2: Public Endpoint (Used in 2 files)

**BEFORE**:
```typescript
import supertest from 'supertest';

it('should login user', async () => {
  const response = await supertest('http://localhost:3000')
    .post('/api/v1/auth/login')
    .send({ email: 'user@example.com', password: 'pass' })
    .set('Content-Type', 'application/json');

  expect(response.status).toBe(200);
});
```

**AFTER**:
```typescript
import { apiRequest } from '../helpers/test-utils';

it('should login user', async () => {
  const response = await apiRequest('POST', '/auth/login', {
    body: { email: 'user@example.com', password: 'pass' }
  });

  expect(response.status).toBe(200);
});
```

## Step-by-Step Refactoring

### Step 1: Update Imports

```typescript
// REMOVE
import supertest from 'supertest';
import { createMockToken } from '../helpers/test-utils';

// ADD (choose based on what you need)
import {
  getAuthToken,           // For getting valid auth tokens
  authenticatedRequest,   // For authenticated API calls
  apiRequest,             // For public API calls
  generateUser,           // For generating test user data
  generateTeam,           // For generating test team data
  // ... other generators as needed
} from '../helpers/test-utils';
```

### Step 2: Replace Token Generation

```typescript
// BEFORE
const authToken = createMockToken();

// AFTER
const token = await getAuthToken();
```

### Step 3: Replace API Calls

**For Authenticated Endpoints**:
```typescript
// BEFORE
const response = await supertest('http://localhost:3000')
  .get('/api/v1/users/me')
  .set('Authorization', authToken);

// AFTER
const response = await authenticatedRequest('GET', '/users/me', token);
```

**For Public Endpoints**:
```typescript
// BEFORE
const response = await supertest('http://localhost:3000')
  .post('/api/v1/auth/login')
  .send(body)
  .set('Content-Type', 'application/json');

// AFTER
const response = await apiRequest('POST', '/auth/login', { body });
```

### Step 4: Use Test Data Generators (Optional but Recommended)

```typescript
// BEFORE
const teamData = {
  name: 'Test Team',
  slug: 'test-team',
  description: 'A test team'
};

// AFTER
const teamData = generateTeam(); // Generates unique data
// OR with overrides
const teamData = generateTeam({ slug: 'specific-slug' });
```

### Step 5: Verify

```bash
# Run the specific test file
npm test -- tests/contract/path/to/your-file.test.ts

# Run all contract tests in a directory
npm test -- tests/contract/users/
```

## Common Scenarios

### Scenario 1: GET Request (Authenticated)
```typescript
const token = await getAuthToken();
const response = await authenticatedRequest('GET', '/teams', token);
```

### Scenario 2: POST Request (Authenticated)
```typescript
const token = await getAuthToken();
const response = await authenticatedRequest('POST', '/teams', token, {
  body: { name: 'My Team', slug: 'my-team' }
});
```

### Scenario 3: PATCH Request
```typescript
const token = await getAuthToken();
const response = await authenticatedRequest('PATCH', `/teams/${id}`, token, {
  body: { name: 'Updated Name' }
});
```

### Scenario 4: DELETE Request
```typescript
const token = await getAuthToken();
const response = await authenticatedRequest('DELETE', `/teams/${id}`, token);
```

### Scenario 5: Request with Query Parameters
```typescript
const token = await getAuthToken();
const response = await authenticatedRequest('GET', '/teams', token, {
  query: { page: 1, limit: 10 }
});
```

### Scenario 6: Public POST (Login/Register)
```typescript
const response = await apiRequest('POST', '/auth/login', {
  body: { email: 'user@example.com', password: 'pass' }
});
```

### Scenario 7: Test Unauthorized Access
```typescript
// No token = should return 401
const response = await apiRequest('GET', '/users/me');
expect(response.status).toBe(401);
```

## Available Helper Functions

### Authentication
- `createTestUser()` - Create test user and get credentials with tokens
- `getAuthToken(credentials?)` - Get valid Bearer token

### API Requests
- `authenticatedRequest(method, path, token, options?)` - Authenticated API call
- `apiRequest(method, path, options?)` - Public API call

### Test Data Generators
- `generateUser(overrides?)` - Generate unique user data
- `generateTeam(overrides?)` - Generate unique team data
- `generateProject(overrides?)` - Generate unique project data
- `generateEnvironment(projectId, overrides?)` - Generate unique environment data

### Resource Management
- `createResource(type, data, token)` - Create test resource
- `deleteResource(type, id, token)` - Delete test resource

### Cleanup
- `cleanupTestData()` - Delete all test data
- `cleanupTestUsers()` - Delete test users only

## Checklist Per File

- [ ] Remove `supertest` import
- [ ] Remove `createMockToken` import
- [ ] Add new helper imports
- [ ] Replace all `createMockToken()` with `await getAuthToken()`
- [ ] Replace all `supertest()` calls with `authenticatedRequest()` or `apiRequest()`
- [ ] Consider using test data generators
- [ ] Run tests and verify they pass (or fail for correct reasons)
- [ ] Commit changes

## Files to Refactor (Priority Order)

### High Priority - Easy Wins (Category A - Authenticated)
1. users/get-profile.test.ts
2. users/update-profile.test.ts
3. teams/create-team.test.ts
4. teams/get-team.test.ts
5. teams/list-teams.test.ts
6. teams/update-team.test.ts
7. teams/delete-team.test.ts
8. teams/add-member.test.ts
9. teams/list-members.test.ts
10. projects/projects.test.ts
11. environments/environments.test.ts
12. sessions/sessions.test.ts
13. extensions/extensions.test.ts
14. logs/logs.test.ts

### Medium Priority (Category B - Public)
1. auth/login.test.ts ✅ DONE (Reference Example)
2. auth/register.test.ts

### Low Priority - Needs Review (Category C - Special Auth)
1. auth/refresh.test.ts (uses refresh tokens)
2. auth/oauth.test.ts (OAuth flow)

### Low Priority - Needs Review (Category D - WebSocket)
1. websocket/websocket.test.ts

## Common Mistakes to Avoid

1. **Forgetting `await` with `getAuthToken()`**
   ```typescript
   // WRONG
   const token = getAuthToken(); // Missing await!

   // RIGHT
   const token = await getAuthToken();
   ```

2. **Using `authenticatedRequest()` for public endpoints**
   ```typescript
   // WRONG - Login doesn't need auth
   const token = await getAuthToken();
   const response = await authenticatedRequest('POST', '/auth/login', token, { body });

   // RIGHT
   const response = await apiRequest('POST', '/auth/login', { body });
   ```

3. **Including `/api/v1` prefix in path**
   ```typescript
   // WRONG - API prefix is added automatically
   const response = await authenticatedRequest('GET', '/api/v1/users/me', token);

   // RIGHT
   const response = await authenticatedRequest('GET', '/users/me', token);
   ```

4. **Not removing `supertest` import**
   ```typescript
   // WRONG - Unused import
   import supertest from 'supertest';
   import { authenticatedRequest } from '../helpers/test-utils';

   // RIGHT
   import { authenticatedRequest } from '../helpers/test-utils';
   ```

## Example: Complete File Transformation

**BEFORE** (`users/get-profile.test.ts`):
```typescript
import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { SchemaValidators, createMockToken } from '../helpers/test-utils';

describe('GET /users/me', () => {
  it('should return 200 with user profile when authenticated', async () => {
    const authToken = createMockToken();

    const response = await supertest('http://localhost:3000')
      .get('/api/v1/users/me')
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    SchemaValidators.validateUser(response.body);
  });

  it('should return 401 when no authentication token provided', async () => {
    const response = await supertest('http://localhost:3000')
      .get('/api/v1/users/me');

    expect(response.status).toBe(401);
  });
});
```

**AFTER**:
```typescript
import { describe, it, expect } from 'vitest';
import { SchemaValidators, getAuthToken, authenticatedRequest, apiRequest } from '../helpers/test-utils';

describe('GET /users/me', () => {
  it('should return 200 with user profile when authenticated', async () => {
    const token = await getAuthToken();

    const response = await authenticatedRequest('GET', '/users/me', token);

    expect(response.status).toBe(200);
    SchemaValidators.validateUser(response.body);
  });

  it('should return 401 when no authentication token provided', async () => {
    const response = await apiRequest('GET', '/users/me');

    expect(response.status).toBe(401);
  });
});
```

**Changes**:
- Removed `supertest` import
- Removed `createMockToken` import
- Added `getAuthToken`, `authenticatedRequest`, `apiRequest` imports
- Replaced `createMockToken()` with `await getAuthToken()`
- Replaced `supertest().get().set()` with `authenticatedRequest()`
- Replaced unauthenticated `supertest()` with `apiRequest()`
- Code is now 30% shorter and more readable

## Need Help?

1. Check reference example: `/workspace/backend/tests/contract/auth/login.test.ts`
2. Read full analysis: `/workspace/backend/tests/contract/REFACTORING_ANALYSIS.md`
3. Check helper docs: `/workspace/backend/tests/contract/helpers/test-utils.ts` (TSDoc comments)

## Expected Results

- **Before**: 196 tests, 105 failing (53.6% pass rate) due to invalid tokens
- **After**: >95% pass rate with valid authentication
- **Code**: 30-40% reduction in boilerplate per file
- **Maintenance**: Single source of truth for API base URL and auth handling

---

**Ready to start?** Pick a file from the High Priority list and follow the steps above!
