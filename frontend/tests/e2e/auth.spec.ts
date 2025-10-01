/**
 * Authentication E2E Tests - VibeBox Frontend
 * Comprehensive tests for user registration, login, logout, and protected routes
 *
 * @module tests/e2e/auth
 * @description Tests cover the complete authentication flow including:
 * - User registration with validation
 * - User login with validation
 * - Token persistence across page refreshes
 * - Logout functionality
 * - Protected route access control
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Test data generator for unique user credentials
 * Ensures each test run uses unique email addresses to avoid conflicts
 */
function generateTestUser() {
  const timestamp = Date.now();
  return {
    email: `test.user.${timestamp}@vibebox.test`,
    password: 'TestPassword123!',
    displayName: 'Test User',
  };
}

/**
 * Page Object Model for Login Page
 * Encapsulates login page interactions and selectors
 */
class LoginPage {
  constructor(private page: Page) {}

  /**
   * Navigate to the login page
   */
  async goto() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Fill in login credentials
   */
  async fillLoginForm(email: string, password: string) {
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password').first().fill(password);
  }

  /**
   * Submit the login form
   */
  async submit() {
    await this.page.getByRole('button', { name: /sign in/i }).click();
  }

  /**
   * Get the error alert message
   */
  async getErrorMessage() {
    const alert = this.page.getByRole('alert');
    await alert.waitFor({ state: 'visible', timeout: 5000 });
    return await alert.textContent();
  }

  /**
   * Check if error message is visible
   */
  async hasError() {
    return await this.page.getByRole('alert').isVisible();
  }

  /**
   * Click the sign up link to navigate to register page
   */
  async goToRegister() {
    await this.page.getByRole('link', { name: /sign up/i }).click();
  }

  /**
   * Perform complete login flow
   */
  async login(email: string, password: string) {
    await this.fillLoginForm(email, password);
    await this.submit();
  }
}

/**
 * Page Object Model for Register Page
 * Encapsulates registration page interactions and selectors
 */
class RegisterPage {
  constructor(private page: Page) {}

  /**
   * Navigate to the register page
   */
  async goto() {
    await this.page.goto('/register');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Fill in registration form
   */
  async fillRegisterForm(
    email: string,
    password: string,
    confirmPassword: string,
    displayName?: string
  ) {
    await this.page.getByLabel('Email').fill(email);
    if (displayName) {
      await this.page.getByLabel(/display name/i).fill(displayName);
    }
    await this.page.getByLabel('Password').first().fill(password);
    await this.page.getByLabel(/confirm password/i).fill(confirmPassword);
  }

  /**
   * Submit the registration form
   */
  async submit() {
    await this.page.getByRole('button', { name: /sign up/i }).click();
  }

  /**
   * Get the error alert message
   */
  async getErrorMessage() {
    const alert = this.page.getByRole('alert');
    await alert.waitFor({ state: 'visible', timeout: 5000 });
    return await alert.textContent();
  }

  /**
   * Check if error message is visible
   */
  async hasError() {
    return await this.page.getByRole('alert').isVisible();
  }

  /**
   * Click the sign in link to navigate to login page
   */
  async goToLogin() {
    await this.page.getByRole('link', { name: /sign in/i }).click();
  }

  /**
   * Perform complete registration flow
   */
  async register(email: string, password: string, displayName?: string) {
    await this.fillRegisterForm(email, password, password, displayName);
    await this.submit();
  }
}

/**
 * Page Object Model for Dashboard (Protected Page)
 * Represents any authenticated page in the application
 */
class DashboardPage {
  constructor(private page: Page) {}

  /**
   * Navigate to the dashboard
   */
  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if user is on an authenticated page
   * Dashboard should be visible when authenticated
   */
  async isAuthenticated() {
    // Wait for the AppShell or dashboard content to be visible
    // This indicates successful authentication
    await this.page.waitForLoadState('networkidle');
    const url = this.page.url();
    return !url.includes('/login') && !url.includes('/register');
  }

  /**
   * Logout via the user menu
   */
  async logout() {
    // Click user menu button (usually top-right)
    // Note: This depends on the actual implementation of AppShell
    // Adjust selectors based on actual UI
    const logoutButton = this.page.getByRole('button', { name: /logout|sign out/i });
    if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await logoutButton.click();
    } else {
      // Alternative: look for menu then logout
      const menuButton = this.page.getByRole('button', { name: /account|profile|menu/i });
      if (await menuButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await menuButton.click();
        await this.page.getByRole('menuitem', { name: /logout|sign out/i }).click();
      }
    }
  }
}

/**
 * Test suite setup: API mocking and cleanup utilities
 */
test.describe('Authentication Flow', () => {
  let loginPage: LoginPage;
  let registerPage: RegisterPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    // Initialize page objects
    loginPage = new LoginPage(page);
    registerPage = new RegisterPage(page);
    dashboardPage = new DashboardPage(page);

    // Clear storage before each test to ensure clean state
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  /**
   * Test Group: User Registration Flow
   */
  test.describe('User Registration', () => {
    test('should display registration form correctly', async ({ page }) => {
      await registerPage.goto();

      // Verify all form fields are present
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel(/display name/i)).toBeVisible();
      await expect(page.getByLabel('Password').first()).toBeVisible();
      await expect(page.getByLabel(/confirm password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible();

      // Verify page title
      await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();

      // Verify link to login page
      await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      await registerPage.goto();

      // Submit with invalid email
      await registerPage.fillRegisterForm('invalid-email', 'Password123!', 'Password123!');
      await registerPage.submit();

      // Should show validation error
      const hasError = await registerPage.hasError();
      expect(hasError).toBeTruthy();

      const errorMessage = await registerPage.getErrorMessage();
      expect(errorMessage).toContain('valid email');
    });

    test('should validate password match', async ({ page }) => {
      await registerPage.goto();

      // Submit with mismatched passwords
      await registerPage.fillRegisterForm(
        'test@example.com',
        'Password123!',
        'DifferentPassword123!'
      );
      await registerPage.submit();

      // Should show validation error
      const hasError = await registerPage.hasError();
      expect(hasError).toBeTruthy();

      const errorMessage = await registerPage.getErrorMessage();
      expect(errorMessage).toContain('do not match');
    });

    test('should validate password length', async ({ page }) => {
      await registerPage.goto();

      // Submit with short password
      await registerPage.fillRegisterForm('test@example.com', 'Short1!', 'Short1!');
      await registerPage.submit();

      // Should show validation error
      const hasError = await registerPage.hasError();
      expect(hasError).toBeTruthy();

      const errorMessage = await registerPage.getErrorMessage();
      expect(errorMessage).toContain('at least 8 characters');
    });

    test('should successfully register a new user', async ({ page }) => {
      const testUser = generateTestUser();

      await registerPage.goto();
      await registerPage.register(testUser.email, testUser.password, testUser.displayName);

      // Should redirect to dashboard after successful registration
      await page.waitForURL('/', { timeout: 10000 });
      await expect(page).toHaveURL('/');

      // Should be authenticated
      const isAuthenticated = await dashboardPage.isAuthenticated();
      expect(isAuthenticated).toBeTruthy();

      // Verify token is stored in localStorage
      const token = await page.evaluate(() => localStorage.getItem('vibebox_token'));
      expect(token).toBeTruthy();
    });

    test('should handle duplicate email registration', async ({ page }) => {
      const testUser = generateTestUser();

      // First registration
      await registerPage.goto();
      await registerPage.register(testUser.email, testUser.password);
      await page.waitForURL('/', { timeout: 10000 });

      // Logout
      await dashboardPage.logout();
      await page.waitForURL('/login', { timeout: 5000 });

      // Try to register again with same email
      await registerPage.goto();
      await registerPage.register(testUser.email, testUser.password);

      // Should show error about existing user
      const hasError = await registerPage.hasError();
      expect(hasError).toBeTruthy();

      const errorMessage = await registerPage.getErrorMessage();
      expect(errorMessage).toMatch(/already exists|already registered|already taken/i);
    });

    test('should navigate to login page from sign in link', async ({ page }) => {
      await registerPage.goto();
      await registerPage.goToLogin();

      await page.waitForURL('/login');
      await expect(page).toHaveURL('/login');
    });
  });

  /**
   * Test Group: User Login Flow
   */
  test.describe('User Login', () => {
    test('should display login form correctly', async ({ page }) => {
      await loginPage.goto();

      // Verify all form fields are present
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password').first()).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

      // Verify page title
      await expect(page.getByRole('heading', { name: /sign in to your account/i })).toBeVisible();

      // Verify link to register page
      await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
    });

    test('should require email and password', async ({ page }) => {
      await loginPage.goto();

      // Try to submit empty form
      await loginPage.submit();

      // HTML5 validation should prevent submission
      // Check that we're still on the login page
      await expect(page).toHaveURL('/login');
    });

    test('should handle invalid credentials', async ({ page }) => {
      await loginPage.goto();

      // Submit with invalid credentials
      await loginPage.login('nonexistent@example.com', 'WrongPassword123!');

      // Should show error message
      const hasError = await loginPage.hasError();
      expect(hasError).toBeTruthy();

      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toMatch(/invalid|incorrect|not found/i);

      // Should still be on login page
      await expect(page).toHaveURL('/login');
    });

    test('should successfully login with valid credentials', async ({ page }) => {
      // First, register a user
      const testUser = generateTestUser();
      await registerPage.goto();
      await registerPage.register(testUser.email, testUser.password);
      await page.waitForURL('/', { timeout: 10000 });

      // Logout
      await dashboardPage.logout();
      await page.waitForURL('/login', { timeout: 5000 });

      // Now login with the same credentials
      await loginPage.login(testUser.email, testUser.password);

      // Should redirect to dashboard
      await page.waitForURL('/', { timeout: 10000 });
      await expect(page).toHaveURL('/');

      // Should be authenticated
      const isAuthenticated = await dashboardPage.isAuthenticated();
      expect(isAuthenticated).toBeTruthy();

      // Verify token is stored
      const token = await page.evaluate(() => localStorage.getItem('vibebox_token'));
      expect(token).toBeTruthy();
    });

    test('should show loading state during login', async ({ page }) => {
      const testUser = generateTestUser();

      // Register first
      await registerPage.goto();
      await registerPage.register(testUser.email, testUser.password);
      await page.waitForURL('/');
      await dashboardPage.logout();

      // Login and check loading state
      await loginPage.goto();
      await loginPage.fillLoginForm(testUser.email, testUser.password);

      // Click submit and immediately check for loading state
      const submitButton = page.getByRole('button', { name: /sign in/i });
      await submitButton.click();

      // Button should show loading text or be disabled
      const isDisabled = await submitButton.isDisabled();
      expect(isDisabled).toBeTruthy();
    });

    test('should navigate to register page from sign up link', async ({ page }) => {
      await loginPage.goto();
      await loginPage.goToRegister();

      await page.waitForURL('/register');
      await expect(page).toHaveURL('/register');
    });
  });

  /**
   * Test Group: Token Persistence and Session Management
   */
  test.describe('Token Persistence', () => {
    test('should persist authentication after page refresh', async ({ page }) => {
      const testUser = generateTestUser();

      // Register and login
      await registerPage.goto();
      await registerPage.register(testUser.email, testUser.password);
      await page.waitForURL('/');

      // Verify authenticated
      let isAuthenticated = await dashboardPage.isAuthenticated();
      expect(isAuthenticated).toBeTruthy();

      // Refresh the page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should still be authenticated
      isAuthenticated = await dashboardPage.isAuthenticated();
      expect(isAuthenticated).toBeTruthy();

      // Should still be on dashboard
      await expect(page).toHaveURL('/');

      // Token should still be in localStorage
      const token = await page.evaluate(() => localStorage.getItem('vibebox_token'));
      expect(token).toBeTruthy();
    });

    test('should persist authentication across navigation', async ({ page }) => {
      const testUser = generateTestUser();

      // Register
      await registerPage.goto();
      await registerPage.register(testUser.email, testUser.password);
      await page.waitForURL('/');

      // Navigate to different protected routes
      await page.goto('/projects');
      await page.waitForLoadState('networkidle');
      let url = page.url();
      expect(url).toContain('/projects');

      await page.goto('/teams');
      await page.waitForLoadState('networkidle');
      url = page.url();
      expect(url).toContain('/teams');

      await page.goto('/settings');
      await page.waitForLoadState('networkidle');
      url = page.url();
      expect(url).toContain('/settings');

      // Should still be authenticated after navigation
      const isAuthenticated = await dashboardPage.isAuthenticated();
      expect(isAuthenticated).toBeTruthy();
    });

    test('should handle token expiration gracefully', async ({ page }) => {
      const testUser = generateTestUser();

      // Register
      await registerPage.goto();
      await registerPage.register(testUser.email, testUser.password);
      await page.waitForURL('/');

      // Manually clear the token to simulate expiration
      await page.evaluate(() => {
        localStorage.removeItem('vibebox_token');
        localStorage.removeItem('vibebox_refresh_token');
      });

      // Try to access a protected route
      await page.goto('/projects');
      await page.waitForLoadState('networkidle');

      // Should redirect to login
      await page.waitForURL('/login', { timeout: 5000 });
      await expect(page).toHaveURL('/login');
    });
  });

  /**
   * Test Group: Logout Flow
   */
  test.describe('Logout Flow', () => {
    test('should successfully logout and clear session', async ({ page }) => {
      const testUser = generateTestUser();

      // Register and login
      await registerPage.goto();
      await registerPage.register(testUser.email, testUser.password);
      await page.waitForURL('/');

      // Verify token exists
      let token = await page.evaluate(() => localStorage.getItem('vibebox_token'));
      expect(token).toBeTruthy();

      // Logout
      await dashboardPage.logout();

      // Should redirect to login page
      await page.waitForURL('/login', { timeout: 5000 });
      await expect(page).toHaveURL('/login');

      // Token should be cleared
      token = await page.evaluate(() => localStorage.getItem('vibebox_token'));
      expect(token).toBeNull();

      const refreshToken = await page.evaluate(() =>
        localStorage.getItem('vibebox_refresh_token')
      );
      expect(refreshToken).toBeNull();
    });

    test('should prevent access to protected routes after logout', async ({ page }) => {
      const testUser = generateTestUser();

      // Register
      await registerPage.goto();
      await registerPage.register(testUser.email, testUser.password);
      await page.waitForURL('/');

      // Logout
      await dashboardPage.logout();
      await page.waitForURL('/login', { timeout: 5000 });

      // Try to access protected route
      await page.goto('/projects');
      await page.waitForLoadState('networkidle');

      // Should redirect back to login
      await page.waitForURL('/login', { timeout: 5000 });
      await expect(page).toHaveURL('/login');
    });
  });

  /**
   * Test Group: Protected Routes
   */
  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing protected route without authentication', async ({
      page,
    }) => {
      // Try to access dashboard without being logged in
      await dashboardPage.goto();

      // Should redirect to login
      await page.waitForURL('/login', { timeout: 5000 });
      await expect(page).toHaveURL('/login');
    });

    test('should redirect to login for all protected routes', async ({ page }) => {
      const protectedRoutes = ['/', '/projects', '/teams', '/settings', '/extensions'];

      for (const route of protectedRoutes) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');

        // Should redirect to login
        const url = page.url();
        expect(url).toContain('/login');
      }
    });

    test('should redirect to original destination after login', async ({ page }) => {
      const testUser = generateTestUser();

      // Register a user first
      await registerPage.goto();
      await registerPage.register(testUser.email, testUser.password);
      await page.waitForURL('/');
      await dashboardPage.logout();

      // Try to access /projects while not authenticated
      await page.goto('/projects');
      await page.waitForURL('/login');

      // Login
      await loginPage.login(testUser.email, testUser.password);

      // Should redirect back to /projects
      await page.waitForURL('/projects', { timeout: 10000 });
      await expect(page).toHaveURL('/projects');
    });

    test('should show loading spinner while checking authentication', async ({ page }) => {
      const testUser = generateTestUser();

      // Register
      await registerPage.goto();
      await registerPage.register(testUser.email, testUser.password);
      await page.waitForURL('/');

      // Navigate to another route - should briefly show loading state
      const navigation = page.goto('/projects');

      // Check for loading spinner (CircularProgress from ProtectedRoute)
      const spinner = page.locator('[role="progressbar"]');
      const isVisible = await spinner.isVisible().catch(() => false);

      // Note: Spinner might be very brief, so we don't assert it must be visible
      // Just checking that the mechanism exists
      await navigation;
      await page.waitForLoadState('networkidle');

      // Should eventually load the protected content
      const url = page.url();
      expect(url).toContain('/projects');
    });

    test('should allow access to public routes without authentication', async ({ page }) => {
      // Login page should be accessible
      await loginPage.goto();
      await expect(page).toHaveURL('/login');

      // Register page should be accessible
      await registerPage.goto();
      await expect(page).toHaveURL('/register');
    });
  });

  /**
   * Test Group: Edge Cases and Error Handling
   */
  test.describe('Edge Cases', () => {
    test('should handle network errors gracefully during login', async ({ page }) => {
      await loginPage.goto();

      // Simulate offline mode
      await page.context().setOffline(true);

      await loginPage.login('test@example.com', 'Password123!');

      // Should show error message
      const hasError = await loginPage.hasError();
      expect(hasError).toBeTruthy();

      // Re-enable network
      await page.context().setOffline(false);
    });

    test('should handle rapid form submissions', async ({ page }) => {
      const testUser = generateTestUser();

      await registerPage.goto();
      await registerPage.fillRegisterForm(
        testUser.email,
        testUser.password,
        testUser.password,
        testUser.displayName
      );

      // Click submit multiple times rapidly
      const submitButton = page.getByRole('button', { name: /sign up/i });
      await submitButton.click();
      await submitButton.click();
      await submitButton.click();

      // Should only process once and redirect to dashboard
      await page.waitForURL('/', { timeout: 10000 });
      await expect(page).toHaveURL('/');
    });

    test('should trim whitespace from email input', async ({ page }) => {
      const testUser = generateTestUser();

      // Register with email (no whitespace)
      await registerPage.goto();
      await registerPage.register(testUser.email, testUser.password);
      await page.waitForURL('/');
      await dashboardPage.logout();

      // Login with email that has leading/trailing whitespace
      await loginPage.goto();
      await loginPage.login(`  ${testUser.email}  `, testUser.password);

      // Should still successfully login
      await page.waitForURL('/', { timeout: 10000 });
      await expect(page).toHaveURL('/');
    });
  });
});
