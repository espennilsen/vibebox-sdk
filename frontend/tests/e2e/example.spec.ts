/**
 * Example E2E Tests - VibeBox Frontend
 * Demonstrates usage of test helpers and fixtures
 */

import { test, expect } from './fixtures/auth.fixture';
import {
  waitForElement,
  waitForApiResponse,
  mockData,
  generateTestId,
} from './helpers/test-helpers';

/**
 * Example: Basic authentication tests
 */
test.describe('Authentication Flow', () => {
  test('should login successfully with authenticated user fixture', async ({
    authenticatedUser,
    page,
  }) => {
    // Navigate to dashboard (user is already authenticated)
    await page.goto('/dashboard');

    // Wait for dashboard to load
    await waitForElement(page, '[data-testid="dashboard"]');

    // Verify user is logged in
    expect(authenticatedUser.user).toBeDefined();
    expect(authenticatedUser.accessToken).toBeDefined();
  });

  test('should display user information in header', async ({ authenticatedUser, page }) => {
    await page.goto('/dashboard');

    // Wait for user menu to be visible
    await waitForElement(page, '[data-testid="user-menu"]');

    // Check if display name is shown
    const userMenu = page.locator('[data-testid="user-menu"]');
    await expect(userMenu).toContainText(authenticatedUser.displayName);
  });

  test('should logout successfully', async ({ authenticatedUser, page }) => {
    await page.goto('/dashboard');

    // Open user menu
    await page.click('[data-testid="user-menu"]');

    // Click logout
    await page.click('[data-testid="logout-button"]');

    // Should redirect to login page
    await page.waitForURL('/login');

    // Login form should be visible
    await waitForElement(page, '[data-testid="login-form"]');
  });
});

/**
 * Example: Project management tests
 */
test.describe('Project Management', () => {
  test('should display project in project list', async ({
    authenticatedUserWithProject,
    page,
  }) => {
    const { project } = authenticatedUserWithProject;

    // Navigate to projects page
    await page.goto('/projects');

    // Wait for projects to load
    await waitForApiResponse(page, '/projects');

    // Check if project card is visible
    await waitForElement(page, `[data-testid="project-${project.project?.id}"]`);

    // Verify project details
    const projectCard = page.locator(`[data-testid="project-${project.project?.id}"]`);
    await expect(projectCard).toContainText(project.name);
  });

  test('should navigate to project detail page', async ({
    authenticatedUserWithProject,
    page,
  }) => {
    const { project } = authenticatedUserWithProject;

    // Navigate directly to project detail
    await page.goto(`/projects/${project.project?.id}`);

    // Wait for project details to load
    await waitForApiResponse(page, `/projects/${project.project?.id}`);

    // Verify project header
    await waitForElement(page, '[data-testid="project-header"]');
    await expect(page.locator('h1')).toContainText(project.name);
  });

  test('should create a new project', async ({ authenticatedUser, page }) => {
    await page.goto('/projects');

    // Click create project button
    await page.click('[data-testid="create-project-button"]');

    // Fill in project form
    const projectName = `E2E Test Project ${generateTestId()}`;

    await page.fill('[data-testid="project-name-input"]', projectName);
    await page.fill('[data-testid="project-description-input"]', 'Created via E2E test');

    // Submit form
    await page.click('[data-testid="create-project-submit"]');

    // Wait for project creation API call
    await waitForApiResponse(page, '/projects', { method: 'POST' });

    // Should redirect to project detail page
    await page.waitForURL(/\/projects\/.+/);

    // Verify project was created
    await expect(page.locator('h1')).toContainText(projectName);
  });
});

/**
 * Example: Team collaboration tests
 */
test.describe('Team Collaboration', () => {
  test('should display team in teams list', async ({ authenticatedUserWithTeam, page }) => {
    const { team } = authenticatedUserWithTeam;

    // Navigate to teams page
    await page.goto('/teams');

    // Wait for teams to load
    await waitForApiResponse(page, '/teams');

    // Check if team card is visible
    await waitForElement(page, `[data-testid="team-${team.team?.id}"]`);

    // Verify team details
    const teamCard = page.locator(`[data-testid="team-${team.team?.id}"]`);
    await expect(teamCard).toContainText(team.name);
  });

  test('should show project belongs to team', async ({
    authenticatedUserWithTeamAndProject,
    page,
  }) => {
    const { team, project } = authenticatedUserWithTeamAndProject;

    // Navigate to project detail
    await page.goto(`/projects/${project.project?.id}`);

    // Wait for project to load
    await waitForElement(page, '[data-testid="project-header"]');

    // Verify team badge is displayed
    await waitForElement(page, '[data-testid="team-badge"]');
    await expect(page.locator('[data-testid="team-badge"]')).toContainText(team.name);
  });
});

/**
 * Example: Environment management tests
 */
test.describe('Environment Management', () => {
  test('should show empty state when no environments exist', async ({
    authenticatedUserWithProject,
    page,
  }) => {
    const { project } = authenticatedUserWithProject;

    // Navigate to project environments
    await page.goto(`/projects/${project.project?.id}/environments`);

    // Wait for environments list to load
    await waitForElement(page, '[data-testid="environments-list"]');

    // Should show empty state
    await waitForElement(page, '[data-testid="empty-state"]');
    await expect(page.locator('[data-testid="empty-state"]')).toContainText('No environments');
  });
});

/**
 * Example: Using mock data generators
 */
test.describe('Mock Data Usage', () => {
  test('should generate consistent mock data', async ({ page }) => {
    // Generate mock user
    const mockUser = mockData.user({
      displayName: 'Mock User',
      email: 'mock@example.com',
    });

    expect(mockUser.id).toMatch(/^user_test_/);
    expect(mockUser.displayName).toBe('Mock User');
    expect(mockUser.email).toBe('mock@example.com');
    expect(mockUser.timezone).toBe('UTC');
    expect(mockUser.locale).toBe('en-US');
  });

  test('should generate mock project data', async ({ page }) => {
    // Generate mock project
    const mockProject = mockData.project({
      name: 'Mock Project',
      description: 'Mock project description',
    });

    expect(mockProject.id).toMatch(/^project_test_/);
    expect(mockProject.name).toBe('Mock Project');
    expect(mockProject.description).toBe('Mock project description');
  });

  test('should generate mock environment data', async ({ page }) => {
    // Generate mock environment
    const mockEnv = mockData.environment({
      name: 'Mock Environment',
      baseImage: 'node:20',
      status: 'RUNNING',
    });

    expect(mockEnv.id).toMatch(/^env_test_/);
    expect(mockEnv.name).toBe('Mock Environment');
    expect(mockEnv.baseImage).toBe('node:20');
    expect(mockEnv.status).toBe('RUNNING');
  });
});

/**
 * Example: API response testing
 */
test.describe('API Integration', () => {
  test('should handle API responses correctly', async ({ authenticatedUser, page }) => {
    // Navigate to projects page
    await page.goto('/projects');

    // Wait for and verify API response
    const response = await waitForApiResponse<unknown[]>(page, '/projects');

    // Response should be an array
    expect(Array.isArray(response)).toBe(true);
  });

  test('should handle API errors gracefully', async ({ authenticatedUser, page }) => {
    // Try to access non-existent project
    await page.goto('/projects/non-existent-id');

    // Should show error message
    await waitForElement(page, '[data-testid="error-message"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'Project not found'
    );
  });
});
