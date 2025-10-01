/**
 * Authentication Fixtures - VibeBox Frontend
 * Playwright fixtures for authenticated test scenarios
 */

import { test as base, Page } from '@playwright/test';
import {
  createTestUserAndLogin,
  createTestProject,
  createTestTeam,
  cleanupTestUser,
  cleanupTestProject,
  cleanupTestTeam,
  setAuthTokens,
  TestUser,
  TestProject,
  TestTeam,
} from '../helpers/test-helpers';

/**
 * Extended test fixtures with authentication
 */
export interface AuthFixtures {
  /**
   * Authenticated user with stored tokens
   * Automatically creates a test user, logs in, and stores tokens in browser
   *
   * @example
   * test('should access dashboard', async ({ authenticatedUser, page }) => {
   *   await page.goto('/dashboard');
   *   await expect(page.locator('h1')).toContainText('Dashboard');
   * });
   */
  authenticatedUser: TestUser;

  /**
   * Authenticated user with a test project
   * Creates user, project, and stores authentication
   *
   * @example
   * test('should list projects', async ({ authenticatedUserWithProject, page }) => {
   *   await page.goto('/projects');
   *   await expect(page.locator('[data-testid="project-card"]')).toBeVisible();
   * });
   */
  authenticatedUserWithProject: {
    user: TestUser;
    project: TestProject;
  };

  /**
   * Authenticated user with a test team
   * Creates user, team, and stores authentication
   *
   * @example
   * test('should manage team', async ({ authenticatedUserWithTeam, page }) => {
   *   await page.goto('/teams');
   *   await expect(page.locator('[data-testid="team-card"]')).toBeVisible();
   * });
   */
  authenticatedUserWithTeam: {
    user: TestUser;
    team: TestTeam;
  };

  /**
   * Authenticated user with project and team
   * Complete test environment setup
   *
   * @example
   * test('should show team project', async ({ authenticatedUserWithTeamAndProject, page }) => {
   *   await page.goto(`/projects/${project.project.id}`);
   *   await expect(page.locator('[data-testid="team-badge"]')).toBeVisible();
   * });
   */
  authenticatedUserWithTeamAndProject: {
    user: TestUser;
    team: TestTeam;
    project: TestProject;
  };
}

/**
 * Setup authentication tokens in the browser context
 *
 * @param page - Playwright page object
 * @param user - Test user with tokens
 */
async function setupAuthentication(page: Page, user: TestUser): Promise<void> {
  if (!user.accessToken || !user.refreshToken) {
    throw new Error('User tokens not available for authentication setup');
  }

  // Navigate to base URL first to establish domain context
  await page.goto('/');

  // Set authentication tokens in localStorage
  await setAuthTokens(page, user.accessToken, user.refreshToken);
}

/**
 * Extended test with authentication fixtures
 *
 * @example
 * import { test, expect } from './fixtures/auth.fixture';
 *
 * test('authenticated test', async ({ authenticatedUser, page }) => {
 *   // Test with authenticated user
 * });
 */
export const test = base.extend<AuthFixtures>({
  /**
   * Fixture: Authenticated user
   * Creates a test user, logs in, and sets up authentication in browser
   */
  authenticatedUser: async ({ page }, use) => {
    // Setup: Create test user and login
    const testUser = await createTestUserAndLogin();

    // Setup authentication in browser
    await setupAuthentication(page, testUser);

    // Run the test with the authenticated user
    await use(testUser);

    // Teardown: Cleanup test user
    if (testUser.user?.id && testUser.accessToken) {
      await cleanupTestUser(testUser.user.id, testUser.accessToken);
    }
  },

  /**
   * Fixture: Authenticated user with project
   * Creates user, project, and sets up authentication
   */
  authenticatedUserWithProject: async ({ page }, use) => {
    // Setup: Create test user and login
    const testUser = await createTestUserAndLogin();

    if (!testUser.accessToken) {
      throw new Error('Failed to get access token for test user');
    }

    // Setup: Create test project
    const testProject = await createTestProject(testUser.accessToken);

    // Setup authentication in browser
    await setupAuthentication(page, testUser);

    // Run the test with user and project
    await use({
      user: testUser,
      project: testProject,
    });

    // Teardown: Cleanup project and user
    if (testProject.project?.id) {
      await cleanupTestProject(testProject.project.id, testUser.accessToken);
    }

    if (testUser.user?.id) {
      await cleanupTestUser(testUser.user.id, testUser.accessToken);
    }
  },

  /**
   * Fixture: Authenticated user with team
   * Creates user, team, and sets up authentication
   */
  authenticatedUserWithTeam: async ({ page }, use) => {
    // Setup: Create test user and login
    const testUser = await createTestUserAndLogin();

    if (!testUser.accessToken) {
      throw new Error('Failed to get access token for test user');
    }

    // Setup: Create test team
    const testTeam = await createTestTeam(testUser.accessToken);

    // Setup authentication in browser
    await setupAuthentication(page, testUser);

    // Run the test with user and team
    await use({
      user: testUser,
      team: testTeam,
    });

    // Teardown: Cleanup team and user
    if (testTeam.team?.id) {
      await cleanupTestTeam(testTeam.team.id, testUser.accessToken);
    }

    if (testUser.user?.id) {
      await cleanupTestUser(testUser.user.id, testUser.accessToken);
    }
  },

  /**
   * Fixture: Authenticated user with team and project
   * Creates user, team, project (linked to team), and sets up authentication
   */
  authenticatedUserWithTeamAndProject: async ({ page }, use) => {
    // Setup: Create test user and login
    const testUser = await createTestUserAndLogin();

    if (!testUser.accessToken) {
      throw new Error('Failed to get access token for test user');
    }

    // Setup: Create test team
    const testTeam = await createTestTeam(testUser.accessToken);

    if (!testTeam.team?.id) {
      throw new Error('Failed to create test team');
    }

    // Setup: Create test project linked to team
    const testProject = await createTestProject(testUser.accessToken, {
      teamId: testTeam.team.id,
    });

    // Setup authentication in browser
    await setupAuthentication(page, testUser);

    // Run the test with user, team, and project
    await use({
      user: testUser,
      team: testTeam,
      project: testProject,
    });

    // Teardown: Cleanup in reverse order (project -> team -> user)
    if (testProject.project?.id) {
      await cleanupTestProject(testProject.project.id, testUser.accessToken);
    }

    if (testTeam.team?.id) {
      await cleanupTestTeam(testTeam.team.id, testUser.accessToken);
    }

    if (testUser.user?.id) {
      await cleanupTestUser(testUser.user.id, testUser.accessToken);
    }
  },
});

/**
 * Re-export expect from Playwright for convenience
 */
export { expect } from '@playwright/test';
