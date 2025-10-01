/**
 * Environment Lifecycle E2E Tests - VibeBox Frontend
 *
 * Comprehensive Playwright tests for the critical environment management workflow.
 * Tests cover the complete lifecycle: create, view, start, stop, restart, configure, and delete.
 *
 * Test Coverage (27 tests across 10 suites):
 * 1. Environment Creation (4 tests)
 *    - Create with valid data and form validation
 *    - Validate required fields
 *    - Validate resource limits (CPU, memory, disk)
 *    - Base image selection
 *
 * 2. Environment Viewing (4 tests)
 *    - Display in project list
 *    - Navigate to detail page
 *    - Display details in overview tab
 *    - Tab navigation
 *
 * 3. Environment Start (3 tests)
 *    - Start stopped environment with status transitions (STOPPED → STARTING → RUNNING)
 *    - Loading state during start
 *    - Real-time status updates via WebSocket
 *
 * 4. Environment Stop (1 test)
 *    - Stop running environment with status transitions (RUNNING → STOPPING → STOPPED)
 *
 * 5. Environment Restart (1 test)
 *    - Restart running environment
 *
 * 6. Port Mappings Management (3 tests)
 *    - Add new port mapping
 *    - Validate port numbers (1-65535)
 *    - Remove port mapping
 *
 * 7. Environment Variables Management (3 tests)
 *    - Add regular environment variable
 *    - Add secret variable with masking
 *    - Remove environment variable
 *
 * 8. Environment Deletion (2 tests)
 *    - Delete with confirmation dialog
 *    - Cancel deletion
 *
 * 9. Error Handling (4 tests)
 *    - Handle startup failure
 *    - Handle port conflict error
 *    - Handle network errors
 *    - Handle non-existent environment
 *
 * 10. Navigation (2 tests)
 *     - Back to project navigation
 *     - Tab switching
 *
 * @module tests/e2e/environments
 */

import { test, expect, type Page } from '@playwright/test';

/**
 * Test data and configuration
 */
const TEST_USER = {
  email: 'test@vibebox.dev',
  password: 'Test123456!',
  displayName: 'Test User',
};

const TEST_PROJECT = {
  name: 'E2E Test Project',
  description: 'Project for E2E testing environment lifecycle',
};

const TEST_ENVIRONMENT = {
  name: 'Test Dev Environment',
  description: 'Development environment for E2E testing',
  baseImage: 'node:20-alpine',
  cpuLimit: 2,
  memoryLimit: 2048,
  diskLimit: 10240,
};

/**
 * Base URLs for frontend and API
 */
const FRONTEND_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000/api/v1';

/**
 * Helper function to wait for and verify authentication
 *
 * @param page - Playwright page instance
 * @returns Promise that resolves when authenticated
 */
async function ensureAuthenticated(page: Page): Promise<void> {
  // Check if already authenticated
  const token = await page.evaluate(() => localStorage.getItem('vibebox_token'));
  if (token) {
    return;
  }

  // Navigate to login page
  await page.goto(`${FRONTEND_URL}/login`);

  // Fill login form
  await page.fill('input[name="email"]', TEST_USER.email);
  await page.fill('input[name="password"]', TEST_USER.password);

  // Submit and wait for navigation
  await page.click('button[type="submit"]');
  await page.waitForURL(`${FRONTEND_URL}/`, { timeout: 10000 });

  // Verify token is stored
  const newToken = await page.evaluate(() => localStorage.getItem('vibebox_token'));
  expect(newToken).toBeTruthy();
}

/**
 * Helper function to create a test project via API
 *
 * @param page - Playwright page instance
 * @returns Project ID
 */
async function createTestProject(page: Page): Promise<string> {
  const token = await page.evaluate(() => localStorage.getItem('vibebox_token'));

  const response = await page.request.post(`${API_URL}/projects`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: TEST_PROJECT,
  });

  expect(response.ok()).toBeTruthy();
  const project = await response.json();
  return project.id;
}

/**
 * Helper function to poll for environment status change
 *
 * @param page - Playwright page instance
 * @param envId - Environment ID to check
 * @param expectedStatus - Expected status value
 * @param timeoutMs - Maximum time to wait in milliseconds
 * @returns Promise that resolves when status matches or rejects on timeout
 */
async function waitForEnvironmentStatus(
  page: Page,
  envId: string,
  expectedStatus: string,
  timeoutMs: number = 30000
): Promise<void> {
  const token = await page.evaluate(() => localStorage.getItem('vibebox_token'));
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const response = await page.request.get(`${API_URL}/environments/${envId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok()) {
      const env = await response.json();
      if (env.status === expectedStatus) {
        return;
      }
    }

    // Wait 1 second before next poll
    await page.waitForTimeout(1000);
  }

  throw new Error(`Timeout waiting for environment status: ${expectedStatus}`);
}

/**
 * Helper function to clean up test data
 *
 * @param page - Playwright page instance
 * @param projectId - Project ID to delete (will cascade delete environments)
 */
async function cleanupTestData(page: Page, projectId: string): Promise<void> {
  const token = await page.evaluate(() => localStorage.getItem('vibebox_token'));

  try {
    await page.request.delete(`${API_URL}/projects/${projectId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

/**
 * Test suite setup - runs before all tests
 */
test.beforeAll(async ({ browser }) => {
  // Register test user if needed
  const page = await browser.newPage();
  try {
    const response = await page.request.post(`${API_URL}/auth/register`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: TEST_USER,
      failOnStatusCode: false,
    });

    // 409 means user already exists, which is fine
    if (response.ok() || response.status() === 409) {
      // User created or already exists
    } else {
      console.warn('User registration failed, tests may fail if user does not exist');
    }
  } finally {
    await page.close();
  }
});

/**
 * Test: Create environment with form validation
 */
test.describe('Environment Creation', () => {
  let projectId: string;

  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
    projectId = await createTestProject(page);
  });

  test.afterEach(async ({ page }) => {
    if (projectId) {
      await cleanupTestData(page, projectId);
    }
  });

  test('should create environment with valid data', async ({ page }) => {
    // Navigate to project detail page
    await page.goto(`${FRONTEND_URL}/projects/${projectId}`);

    // Click "New Environment" button
    await page.click('button:has-text("New Environment")');

    // Verify dialog is open
    await expect(page.locator('dialog:has-text("Create Environment")')).toBeVisible();

    // Fill form
    await page.fill('input[name="name"]', TEST_ENVIRONMENT.name);
    await page.fill('textarea[name="description"]', TEST_ENVIRONMENT.description);
    await page.click('div[role="combobox"]:has-text("Base Image")');
    await page.click(`li:has-text("${TEST_ENVIRONMENT.baseImage}")`);

    // Verify default resource limits are shown
    await expect(page.locator('input[name="cpuLimit"]')).toHaveValue(String(TEST_ENVIRONMENT.cpuLimit));
    await expect(page.locator('input[name="memoryLimit"]')).toHaveValue(String(TEST_ENVIRONMENT.memoryLimit));

    // Submit form
    await page.click('button:has-text("Create")');

    // Wait for dialog to close and environment to appear in list
    await expect(page.locator('dialog:has-text("Create Environment")')).not.toBeVisible();
    await expect(page.locator(`text=${TEST_ENVIRONMENT.name}`)).toBeVisible();

    // Verify success notification
    await expect(page.locator('.MuiSnackbar-root:has-text("created successfully")')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/projects/${projectId}`);

    // Open create dialog
    await page.click('button:has-text("New Environment")');

    // Try to submit without filling required fields
    await page.click('button:has-text("Create")');

    // Verify validation errors
    await expect(page.locator('text=Name is required')).toBeVisible();
    await expect(page.locator('text=Base image is required')).toBeVisible();
  });

  test('should validate resource limits', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/projects/${projectId}`);

    // Open create dialog
    await page.click('button:has-text("New Environment")');

    // Fill required fields
    await page.fill('input[name="name"]', TEST_ENVIRONMENT.name);
    await page.click('div[role="combobox"]:has-text("Base Image")');
    await page.click(`li:has-text("${TEST_ENVIRONMENT.baseImage}")`);

    // Try invalid CPU limit
    await page.fill('input[name="cpuLimit"]', '0');
    await page.click('button:has-text("Create")');
    await expect(page.locator('text=CPU limit must be at least 1')).toBeVisible();

    // Try invalid memory limit
    await page.fill('input[name="cpuLimit"]', '2');
    await page.fill('input[name="memoryLimit"]', '100');
    await page.click('button:has-text("Create")');
    await expect(page.locator('text=Memory limit must be at least 512 MB')).toBeVisible();
  });

  test('should allow selecting different base images', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/projects/${projectId}`);

    // Open create dialog
    await page.click('button:has-text("New Environment")');

    // Open base image dropdown
    await page.click('div[role="combobox"]:has-text("Base Image")');

    // Verify available options
    await expect(page.locator('li:has-text("Node.js 20")')).toBeVisible();
    await expect(page.locator('li:has-text("Python 3.11")')).toBeVisible();
    await expect(page.locator('li:has-text("Ubuntu 22.04")')).toBeVisible();
    await expect(page.locator('li:has-text("Go 1.21")')).toBeVisible();
  });
});

/**
 * Test: View environment list and details
 */
test.describe('Environment Viewing', () => {
  let projectId: string;
  let envId: string;

  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
    projectId = await createTestProject(page);

    // Create environment via API
    const token = await page.evaluate(() => localStorage.getItem('vibebox_token'));
    const response = await page.request.post(`${API_URL}/environments`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        ...TEST_ENVIRONMENT,
        projectId,
      },
    });

    const env = await response.json();
    envId = env.id;
  });

  test.afterEach(async ({ page }) => {
    if (projectId) {
      await cleanupTestData(page, projectId);
    }
  });

  test('should display environment in project list', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/projects/${projectId}`);

    // Verify environment card is visible
    const envCard = page.locator(`[data-testid="environment-card-${envId}"]`);
    await expect(envCard).toBeVisible();

    // Verify environment details in card
    await expect(envCard.locator(`text=${TEST_ENVIRONMENT.name}`)).toBeVisible();
    await expect(envCard.locator(`text=${TEST_ENVIRONMENT.description}`)).toBeVisible();
    await expect(envCard.locator(`text=${TEST_ENVIRONMENT.baseImage}`)).toBeVisible();

    // Verify status badge
    await expect(envCard.locator('[data-testid="status-badge"]')).toBeVisible();
  });

  test('should navigate to environment detail page', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/projects/${projectId}`);

    // Click on environment card
    await page.click(`[data-testid="environment-card-${envId}"]`);

    // Verify navigation to detail page
    await expect(page).toHaveURL(`${FRONTEND_URL}/environments/${envId}`);

    // Verify page title
    await expect(page.locator(`h1:has-text("${TEST_ENVIRONMENT.name}")`)).toBeVisible();
  });

  test('should display environment details in overview tab', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/environments/${envId}`);

    // Verify Overview tab is active by default
    await expect(page.locator('button[role="tab"][aria-selected="true"]:has-text("Overview")')).toBeVisible();

    // Verify environment info card
    await expect(page.locator('text=Environment Info')).toBeVisible();
    await expect(page.locator(`text=${TEST_ENVIRONMENT.baseImage}`)).toBeVisible();
    await expect(page.locator(`text=CPU: ${TEST_ENVIRONMENT.cpuLimit} cores`)).toBeVisible();
    await expect(page.locator(`text=Memory: ${TEST_ENVIRONMENT.memoryLimit} MB`)).toBeVisible();

    // Verify quick stats card
    await expect(page.locator('text=Quick Stats')).toBeVisible();
    await expect(page.locator('text=Active Sessions')).toBeVisible();
    await expect(page.locator('text=Port Mappings')).toBeVisible();
    await expect(page.locator('text=Environment Variables')).toBeVisible();
  });

  test('should display all tabs', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/environments/${envId}`);

    // Verify all tabs are present
    await expect(page.locator('button[role="tab"]:has-text("Overview")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Logs")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Terminal")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Sessions")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Extensions")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Settings")')).toBeVisible();
  });
});

/**
 * Test: Start environment with status transitions
 */
test.describe('Environment Start', () => {
  let projectId: string;
  let envId: string;

  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
    projectId = await createTestProject(page);

    // Create environment via API
    const token = await page.evaluate(() => localStorage.getItem('vibebox_token'));
    const response = await page.request.post(`${API_URL}/environments`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        ...TEST_ENVIRONMENT,
        projectId,
      },
    });

    const env = await response.json();
    envId = env.id;
  });

  test.afterEach(async ({ page }) => {
    if (projectId) {
      await cleanupTestData(page, projectId);
    }
  });

  test('should start stopped environment', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/environments/${envId}`);

    // Verify initial status is STOPPED
    await expect(page.locator('[data-testid="status-badge"]:has-text("STOPPED")')).toBeVisible();

    // Click Start button
    await page.click('button:has-text("Start")');

    // Wait for status to change to STARTING (transitional state)
    await page.waitForSelector('[data-testid="status-badge"]:has-text("STARTING")', { timeout: 5000 });

    // Wait for status to change to RUNNING
    await waitForEnvironmentStatus(page, envId, 'RUNNING', 60000);

    // Verify UI reflects running state
    await expect(page.locator('[data-testid="status-badge"]:has-text("RUNNING")')).toBeVisible();

    // Verify Start button is no longer visible
    await expect(page.locator('button:has-text("Start")')).not.toBeVisible();

    // Verify Stop button is now visible
    await expect(page.locator('button:has-text("Stop")')).toBeVisible();

    // Verify Restart button is visible
    await expect(page.locator('button:has-text("Restart")')).toBeVisible();

    // Verify success notification
    await expect(page.locator('.MuiSnackbar-root:has-text("started")')).toBeVisible();
  });

  test('should show loading state during start', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/environments/${envId}`);

    // Click Start button
    await page.click('button:has-text("Start")');

    // Verify loading spinner appears
    await expect(page.locator('button:has-text("Start") [role="progressbar"]')).toBeVisible({ timeout: 2000 });
  });

  test('should update status in real-time via WebSocket', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/environments/${envId}`);

    // Start environment
    await page.click('button:has-text("Start")');

    // Monitor status badge for real-time updates
    // Should transition: STOPPED → STARTING → RUNNING
    const statusBadge = page.locator('[data-testid="status-badge"]');

    // Wait for STARTING status
    await expect(statusBadge).toContainText('STARTING', { timeout: 5000 });

    // Wait for RUNNING status (WebSocket should push this update)
    await expect(statusBadge).toContainText('RUNNING', { timeout: 60000 });
  });
});

/**
 * Test: Stop environment with status transitions
 */
test.describe('Environment Stop', () => {
  let projectId: string;
  let envId: string;

  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
    projectId = await createTestProject(page);

    // Create and start environment via API
    const token = await page.evaluate(() => localStorage.getItem('vibebox_token'));

    const createResponse = await page.request.post(`${API_URL}/environments`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        ...TEST_ENVIRONMENT,
        projectId,
      },
    });

    const env = await createResponse.json();
    envId = env.id;

    // Start the environment
    await page.request.post(`${API_URL}/environments/${envId}/start`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    // Wait for environment to be running
    await waitForEnvironmentStatus(page, envId, 'RUNNING', 60000);
  });

  test.afterEach(async ({ page }) => {
    if (projectId) {
      await cleanupTestData(page, projectId);
    }
  });

  test('should stop running environment', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/environments/${envId}`);

    // Verify initial status is RUNNING
    await expect(page.locator('[data-testid="status-badge"]:has-text("RUNNING")')).toBeVisible();

    // Click Stop button
    await page.click('button:has-text("Stop")');

    // Wait for status to change to STOPPING (transitional state)
    await page.waitForSelector('[data-testid="status-badge"]:has-text("STOPPING")', { timeout: 5000 });

    // Wait for status to change to STOPPED
    await waitForEnvironmentStatus(page, envId, 'STOPPED', 30000);

    // Verify UI reflects stopped state
    await expect(page.locator('[data-testid="status-badge"]:has-text("STOPPED")')).toBeVisible();

    // Verify Stop button is no longer visible
    await expect(page.locator('button:has-text("Stop")')).not.toBeVisible();

    // Verify Start button is now visible
    await expect(page.locator('button:has-text("Start")')).toBeVisible();

    // Verify success notification
    await expect(page.locator('.MuiSnackbar-root:has-text("stopped")')).toBeVisible();
  });
});

/**
 * Test: Restart environment action
 */
test.describe('Environment Restart', () => {
  let projectId: string;
  let envId: string;

  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
    projectId = await createTestProject(page);

    // Create and start environment
    const token = await page.evaluate(() => localStorage.getItem('vibebox_token'));

    const createResponse = await page.request.post(`${API_URL}/environments`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        ...TEST_ENVIRONMENT,
        projectId,
      },
    });

    const env = await createResponse.json();
    envId = env.id;

    // Start the environment
    await page.request.post(`${API_URL}/environments/${envId}/start`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    await waitForEnvironmentStatus(page, envId, 'RUNNING', 60000);
  });

  test.afterEach(async ({ page }) => {
    if (projectId) {
      await cleanupTestData(page, projectId);
    }
  });

  test('should restart running environment', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/environments/${envId}`);

    // Verify initial status is RUNNING
    await expect(page.locator('[data-testid="status-badge"]:has-text("RUNNING")')).toBeVisible();

    // Click Restart button
    await page.click('button:has-text("Restart")');

    // Should show transitional states
    // Note: Restart might go STOPPING → STOPPED → STARTING → RUNNING
    await page.waitForTimeout(2000); // Give time for status to update

    // Wait for status to eventually be RUNNING again
    await waitForEnvironmentStatus(page, envId, 'RUNNING', 90000);

    // Verify UI reflects running state
    await expect(page.locator('[data-testid="status-badge"]:has-text("RUNNING")')).toBeVisible();

    // Verify success notification
    await expect(page.locator('.MuiSnackbar-root:has-text("restarted")')).toBeVisible();
  });
});

/**
 * Test: Add and remove port mappings
 */
test.describe('Port Mappings Management', () => {
  let projectId: string;
  let envId: string;

  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
    projectId = await createTestProject(page);

    const token = await page.evaluate(() => localStorage.getItem('vibebox_token'));
    const response = await page.request.post(`${API_URL}/environments`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        ...TEST_ENVIRONMENT,
        projectId,
      },
    });

    const env = await response.json();
    envId = env.id;
  });

  test.afterEach(async ({ page }) => {
    if (projectId) {
      await cleanupTestData(page, projectId);
    }
  });

  test('should add new port mapping', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/environments/${envId}`);

    // Navigate to Settings tab
    await page.click('button[role="tab"]:has-text("Settings")');

    // Verify Port Mappings section
    await expect(page.locator('text=Port Mappings')).toBeVisible();

    // Click Add Port button
    await page.click('button:has-text("Add Port")');

    // Verify dialog is open
    await expect(page.locator('dialog:has-text("Add Port Mapping")')).toBeVisible();

    // Fill port mapping form
    await page.fill('input[name="containerPort"]', '8080');
    await page.fill('input[name="hostPort"]', '8080');
    await page.click('div[role="combobox"]:has-text("Protocol")');
    await page.click('li:has-text("TCP")');
    await page.fill('input[name="description"]', 'Web server port');

    // Submit form
    await page.click('button:has-text("Add")');

    // Wait for dialog to close
    await expect(page.locator('dialog:has-text("Add Port Mapping")')).not.toBeVisible();

    // Verify port appears in list
    await expect(page.locator('text=8080 → 8080 (TCP)')).toBeVisible();
    await expect(page.locator('text=Web server port')).toBeVisible();

    // Verify success notification
    await expect(page.locator('.MuiSnackbar-root:has-text("Port mapping added")')).toBeVisible();
  });

  test('should validate port numbers', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/environments/${envId}`);

    // Navigate to Settings tab
    await page.click('button[role="tab"]:has-text("Settings")');

    // Click Add Port button
    await page.click('button:has-text("Add Port")');

    // Try invalid port (too low)
    await page.fill('input[name="containerPort"]', '0');
    await page.click('button:has-text("Add")');
    await expect(page.locator('text=Container port must be between 1 and 65535')).toBeVisible();

    // Try invalid port (too high)
    await page.fill('input[name="containerPort"]', '70000');
    await page.click('button:has-text("Add")');
    await expect(page.locator('text=Container port must be between 1 and 65535')).toBeVisible();
  });

  test('should remove port mapping', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/environments/${envId}`);

    // Navigate to Settings tab
    await page.click('button[role="tab"]:has-text("Settings")');

    // Add a port mapping first
    await page.click('button:has-text("Add Port")');
    await page.fill('input[name="containerPort"]', '9000');
    await page.fill('input[name="hostPort"]', '9000');
    await page.click('button:has-text("Add")');

    // Wait for port to appear
    await expect(page.locator('text=9000 → 9000 (TCP)')).toBeVisible();

    // Click delete button for the port
    await page.click('button[aria-label*="Delete port mapping 9000"]');

    // Verify port is removed from list
    await expect(page.locator('text=9000 → 9000 (TCP)')).not.toBeVisible();

    // Verify success notification
    await expect(page.locator('.MuiSnackbar-root:has-text("Port mapping removed")')).toBeVisible();
  });
});

/**
 * Test: Add and remove environment variables
 */
test.describe('Environment Variables Management', () => {
  let projectId: string;
  let envId: string;

  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
    projectId = await createTestProject(page);

    const token = await page.evaluate(() => localStorage.getItem('vibebox_token'));
    const response = await page.request.post(`${API_URL}/environments`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        ...TEST_ENVIRONMENT,
        projectId,
      },
    });

    const env = await response.json();
    envId = env.id;
  });

  test.afterEach(async ({ page }) => {
    if (projectId) {
      await cleanupTestData(page, projectId);
    }
  });

  test('should add new environment variable', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/environments/${envId}`);

    // Navigate to Settings tab
    await page.click('button[role="tab"]:has-text("Settings")');

    // Scroll to Environment Variables section
    await page.locator('text=Environment Variables').scrollIntoViewIfNeeded();

    // Click Add Variable button
    await page.click('button:has-text("Add Variable")');

    // Verify dialog is open
    await expect(page.locator('dialog:has-text("Add Environment Variable")')).toBeVisible();

    // Fill form
    await page.fill('input[name="key"]', 'NODE_ENV');
    await page.fill('textarea[name="value"]', 'development');

    // Submit form
    await page.click('button:has-text("Add")');

    // Wait for dialog to close
    await expect(page.locator('dialog:has-text("Add Environment Variable")')).not.toBeVisible();

    // Verify variable appears in list
    await expect(page.locator('text=NODE_ENV')).toBeVisible();
    await expect(page.locator('text=development')).toBeVisible();

    // Verify success notification
    await expect(page.locator('.MuiSnackbar-root:has-text("Environment variable added")')).toBeVisible();
  });

  test('should add secret environment variable', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/environments/${envId}`);

    // Navigate to Settings tab
    await page.click('button[role="tab"]:has-text("Settings")');

    // Scroll to Environment Variables section
    await page.locator('text=Environment Variables').scrollIntoViewIfNeeded();

    // Click Add Variable button
    await page.click('button:has-text("Add Variable")');

    // Fill form with secret variable
    await page.fill('input[name="key"]', 'API_SECRET');
    await page.fill('textarea[name="value"]', 'super-secret-value');
    await page.check('input[type="checkbox"][name="isSecret"]');

    // Submit form
    await page.click('button:has-text("Add")');

    // Verify variable appears in list
    await expect(page.locator('text=API_SECRET')).toBeVisible();

    // Verify value is masked
    await expect(page.locator('text=••••••••')).toBeVisible();
    await expect(page.locator('text=super-secret-value')).not.toBeVisible();

    // Verify secret badge
    await expect(page.locator('text=Secret')).toBeVisible();

    // Click visibility toggle to reveal secret
    await page.click('button[aria-label*="visibility"]');

    // Verify value is now visible
    await expect(page.locator('text=super-secret-value')).toBeVisible();
  });

  test('should remove environment variable', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/environments/${envId}`);

    // Navigate to Settings tab
    await page.click('button[role="tab"]:has-text("Settings")');

    // Scroll to Environment Variables section
    await page.locator('text=Environment Variables').scrollIntoViewIfNeeded();

    // Add a variable first
    await page.click('button:has-text("Add Variable")');
    await page.fill('input[name="key"]', 'TEMP_VAR');
    await page.fill('textarea[name="value"]', 'temporary');
    await page.click('button:has-text("Add")');

    // Wait for variable to appear
    await expect(page.locator('text=TEMP_VAR')).toBeVisible();

    // Click delete button for the variable
    await page.click('button[aria-label*="delete"]:near(:text("TEMP_VAR"))');

    // Verify variable is removed from list
    await expect(page.locator('text=TEMP_VAR')).not.toBeVisible();

    // Verify success notification
    await expect(page.locator('.MuiSnackbar-root:has-text("Environment variable removed")')).toBeVisible();
  });
});

/**
 * Test: Delete environment with confirmation
 */
test.describe('Environment Deletion', () => {
  let projectId: string;
  let envId: string;

  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
    projectId = await createTestProject(page);

    const token = await page.evaluate(() => localStorage.getItem('vibebox_token'));
    const response = await page.request.post(`${API_URL}/environments`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        ...TEST_ENVIRONMENT,
        projectId,
      },
    });

    const env = await response.json();
    envId = env.id;
  });

  test.afterEach(async ({ page }) => {
    if (projectId) {
      await cleanupTestData(page, projectId);
    }
  });

  test('should delete environment with confirmation', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/environments/${envId}`);

    // Click delete button (usually in actions menu)
    await page.click('button[aria-label="Delete environment"]');

    // Verify confirmation dialog appears
    await expect(page.locator('dialog:has-text("Delete Environment")')).toBeVisible();
    await expect(page.locator('text=Are you sure you want to delete')).toBeVisible();

    // Click confirm button
    await page.click('button:has-text("Delete")');

    // Should redirect to project page
    await page.waitForURL(`${FRONTEND_URL}/projects/${projectId}`);

    // Verify environment is no longer in list
    await expect(page.locator(`text=${TEST_ENVIRONMENT.name}`)).not.toBeVisible();

    // Verify success notification
    await expect(page.locator('.MuiSnackbar-root:has-text("deleted")')).toBeVisible();
  });

  test('should cancel deletion', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/environments/${envId}`);

    // Click delete button
    await page.click('button[aria-label="Delete environment"]');

    // Verify confirmation dialog appears
    await expect(page.locator('dialog:has-text("Delete Environment")')).toBeVisible();

    // Click cancel button
    await page.click('button:has-text("Cancel")');

    // Dialog should close
    await expect(page.locator('dialog:has-text("Delete Environment")')).not.toBeVisible();

    // Should still be on environment detail page
    await expect(page).toHaveURL(`${FRONTEND_URL}/environments/${envId}`);

    // Environment should still exist
    await expect(page.locator(`h1:has-text("${TEST_ENVIRONMENT.name}")`)).toBeVisible();
  });
});

/**
 * Test: Error handling scenarios
 */
test.describe('Error Handling', () => {
  let projectId: string;
  let envId: string;

  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
    projectId = await createTestProject(page);

    const token = await page.evaluate(() => localStorage.getItem('vibebox_token'));
    const response = await page.request.post(`${API_URL}/environments`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        ...TEST_ENVIRONMENT,
        projectId,
      },
    });

    const env = await response.json();
    envId = env.id;
  });

  test.afterEach(async ({ page }) => {
    if (projectId) {
      await cleanupTestData(page, projectId);
    }
  });

  test('should handle environment startup failure gracefully', async ({ page }) => {
    // Mock API to return error on start
    await page.route(`${API_URL}/environments/${envId}/start`, route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal Server Error',
          message: 'Failed to start Docker container',
          statusCode: 500,
        }),
      });
    });

    await page.goto(`${FRONTEND_URL}/environments/${envId}`);

    // Try to start environment
    await page.click('button:has-text("Start")');

    // Verify error notification appears
    await expect(page.locator('.MuiSnackbar-root:has-text("Failed to start environment")')).toBeVisible();

    // Verify status remains STOPPED
    await expect(page.locator('[data-testid="status-badge"]:has-text("STOPPED")')).toBeVisible();
  });

  test('should handle port conflict error', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/environments/${envId}`);

    // Navigate to Settings tab
    await page.click('button[role="tab"]:has-text("Settings")');

    // Mock API to return port conflict error
    await page.route(`${API_URL}/environments/${envId}/ports`, route => {
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Conflict',
          message: 'Port 8080 is already in use',
          statusCode: 409,
        }),
      });
    });

    // Try to add port
    await page.click('button:has-text("Add Port")');
    await page.fill('input[name="containerPort"]', '8080');
    await page.fill('input[name="hostPort"]', '8080');
    await page.click('button:has-text("Add")');

    // Verify error notification
    await expect(page.locator('.MuiSnackbar-root:has-text("Failed to add port mapping")')).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/environments/${envId}`);

    // Simulate network failure
    await page.route(`${API_URL}/environments/${envId}/start`, route => {
      route.abort('failed');
    });

    // Try to start environment
    await page.click('button:has-text("Start")');

    // Verify error notification
    await expect(page.locator('.MuiSnackbar-root:has-text("Failed")')).toBeVisible();
  });

  test('should handle non-existent environment', async ({ page }) => {
    const fakeEnvId = 'non-existent-env-id';

    await page.goto(`${FRONTEND_URL}/environments/${fakeEnvId}`);

    // Verify error state
    await expect(page.locator('text=Environment not found')).toBeVisible();
    await expect(page.locator('text=doesn\'t exist or you don\'t have access')).toBeVisible();

    // Verify back button
    await expect(page.locator('button:has-text("Back to Dashboard")')).toBeVisible();
  });
});

/**
 * Test: Navigation and back buttons
 */
test.describe('Navigation', () => {
  let projectId: string;
  let envId: string;

  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
    projectId = await createTestProject(page);

    const token = await page.evaluate(() => localStorage.getItem('vibebox_token'));
    const response = await page.request.post(`${API_URL}/environments`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        ...TEST_ENVIRONMENT,
        projectId,
      },
    });

    const env = await response.json();
    envId = env.id;
  });

  test.afterEach(async ({ page }) => {
    if (projectId) {
      await cleanupTestData(page, projectId);
    }
  });

  test('should navigate back to project from environment detail', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/environments/${envId}`);

    // Click back button
    await page.click('button:has-text("Back to Project")');

    // Verify navigation to project page
    await expect(page).toHaveURL(`${FRONTEND_URL}/projects/${projectId}`);
    await expect(page.locator(`text=${TEST_PROJECT.name}`)).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/environments/${envId}`);

    // Click Logs tab
    await page.click('button[role="tab"]:has-text("Logs")');
    await expect(page.locator('button[role="tab"][aria-selected="true"]:has-text("Logs")')).toBeVisible();

    // Click Settings tab
    await page.click('button[role="tab"]:has-text("Settings")');
    await expect(page.locator('button[role="tab"][aria-selected="true"]:has-text("Settings")')).toBeVisible();
    await expect(page.locator('text=Port Mappings')).toBeVisible();

    // Click back to Overview tab
    await page.click('button[role="tab"]:has-text("Overview")');
    await expect(page.locator('button[role="tab"][aria-selected="true"]:has-text("Overview")')).toBeVisible();
    await expect(page.locator('text=Environment Info')).toBeVisible();
  });
});
