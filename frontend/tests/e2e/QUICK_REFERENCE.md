# E2E Test Helpers - Quick Reference

## Import Statements

```typescript
// Import test and expect from fixtures (includes authentication)
import { test, expect } from './fixtures/auth.fixture';

// Import helper functions
import {
  apiRequest,
  createTestUserAndLogin,
  createTestProject,
  createTestTeam,
  createTestEnvironment,
  cleanupTestUser,
  cleanupTestProject,
  cleanupTestTeam,
  cleanupTestEnvironment,
  waitForElement,
  waitForApiResponse,
  setAuthTokens,
  clearAuthTokens,
  generateTestId,
  mockData,
} from './helpers/test-helpers';
```

## Quick Examples

### 1. Basic Authenticated Test

```typescript
test('my test', async ({ authenticatedUser, page }) => {
  // User is already logged in, tokens stored
  await page.goto('/dashboard');

  // Use user data
  console.log(authenticatedUser.email);
  console.log(authenticatedUser.accessToken);
});
```

### 2. Test with Project

```typescript
test('my test', async ({ authenticatedUserWithProject, page }) => {
  const { user, project } = authenticatedUserWithProject;

  await page.goto(`/projects/${project.project.id}`);
  // Test project features
});
```

### 3. Test with Team and Project

```typescript
test('my test', async ({ authenticatedUserWithTeamAndProject, page }) => {
  const { user, team, project } = authenticatedUserWithTeamAndProject;

  // Project belongs to team
  await page.goto(`/projects/${project.project.id}`);
});
```

### 4. Manual User Creation

```typescript
test('my test', async ({ page }) => {
  // Create user manually
  const user = await createTestUserAndLogin();

  // Set auth in browser
  await setAuthTokens(page, user.accessToken!, user.refreshToken!);

  // Navigate and test
  await page.goto('/dashboard');

  // Cleanup
  await cleanupTestUser(user.user!.id, user.accessToken!);
});
```

### 5. Direct API Testing

```typescript
test('my test', async ({ authenticatedUser }) => {
  // Make API request directly
  const projects = await apiRequest<Project[]>('/projects', {
    method: 'GET',
    token: authenticatedUser.accessToken,
  });

  expect(projects).toHaveLength(0);
});
```

### 6. Wait for Elements

```typescript
test('my test', async ({ authenticatedUser, page }) => {
  await page.goto('/dashboard');

  // Wait for element with retry
  await waitForElement(page, '[data-testid="dashboard"]', {
    timeout: 5000,
    retries: 3,
  });

  // Element is now visible
  await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
});
```

### 7. Wait for API Response

```typescript
test('my test', async ({ authenticatedUser, page }) => {
  await page.goto('/projects');

  // Wait for API call and get response
  const response = await waitForApiResponse<Project[]>(
    page,
    '/projects',
    { method: 'GET' }
  );

  expect(Array.isArray(response)).toBe(true);
});
```

### 8. Generate Mock Data

```typescript
test('my test', async ({ page }) => {
  // Generate mock user
  const user = mockData.user({
    email: 'custom@example.com',
    displayName: 'Custom User',
  });

  // Generate mock project
  const project = mockData.project({
    name: 'My Project',
  });

  // Use for testing UI components
});
```

### 9. Create Test Resources

```typescript
test('my test', async ({ authenticatedUser, page }) => {
  const token = authenticatedUser.accessToken!;

  // Create team
  const team = await createTestTeam(token);

  // Create project
  const project = await createTestProject(token, {
    teamId: team.team!.id,
  });

  // Create environment
  const env = await createTestEnvironment(token, project.project!.id, {
    baseImage: 'node:20',
  });

  // Cleanup in reverse order
  await cleanupTestEnvironment(env.environment!.id, token);
  await cleanupTestProject(project.project!.id, token);
  await cleanupTestTeam(team.team!.id, token);
});
```

### 10. Generate Unique Test IDs

```typescript
test('my test', async ({ authenticatedUser, page }) => {
  // Generate unique ID for test data
  const uniqueId = generateTestId('project');
  // Result: 'project_1696234567890_abc123'

  const projectName = `Test Project ${uniqueId}`;

  await page.fill('[data-testid="project-name"]', projectName);
});
```

## Common Patterns

### Complete User Flow

```typescript
test('complete flow', async ({ authenticatedUser, page }) => {
  // 1. Create project
  await page.goto('/projects');
  await page.click('[data-testid="create-project"]');
  await page.fill('[data-testid="name"]', 'My Project');
  await page.click('[data-testid="submit"]');

  // 2. Wait for creation
  await waitForApiResponse(page, '/projects', { method: 'POST' });

  // 3. Verify redirect
  await page.waitForURL(/\/projects\/.+/);

  // 4. Check element appears
  await waitForElement(page, '[data-testid="project-header"]');
  await expect(page.locator('h1')).toContainText('My Project');
});
```

### Form Validation Testing

```typescript
test('form validation', async ({ authenticatedUser, page }) => {
  await page.goto('/projects/new');

  // Submit empty form
  await page.click('[data-testid="submit"]');

  // Check validation errors
  await waitForElement(page, '[data-testid="error-name"]');
  await expect(page.locator('[data-testid="error-name"]'))
    .toContainText('Name is required');
});
```

### Error Handling

```typescript
test('error handling', async ({ authenticatedUser, page }) => {
  // Try to access non-existent resource
  await page.goto('/projects/non-existent-id');

  // Wait for error message
  await waitForElement(page, '[data-testid="error-message"]');
  await expect(page.locator('[data-testid="error-message"]'))
    .toContainText('Not found');
});
```

## Best Practices

1. **Always use fixtures for authentication** - Don't create users manually unless necessary
2. **Use data-testid attributes** - More stable than CSS selectors
3. **Wait for API responses** - Ensures data is loaded before assertions
4. **Generate unique test IDs** - Prevents conflicts between parallel tests
5. **Clean up test data** - Fixtures handle this automatically
6. **Use descriptive test names** - Test name should explain what's being tested
7. **Test complete workflows** - Not just isolated actions
8. **Handle async properly** - Always await Playwright actions

## File Locations

- **Test Helpers**: `/workspace/frontend/tests/e2e/helpers/test-helpers.ts`
- **Auth Fixtures**: `/workspace/frontend/tests/e2e/fixtures/auth.fixture.ts`
- **Example Tests**: `/workspace/frontend/tests/e2e/example.spec.ts`
- **Full Documentation**: `/workspace/frontend/tests/e2e/README.md`

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e example.spec.ts

# Run in headed mode
npx playwright test --headed

# Run in debug mode
npx playwright test --debug

# Run specific browser
npx playwright test --project=chromium
```
