/**
 * E2E Tests for Project Management Workflows - VibeBox
 *
 * Tests project CRUD operations, filtering, and user/team ownership scenarios.
 * Uses Page Object Model pattern for maintainability.
 *
 * @module tests/e2e/projects
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Page Object Model for Projects List Page
 *
 * Encapsulates interactions with the projects list page to improve
 * test maintainability and reduce code duplication.
 */
class ProjectsPage {
  constructor(private page: Page) {}

  /**
   * Navigate to the projects page
   */
  async goto() {
    await this.page.goto('/projects');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click the "New Project" button to open the creation dialog
   */
  async clickNewProject() {
    await this.page.getByRole('button', { name: /new project/i }).click();
  }

  /**
   * Fill out the project form with provided data
   *
   * @param name - Project name (required)
   * @param description - Project description (optional)
   * @param repositoryUrl - Repository URL (optional)
   */
  async fillProjectForm(name: string, description?: string, repositoryUrl?: string) {
    await this.page.getByLabel(/name/i).fill(name);

    if (description) {
      await this.page.getByLabel(/description/i).fill(description);
    }

    if (repositoryUrl) {
      await this.page.getByLabel(/repository url/i).fill(repositoryUrl);
    }
  }

  /**
   * Submit the project form (create or update)
   */
  async submitForm() {
    await this.page.getByRole('button', { name: /create|update/i }).click();
  }

  /**
   * Cancel the project form dialog
   */
  async cancelForm() {
    await this.page.getByRole('button', { name: /cancel/i }).click();
  }

  /**
   * Search for projects using the search input
   *
   * @param query - Search query string
   */
  async searchProjects(query: string) {
    await this.page.getByPlaceholder(/search projects/i).fill(query);
    // Wait for debounce (300ms)
    await this.page.waitForTimeout(400);
  }

  /**
   * Get a project card by its name
   *
   * @param projectName - Name of the project to find
   */
  getProjectCard(projectName: string) {
    return this.page.locator(`[role="region"]`, { hasText: projectName });
  }

  /**
   * Click the "View Details" button on a specific project card
   *
   * @param projectName - Name of the project
   */
  async viewProjectDetails(projectName: string) {
    const card = this.getProjectCard(projectName);
    await card.getByRole('button', { name: /view details/i }).click();
  }

  /**
   * Open the menu for a specific project card
   *
   * @param projectName - Name of the project
   */
  async openProjectMenu(projectName: string) {
    const card = this.getProjectCard(projectName);
    await card.getByLabel(/more/i).click();
  }

  /**
   * Click the Edit menu item for a specific project
   *
   * @param projectName - Name of the project
   */
  async editProject(projectName: string) {
    await this.openProjectMenu(projectName);
    await this.page.getByRole('menuitem', { name: /edit/i }).click();
  }

  /**
   * Click the Delete menu item for a specific project
   *
   * @param projectName - Name of the project
   */
  async deleteProject(projectName: string) {
    await this.openProjectMenu(projectName);
    await this.page.getByRole('menuitem', { name: /delete/i }).click();
  }

  /**
   * Confirm the deletion in the confirmation dialog
   */
  async confirmDelete() {
    await this.page.getByRole('button', { name: /delete/i }).click();
  }

  /**
   * Cancel the deletion in the confirmation dialog
   */
  async cancelDelete() {
    await this.page.getByRole('button', { name: /cancel/i }).click();
  }

  /**
   * Wait for success notification to appear
   *
   * @param message - Expected notification message
   */
  async waitForSuccessNotification(message: string) {
    await expect(this.page.getByText(message, { exact: false })).toBeVisible();
  }

  /**
   * Wait for error notification to appear
   *
   * @param message - Expected error message
   */
  async waitForErrorNotification(message: string) {
    await expect(this.page.getByText(message, { exact: false })).toBeVisible();
  }

  /**
   * Verify empty state is displayed
   */
  async expectEmptyState() {
    await expect(this.page.getByText(/no projects yet/i)).toBeVisible();
  }

  /**
   * Verify project exists in the list
   *
   * @param projectName - Name of the project
   */
  async expectProjectExists(projectName: string) {
    await expect(this.getProjectCard(projectName)).toBeVisible();
  }

  /**
   * Verify project does not exist in the list
   *
   * @param projectName - Name of the project
   */
  async expectProjectNotExists(projectName: string) {
    await expect(this.getProjectCard(projectName)).not.toBeVisible();
  }
}

/**
 * Page Object Model for Project Detail Page
 *
 * Encapsulates interactions with the project detail page.
 */
class ProjectDetailPage {
  constructor(private page: Page) {}

  /**
   * Navigate to a specific project detail page
   *
   * @param projectId - ID of the project
   */
  async goto(projectId: string) {
    await this.page.goto(`/projects/${projectId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click the Edit button to open the project edit form
   */
  async clickEdit() {
    await this.page.getByRole('button', { name: /^edit$/i }).click();
  }

  /**
   * Click the "New Environment" button
   */
  async clickNewEnvironment() {
    await this.page.getByRole('button', { name: /new environment/i }).click();
  }

  /**
   * Click the "Back to Projects" button
   */
  async clickBackToProjects() {
    await this.page.getByRole('button', { name: /back to projects/i }).click();
  }

  /**
   * Verify project title is displayed
   *
   * @param projectName - Expected project name
   */
  async expectProjectTitle(projectName: string) {
    await expect(this.page.getByRole('heading', { name: projectName })).toBeVisible();
  }

  /**
   * Verify project description is displayed
   *
   * @param description - Expected description text
   */
  async expectProjectDescription(description: string) {
    await expect(this.page.getByText(description)).toBeVisible();
  }

  /**
   * Verify environment count in the tab label
   *
   * @param count - Expected number of environments
   */
  async expectEnvironmentCount(count: number) {
    await expect(
      this.page.getByRole('tab', { name: new RegExp(`environments.*${count}`, 'i') })
    ).toBeVisible();
  }
}

/**
 * Test data generator for creating unique project names
 */
function generateProjectName(): string {
  return `Test Project ${Date.now()}`;
}

/**
 * Setup test authentication by mocking the API
 * This will be replaced with actual auth when backend is ready
 */
test.beforeEach(async ({ page }) => {
  // Mock authentication - set token in localStorage
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('vibebox_token', 'test-token');
    localStorage.setItem('vibebox_refresh_token', 'test-refresh-token');
  });
});

/**
 * Test Suite: Project Creation
 *
 * Tests all aspects of creating new projects, including validation
 * and error handling.
 */
test.describe('Project Creation', () => {
  test('should display empty state when no projects exist', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    // Verify empty state is shown
    await projectsPage.expectEmptyState();
    await expect(page.getByText(/create your first project/i)).toBeVisible();

    // Verify "Create Project" action button exists
    await expect(page.getByRole('button', { name: /create project/i })).toBeVisible();
  });

  test('should open and close project creation dialog', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    // Open dialog
    await projectsPage.clickNewProject();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/create project/i)).toBeVisible();

    // Close dialog
    await projectsPage.cancelForm();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    await projectsPage.clickNewProject();

    // Try to submit without filling name (required field)
    await projectsPage.submitForm();

    // Form should not submit (dialog still visible)
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should validate repository URL format', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    await projectsPage.clickNewProject();

    // Fill form with invalid repository URL
    await projectsPage.fillProjectForm(
      generateProjectName(),
      'Test Description',
      'invalid-url'
    );

    await projectsPage.submitForm();

    // Verify error message for invalid URL
    await expect(page.getByText(/valid http or https url/i)).toBeVisible();
  });

  test('should create project with only required fields', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    const projectName = generateProjectName();

    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(projectName);
    await projectsPage.submitForm();

    // Wait for success notification
    await projectsPage.waitForSuccessNotification('Project created successfully');

    // Verify project appears in list
    await projectsPage.expectProjectExists(projectName);
  });

  test('should create project with all fields', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    const projectName = generateProjectName();
    const description = 'A comprehensive test project';
    const repositoryUrl = 'https://github.com/test/repo';

    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(projectName, description, repositoryUrl);
    await projectsPage.submitForm();

    // Wait for success notification
    await projectsPage.waitForSuccessNotification('Project created successfully');

    // Verify project appears in list
    await projectsPage.expectProjectExists(projectName);
    await expect(page.getByText(description)).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/v1/projects', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to create project',
        }),
      });
    });

    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(generateProjectName());
    await projectsPage.submitForm();

    // Verify error notification
    await projectsPage.waitForErrorNotification('Failed to create project');

    // Dialog should remain open for retry
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});

/**
 * Test Suite: Project List Display
 *
 * Tests project list rendering, pagination, and filtering.
 */
test.describe('Project List Display', () => {
  test('should display multiple projects in grid layout', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    // Create multiple projects
    const projectNames = [
      generateProjectName(),
      generateProjectName(),
      generateProjectName(),
    ];

    for (const name of projectNames) {
      await projectsPage.clickNewProject();
      await projectsPage.fillProjectForm(name);
      await projectsPage.submitForm();
      await page.waitForTimeout(500); // Wait for creation
    }

    // Verify all projects are visible
    for (const name of projectNames) {
      await projectsPage.expectProjectExists(name);
    }
  });

  test('should display environment count on project cards', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    const projectName = generateProjectName();

    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(projectName);
    await projectsPage.submitForm();

    // Verify environment count is displayed (initially 0)
    const card = projectsPage.getProjectCard(projectName);
    await expect(card.getByText(/0 environments/i)).toBeVisible();
  });

  test('should filter projects by name', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    // Create projects with distinct names
    const project1 = 'Alpha Project ' + Date.now();
    const project2 = 'Beta Project ' + Date.now();

    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(project1);
    await projectsPage.submitForm();
    await page.waitForTimeout(500);

    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(project2);
    await projectsPage.submitForm();
    await page.waitForTimeout(500);

    // Search for "Alpha"
    await projectsPage.searchProjects('Alpha');

    // Only Alpha project should be visible
    await projectsPage.expectProjectExists(project1);
    await projectsPage.expectProjectNotExists(project2);

    // Clear search
    await projectsPage.searchProjects('');

    // Both projects should be visible
    await projectsPage.expectProjectExists(project1);
    await projectsPage.expectProjectExists(project2);
  });

  test('should filter projects by description', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    const project1 = generateProjectName();
    const project2 = generateProjectName();

    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(project1, 'Contains keyword TESTABLE');
    await projectsPage.submitForm();
    await page.waitForTimeout(500);

    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(project2, 'Different description');
    await projectsPage.submitForm();
    await page.waitForTimeout(500);

    // Search for keyword in description
    await projectsPage.searchProjects('TESTABLE');

    // Only project with matching description should be visible
    await projectsPage.expectProjectExists(project1);
    await projectsPage.expectProjectNotExists(project2);
  });

  test('should show "no results" message when search has no matches', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    // Create a project
    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(generateProjectName());
    await projectsPage.submitForm();
    await page.waitForTimeout(500);

    // Search for non-existent project
    await projectsPage.searchProjects('NonExistentProject12345');

    // Verify "no projects found" message
    await expect(page.getByText(/no projects found/i)).toBeVisible();
    await expect(page.getByText(/try adjusting your search/i)).toBeVisible();
  });
});

/**
 * Test Suite: Project Detail View
 *
 * Tests viewing and navigating to project details.
 */
test.describe('Project Detail View', () => {
  test('should navigate to project detail page', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    const projectName = generateProjectName();

    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(projectName, 'Detail test project');
    await projectsPage.submitForm();
    await page.waitForTimeout(500);

    // Click "View Details"
    await projectsPage.viewProjectDetails(projectName);

    // Verify we're on the detail page
    const detailPage = new ProjectDetailPage(page);
    await detailPage.expectProjectTitle(projectName);
    await detailPage.expectProjectDescription('Detail test project');

    // Verify URL contains project ID
    await expect(page).toHaveURL(/\/projects\/[a-z0-9-]+$/);
  });

  test('should display project information on detail page', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    const projectName = generateProjectName();
    const description = 'Detailed project description';

    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(projectName, description);
    await projectsPage.submitForm();
    await page.waitForTimeout(500);

    await projectsPage.viewProjectDetails(projectName);

    const detailPage = new ProjectDetailPage(page);
    await detailPage.expectProjectTitle(projectName);
    await detailPage.expectProjectDescription(description);
    await detailPage.expectEnvironmentCount(0);
  });

  test('should navigate back to projects list', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    const projectName = generateProjectName();

    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(projectName);
    await projectsPage.submitForm();
    await page.waitForTimeout(500);

    await projectsPage.viewProjectDetails(projectName);

    // Click "Back to Projects"
    const detailPage = new ProjectDetailPage(page);
    await detailPage.clickBackToProjects();

    // Verify we're back on the projects list page
    await expect(page).toHaveURL(/\/projects$/);
    await projectsPage.expectProjectExists(projectName);
  });

  test('should show edit button on detail page', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    const projectName = generateProjectName();

    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(projectName);
    await projectsPage.submitForm();
    await page.waitForTimeout(500);

    await projectsPage.viewProjectDetails(projectName);

    // Verify Edit button is present
    await expect(page.getByRole('button', { name: /^edit$/i })).toBeVisible();
  });

  test('should show new environment button on detail page', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    const projectName = generateProjectName();

    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(projectName);
    await projectsPage.submitForm();
    await page.waitForTimeout(500);

    await projectsPage.viewProjectDetails(projectName);

    // Verify New Environment button is present
    await expect(page.getByRole('button', { name: /new environment/i })).toBeVisible();
  });
});

/**
 * Test Suite: Project Update
 *
 * Tests updating existing projects including validation.
 */
test.describe('Project Update', () => {
  test('should open edit dialog with pre-filled data', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    const originalName = generateProjectName();
    const description = 'Original description';
    const repoUrl = 'https://github.com/original/repo';

    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(originalName, description, repoUrl);
    await projectsPage.submitForm();
    await page.waitForTimeout(500);

    // Open edit dialog
    await projectsPage.editProject(originalName);

    // Verify dialog title
    await expect(page.getByText(/edit project/i)).toBeVisible();

    // Verify fields are pre-filled
    await expect(page.getByLabel(/name/i)).toHaveValue(originalName);
    await expect(page.getByLabel(/description/i)).toHaveValue(description);
    await expect(page.getByLabel(/repository url/i)).toHaveValue(repoUrl);
  });

  test('should update project name', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    const originalName = generateProjectName();
    const newName = generateProjectName();

    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(originalName);
    await projectsPage.submitForm();
    await page.waitForTimeout(500);

    // Edit project
    await projectsPage.editProject(originalName);

    // Update name
    await page.getByLabel(/name/i).fill(newName);
    await projectsPage.submitForm();

    // Wait for success notification
    await projectsPage.waitForSuccessNotification('Project updated successfully');

    // Verify old name is gone and new name is visible
    await projectsPage.expectProjectNotExists(originalName);
    await projectsPage.expectProjectExists(newName);
  });

  test('should update project description', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    const projectName = generateProjectName();
    const originalDescription = 'Original description';
    const newDescription = 'Updated description';

    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(projectName, originalDescription);
    await projectsPage.submitForm();
    await page.waitForTimeout(500);

    // Edit project
    await projectsPage.editProject(projectName);

    // Update description
    await page.getByLabel(/description/i).fill(newDescription);
    await projectsPage.submitForm();

    // Wait for success notification
    await projectsPage.waitForSuccessNotification('Project updated successfully');

    // Verify new description is visible
    await expect(page.getByText(newDescription)).toBeVisible();
    await expect(page.getByText(originalDescription)).not.toBeVisible();
  });

  test('should update repository URL', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    const projectName = generateProjectName();
    const originalUrl = 'https://github.com/original/repo';
    const newUrl = 'https://github.com/updated/repo';

    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(projectName, 'Description', originalUrl);
    await projectsPage.submitForm();
    await page.waitForTimeout(500);

    // Edit project
    await projectsPage.editProject(projectName);

    // Update repository URL
    await page.getByLabel(/repository url/i).fill(newUrl);
    await projectsPage.submitForm();

    // Wait for success notification
    await projectsPage.waitForSuccessNotification('Project updated successfully');

    // Open edit dialog again to verify URL was saved
    await projectsPage.editProject(projectName);
    await expect(page.getByLabel(/repository url/i)).toHaveValue(newUrl);
  });

  test('should update project from detail page', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    const originalName = generateProjectName();
    const newName = generateProjectName();

    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(originalName);
    await projectsPage.submitForm();
    await page.waitForTimeout(500);

    // Navigate to detail page
    await projectsPage.viewProjectDetails(originalName);

    // Click Edit button on detail page
    const detailPage = new ProjectDetailPage(page);
    await detailPage.clickEdit();

    // Update name
    await page.getByLabel(/name/i).fill(newName);
    await projectsPage.submitForm();

    // Verify title updated on detail page
    await detailPage.expectProjectTitle(newName);
  });

  test('should validate required fields during update', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    const projectName = generateProjectName();

    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(projectName);
    await projectsPage.submitForm();
    await page.waitForTimeout(500);

    // Edit project
    await projectsPage.editProject(projectName);

    // Clear name field (required)
    await page.getByLabel(/name/i).clear();
    await projectsPage.submitForm();

    // Form should not submit
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should validate repository URL format during update', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    const projectName = generateProjectName();

    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(projectName);
    await projectsPage.submitForm();
    await page.waitForTimeout(500);

    // Edit project
    await projectsPage.editProject(projectName);

    // Enter invalid URL
    await page.getByLabel(/repository url/i).fill('not-a-valid-url');
    await projectsPage.submitForm();

    // Verify error message
    await expect(page.getByText(/valid http or https url/i)).toBeVisible();
  });

  test('should cancel update without saving changes', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    const originalName = generateProjectName();
    const originalDescription = 'Original description';

    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(originalName, originalDescription);
    await projectsPage.submitForm();
    await page.waitForTimeout(500);

    // Edit project
    await projectsPage.editProject(originalName);

    // Make changes but cancel
    await page.getByLabel(/name/i).fill('Changed Name');
    await page.getByLabel(/description/i).fill('Changed Description');
    await projectsPage.cancelForm();

    // Verify original data is still visible
    await projectsPage.expectProjectExists(originalName);
    await expect(page.getByText(originalDescription)).toBeVisible();
  });
});

/**
 * Test Suite: Project Deletion
 *
 * Tests deleting projects with confirmation dialog.
 */
test.describe('Project Deletion', () => {
  test('should show confirmation dialog before deleting', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    const projectName = generateProjectName();

    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(projectName);
    await projectsPage.submitForm();
    await page.waitForTimeout(500);

    // Initiate delete
    await projectsPage.deleteProject(projectName);

    // Verify confirmation dialog
    await expect(page.getByText(/delete project/i)).toBeVisible();
    await expect(page.getByText(new RegExp(`delete.*${projectName}`, 'i'))).toBeVisible();
    await expect(page.getByText(/delete all associated environments/i)).toBeVisible();
  });

  test('should delete project when confirmed', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    const projectName = generateProjectName();

    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(projectName);
    await projectsPage.submitForm();
    await page.waitForTimeout(500);

    // Delete project
    await projectsPage.deleteProject(projectName);
    await projectsPage.confirmDelete();

    // Wait for success notification
    await projectsPage.waitForSuccessNotification('Project deleted successfully');

    // Verify project is removed from list
    await projectsPage.expectProjectNotExists(projectName);
  });

  test('should not delete project when cancelled', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    const projectName = generateProjectName();

    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(projectName);
    await projectsPage.submitForm();
    await page.waitForTimeout(500);

    // Initiate delete but cancel
    await projectsPage.deleteProject(projectName);
    await projectsPage.cancelDelete();

    // Verify project still exists
    await projectsPage.expectProjectExists(projectName);
  });

  test('should handle deletion errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/v1/projects/*', (route) => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Failed to delete project',
          }),
        });
      } else {
        route.continue();
      }
    });

    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    const projectName = generateProjectName();

    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(projectName);
    await projectsPage.submitForm();
    await page.waitForTimeout(500);

    // Attempt to delete
    await projectsPage.deleteProject(projectName);
    await projectsPage.confirmDelete();

    // Verify error notification
    await projectsPage.waitForErrorNotification('Failed to delete project');

    // Project should still exist
    await projectsPage.expectProjectExists(projectName);
  });
});

/**
 * Test Suite: Project Ownership
 *
 * Tests user vs team ownership scenarios.
 */
test.describe('Project Ownership', () => {
  test('should create user-owned project by default', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    const projectName = generateProjectName();

    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(projectName);
    await projectsPage.submitForm();
    await page.waitForTimeout(500);

    // Verify project is created and visible
    await projectsPage.expectProjectExists(projectName);

    // User-owned projects should not show team information
    const card = projectsPage.getProjectCard(projectName);
    await expect(card.getByText(/team/i)).not.toBeVisible();
  });

  test('should create team-owned project when team is specified', async ({ page }) => {
    // Note: This test assumes team creation is implemented
    // For now, we test the UI behavior when teamId is provided
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    const projectName = generateProjectName();

    // Mock project creation with teamId
    await page.route('**/api/v1/projects', async (route) => {
      if (route.request().method() === 'POST') {
        const postData = JSON.parse(route.request().postData() || '{}');
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'team-project-id',
            ...postData,
            teamId: 'test-team-id',
            ownerId: 'current-user-id',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            team: {
              id: 'test-team-id',
              name: 'Test Team',
            },
          }),
        });
      } else {
        route.continue();
      }
    });

    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(projectName, 'Team project');
    await projectsPage.submitForm();

    // Verify project is created
    await projectsPage.waitForSuccessNotification('Project created successfully');
  });
});

/**
 * Test Suite: Keyboard Navigation and Accessibility
 *
 * Tests keyboard shortcuts and accessibility features.
 */
test.describe('Keyboard Navigation and Accessibility', () => {
  test('should navigate project form with keyboard', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    await projectsPage.clickNewProject();

    // Name field should be auto-focused
    const nameInput = page.getByLabel(/name/i);
    await expect(nameInput).toBeFocused();

    // Tab to description
    await page.keyboard.press('Tab');
    const descriptionInput = page.getByLabel(/description/i);
    await expect(descriptionInput).toBeFocused();

    // Tab to repository URL
    await page.keyboard.press('Tab');
    const repoInput = page.getByLabel(/repository url/i);
    await expect(repoInput).toBeFocused();
  });

  test('should close dialog with Escape key', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    await projectsPage.clickNewProject();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Dialog should be closed
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should submit form with Enter key', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    const projectName = generateProjectName();

    await projectsPage.clickNewProject();
    await page.getByLabel(/name/i).fill(projectName);

    // Press Enter to submit
    await page.keyboard.press('Enter');

    // Wait for success notification
    await projectsPage.waitForSuccessNotification('Project created successfully');
  });

  test('should have accessible labels and ARIA attributes', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    await projectsPage.clickNewProject();

    // Verify dialog has proper ARIA attributes
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Verify form fields have accessible labels
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByLabel(/description/i)).toBeVisible();
    await expect(page.getByLabel(/repository url/i)).toBeVisible();
  });
});
