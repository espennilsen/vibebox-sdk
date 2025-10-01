# VibeBox E2E Test Suite

Comprehensive end-to-end testing framework for VibeBox frontend using Playwright with custom helpers and fixtures.

## Overview

This E2E test suite provides:

- **Test Helpers**: Reusable functions for API requests, data creation, and cleanup
- **Authentication Fixtures**: Pre-configured authenticated test scenarios
- **Mock Data Generators**: Consistent test data generation
- **Wait Utilities**: Reliable element and API response waiting

## Directory Structure

```
tests/e2e/
├── fixtures/
│   └── auth.fixture.ts          # Authentication fixtures
├── helpers/
│   └── test-helpers.ts          # Reusable test helper functions
├── auth.spec.ts                 # Authentication flow E2E tests (26 scenarios)
├── example.spec.ts              # Example tests demonstrating usage
└── README.md                    # This file
```

## Quick Start

### Prerequisites

**1. Install Playwright Browsers**
```bash
cd frontend
npx playwright install
# If prompted, install system dependencies:
sudo npx playwright install-deps
```

**2. Start Backend Services**
```bash
# From project root
npm run docker:up        # Start PostgreSQL
cd backend
npm run migrate          # Run database migrations
npm run dev              # Start backend API on http://localhost:3001
```

**3. Start Frontend Development Server**
```bash
# In a separate terminal
cd frontend
npm run dev              # Start frontend on http://localhost:5173
```

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e auth.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run in debug mode with Playwright Inspector
npx playwright test --debug

# Run specific browser
npx playwright test --project=chromium

# Show HTML test report
npx playwright show-report
```

### Basic Test Example

```typescript
import { test, expect } from './fixtures/auth.fixture';

test('should access dashboard', async ({ authenticatedUser, page }) => {
  await page.goto('/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard');
});
```

## Test Suites

### Authentication Flow Tests (`auth.spec.ts`)

Comprehensive authentication E2E tests covering the complete user authentication lifecycle:

**Test Groups:**
1. **User Registration** (7 tests)
   - Form display and validation
   - Email format validation
   - Password matching and length requirements
   - Successful registration flow
   - Duplicate email handling
   - Navigation between login/register pages

2. **User Login** (6 tests)
   - Form display and validation
   - Required field validation
   - Invalid credentials handling
   - Successful login flow
   - Loading state indication
   - Navigation links

3. **Token Persistence** (3 tests)
   - Authentication persists after page refresh
   - Token storage across route navigation
   - Graceful token expiration handling

4. **Logout Flow** (2 tests)
   - Session cleanup and token removal
   - Protected route access prevention after logout

5. **Protected Routes** (5 tests)
   - Redirect to login when unauthenticated
   - Protection of all authenticated routes
   - Redirect to original destination after login
   - Loading state during authentication check
   - Public route accessibility

6. **Edge Cases** (3 tests)
   - Network error handling
   - Rapid form submission protection
   - Email input whitespace trimming

**Total Coverage**: 26 test scenarios × 3 browsers (Chromium, Firefox, WebKit) = 78 tests

**Key Features**:
- Page Object Model pattern for maintainability
- Unique test data generation to avoid conflicts
- Proper wait strategies for async operations
- Clean state management between tests
- Comprehensive error scenario coverage

**Running Auth Tests Only**:
```bash
npm run test:e2e auth.spec.ts
```

## Test Helpers

### API Helpers

#### `apiRequest<T>(endpoint, options)`

Make authenticated API requests directly to the backend.

```typescript
import { apiRequest } from './helpers/test-helpers';

const response = await apiRequest<{ projects: Project[] }>('/projects', {
  method: 'GET',
  token: user.accessToken,
});
```

#### `createTestUserAndLogin(userData?)`

Create a test user and authenticate.

```typescript
const testUser = await createTestUserAndLogin({
  email: 'custom@example.com',
  displayName: 'Custom User',
});

console.log(testUser.accessToken); // Use for API requests
console.log(testUser.user); // User data
```

#### `loginUser(email, password)`

Login with existing credentials.

```typescript
const { accessToken, user } = await loginUser('test@example.com', 'password123');
```

#### `createTestProject(token, projectData?)`

Create a test project.

```typescript
const testProject = await createTestProject(user.accessToken, {
  name: 'My Test Project',
  slug: 'my-test-project',
  teamId: team.id, // Optional
});
```

#### `createTestTeam(token, teamData?)`

Create a test team.

```typescript
const testTeam = await createTestTeam(user.accessToken, {
  name: 'My Test Team',
  slug: 'my-test-team',
});
```

#### `createTestEnvironment(token, projectId, envData?)`

Create a test environment.

```typescript
const testEnv = await createTestEnvironment(user.accessToken, project.id, {
  name: 'Development',
  baseImage: 'node:20',
});
```

### Cleanup Helpers

Automatic cleanup is handled by fixtures, but manual cleanup is available:

```typescript
import {
  cleanupTestUser,
  cleanupTestProject,
  cleanupTestTeam,
  cleanupTestEnvironment,
} from './helpers/test-helpers';

// Cleanup in reverse order of creation
await cleanupTestEnvironment(env.id, token);
await cleanupTestProject(project.id, token);
await cleanupTestTeam(team.id, token);
await cleanupTestUser(user.id, token);
```

### Browser Helpers

#### `waitForElement(page, selector, options?)`

Wait for element with retry logic.

```typescript
import { waitForElement } from './helpers/test-helpers';

await waitForElement(page, '[data-testid="dashboard"]', {
  timeout: 5000,
  retries: 3,
});
```

#### `waitForApiResponse<T>(page, endpoint, options?)`

Wait for specific API response.

```typescript
import { waitForApiResponse } from './helpers/test-helpers';

const response = await waitForApiResponse<{ projects: Project[] }>(page, '/projects', {
  timeout: 10000,
  method: 'GET',
});
```

#### `setAuthTokens(page, accessToken, refreshToken)`

Set authentication tokens in browser storage.

```typescript
import { setAuthTokens } from './helpers/test-helpers';

await setAuthTokens(page, user.accessToken, user.refreshToken);
```

#### `clearAuthTokens(page)`

Clear authentication tokens from browser storage.

```typescript
import { clearAuthTokens } from './helpers/test-helpers';

await clearAuthTokens(page);
```

### Mock Data Generators

Generate consistent mock data for testing.

```typescript
import { mockData } from './helpers/test-helpers';

// Generate mock user
const user = mockData.user({
  displayName: 'Test User',
  email: 'test@example.com',
});

// Generate mock project
const project = mockData.project({
  name: 'Test Project',
  slug: 'test-project',
});

// Generate mock environment
const env = mockData.environment({
  name: 'Test Environment',
  baseImage: 'ubuntu:22.04',
  status: 'running',
});

// Generate mock team
const team = mockData.team({
  name: 'Test Team',
  slug: 'test-team',
});
```

### Utility Functions

#### `generateTestId(prefix?)`

Generate unique test identifier.

```typescript
import { generateTestId } from './helpers/test-helpers';

const id = generateTestId('project'); // 'project_1696234567890_abc123'
```

## Authentication Fixtures

### Available Fixtures

#### `authenticatedUser`

Pre-authenticated user with tokens stored in browser.

```typescript
test('my test', async ({ authenticatedUser, page }) => {
  // User is already logged in
  console.log(authenticatedUser.email);
  console.log(authenticatedUser.accessToken);
  console.log(authenticatedUser.user);

  await page.goto('/dashboard');
  // Test authenticated routes
});
```

**Automatic cleanup**: User is deleted after test completes.

#### `authenticatedUserWithProject`

Authenticated user with a test project.

```typescript
test('my test', async ({ authenticatedUserWithProject, page }) => {
  const { user, project } = authenticatedUserWithProject;

  await page.goto(`/projects/${project.project.id}`);
  // Test project-related features
});
```

**Automatic cleanup**: Project and user are deleted after test completes.

#### `authenticatedUserWithTeam`

Authenticated user with a test team.

```typescript
test('my test', async ({ authenticatedUserWithTeam, page }) => {
  const { user, team } = authenticatedUserWithTeam;

  await page.goto(`/teams/${team.team.id}`);
  // Test team-related features
});
```

**Automatic cleanup**: Team and user are deleted after test completes.

#### `authenticatedUserWithTeamAndProject`

Authenticated user with team and project (project belongs to team).

```typescript
test('my test', async ({ authenticatedUserWithTeamAndProject, page }) => {
  const { user, team, project } = authenticatedUserWithTeamAndProject;

  await page.goto(`/projects/${project.project.id}`);
  // Test team collaboration features
});
```

**Automatic cleanup**: Project, team, and user are deleted after test completes.

## Writing Tests

### Test Structure

Follow the AAA pattern (Arrange, Act, Assert):

```typescript
import { test, expect } from './fixtures/auth.fixture';
import { waitForElement, waitForApiResponse } from './helpers/test-helpers';

test.describe('Feature Name', () => {
  test('should perform action', async ({ authenticatedUser, page }) => {
    // Arrange: Setup test data and navigate
    await page.goto('/projects');

    // Act: Perform user actions
    await page.click('[data-testid="create-project-button"]');
    await page.fill('[data-testid="project-name"]', 'New Project');
    await page.click('[data-testid="submit-button"]');

    // Assert: Verify expected outcomes
    await waitForApiResponse(page, '/projects', { method: 'POST' });
    await expect(page.locator('h1')).toContainText('New Project');
  });
});
```

### Best Practices

1. **Use data-testid attributes**: Prefer `[data-testid="element-id"]` over fragile CSS selectors
2. **Wait for API responses**: Use `waitForApiResponse` to ensure data is loaded
3. **Use fixtures for authentication**: Don't manually create users in each test
4. **Clean up test data**: Fixtures handle cleanup automatically
5. **Write descriptive test names**: Test name should explain what is being tested
6. **Test user workflows**: Focus on complete user journeys, not isolated actions
7. **Handle async operations**: Always await Playwright actions and API calls
8. **Use TypeScript types**: Leverage shared types from `@vibebox/types`

### Example: Complete User Flow

```typescript
test.describe('Project Creation Flow', () => {
  test('should create project, add environment, and start it', async ({
    authenticatedUser,
    page,
  }) => {
    // Navigate to projects
    await page.goto('/projects');
    await waitForElement(page, '[data-testid="projects-list"]');

    // Create new project
    await page.click('[data-testid="create-project-button"]');
    await page.fill('[data-testid="project-name"]', 'My New Project');
    await page.fill('[data-testid="project-slug"]', 'my-new-project');
    await page.click('[data-testid="submit-button"]');

    // Wait for project creation and redirect
    const projectResponse = await waitForApiResponse(page, '/projects', { method: 'POST' });
    await page.waitForURL(/\/projects\/.+/);

    // Add environment
    await page.click('[data-testid="add-environment-button"]');
    await page.fill('[data-testid="env-name"]', 'Development');
    await page.fill('[data-testid="env-slug"]', 'dev');
    await page.selectOption('[data-testid="base-image"]', 'node:20');
    await page.click('[data-testid="create-env-button"]');

    // Wait for environment creation
    await waitForApiResponse(page, '/environments', { method: 'POST' });
    await waitForElement(page, '[data-testid="environment-card"]');

    // Start environment
    await page.click('[data-testid="start-environment-button"]');
    await waitForApiResponse(page, '/start', { method: 'POST' });

    // Verify environment is running
    await waitForElement(page, '[data-testid="status-running"]');
    await expect(page.locator('[data-testid="status-running"]')).toBeVisible();
  });
});
```

## Debugging Tests

### Visual Debugging

```bash
# Run in headed mode
npx playwright test --headed

# Run in debug mode (opens Playwright Inspector)
npx playwright test --debug

# Run specific test in debug mode
npx playwright test example.spec.ts:10 --debug
```

### Screenshots and Videos

Playwright automatically captures screenshots on failure. To capture videos:

```typescript
// In playwright.config.ts
use: {
  video: 'retain-on-failure',
  screenshot: 'only-on-failure',
}
```

### Console Output

Add console logging in tests:

```typescript
test('debug test', async ({ authenticatedUser, page }) => {
  console.log('User:', authenticatedUser.user);
  console.log('Token:', authenticatedUser.accessToken);

  // Listen to browser console
  page.on('console', (msg) => console.log('Browser:', msg.text()));

  await page.goto('/dashboard');
});
```

### Trace Viewer

```bash
# Generate trace
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

## Configuration

### Environment Variables

Configure API endpoints in `.env` or `.env.test`:

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_WS_BASE_URL=ws://localhost:3001/api/v1/ws
```

### Playwright Configuration

See `playwright.config.ts` for test configuration:

- **baseURL**: Frontend URL (default: http://localhost:5173)
- **timeout**: Test timeout (default: 30s)
- **retries**: Number of retries on failure (2 in CI, 0 locally)
- **workers**: Parallel workers (1 in CI, auto locally)

## Continuous Integration

### Running in CI

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Start services
        run: npm run docker:up
      - name: Run E2E tests
        run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Troubleshooting

### Common Issues

#### Tests timing out

- Increase timeout in `playwright.config.ts`
- Check if backend is running
- Verify API_BASE_URL is correct

#### Authentication failures

- Ensure backend auth endpoints are working
- Check token storage in localStorage
- Verify fixture cleanup isn't interfering

#### Element not found

- Use `waitForElement` instead of direct selectors
- Check if element has correct `data-testid`
- Verify element is visible (not hidden or covered)

#### API request failures

- Check backend logs for errors
- Verify request payload matches API contract
- Ensure authentication token is valid

### Getting Help

1. Check example tests in `example.spec.ts`
2. Review Playwright documentation: https://playwright.dev
3. Check test helper JSDoc comments
4. Review backend API documentation in `.claude/api_reference.md`

## Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [VibeBox API Reference](../../.claude/api_reference.md)
- [TypeScript Types](../../../shared/types/src/index.ts)
- [Frontend Architecture](../../src/README.md)
