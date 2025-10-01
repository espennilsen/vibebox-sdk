/**
 * E2E Test Helpers - VibeBox Frontend
 * Reusable helper functions for Playwright E2E tests
 */

import { expect, Page } from '@playwright/test';
import type {
  RegisterRequest,
  LoginRequest,
  LoginResponse,
  CreateTeamRequest,
  CreateProjectRequest,
  CreateEnvironmentRequest,
  User,
  Team,
  Project,
  Environment,
} from '../../../src/types';

// API Configuration
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

/**
 * Test user credentials and data
 */
export interface TestUser {
  email: string;
  password: string;
  displayName: string;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
}

/**
 * Test project data
 */
export interface TestProject {
  name: string;
  description?: string;
  teamId?: string;
  project?: Project;
}

/**
 * Test team data
 */
export interface TestTeam {
  name: string;
  description?: string;
  team?: Team;
}

/**
 * Test environment data
 */
export interface TestEnvironment {
  name: string;
  projectId: string;
  baseImage: string;
  description?: string;
  environment?: Environment;
}

/**
 * API request options with authentication
 */
interface ApiRequestOptions extends RequestInit {
  token?: string;
}

/**
 * Make authenticated API request
 *
 * @param endpoint - API endpoint path (e.g., '/auth/login')
 * @param options - Request options including token
 * @returns Response data or throws ApiException
 */
export async function apiRequest<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = {
        statusCode: response.status,
        error: response.statusText,
        message: `Request failed with status ${response.status}`,
      };
    }
    throw new Error(
      `API request failed: ${errorData.message} (${errorData.statusCode}: ${errorData.error})`
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return await response.json();
}

/**
 * Generate unique test identifier
 *
 * @param prefix - Optional prefix for the identifier
 * @returns Unique identifier string
 */
export function generateTestId(prefix = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a test user and login to get authentication token
 *
 * @param userData - Optional user data override
 * @returns Test user with authentication tokens
 *
 * @example
 * const testUser = await createTestUserAndLogin();
 * // Use testUser.accessToken for authenticated requests
 */
export async function createTestUserAndLogin(
  userData?: Partial<RegisterRequest>
): Promise<TestUser> {
  const testId = generateTestId();
  const email = userData?.email || `test-${testId}@vibebox.test`;
  const password = userData?.password || 'TestPassword123!';
  const displayName = userData?.displayName || `Test User ${testId}`;

  // Register the user
  const registerData: RegisterRequest = {
    email,
    password,
    displayName,
  };

  const registerResponse = await apiRequest<LoginResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(registerData),
  });

  return {
    email,
    password,
    displayName,
    user: registerResponse.user,
    accessToken: registerResponse.tokens.accessToken,
    refreshToken: registerResponse.tokens.refreshToken,
  };
}

/**
 * Login with existing credentials
 *
 * @param email - User email
 * @param password - User password
 * @returns Authentication tokens and user data
 *
 * @example
 * const { accessToken, user } = await loginUser('test@example.com', 'password123');
 */
export async function loginUser(email: string, password: string): Promise<LoginResponse> {
  const loginData: LoginRequest = { email, password };

  return await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(loginData),
  });
}

/**
 * Create a test team
 *
 * @param token - Authentication token
 * @param teamData - Optional team data override
 * @returns Test team data
 *
 * @example
 * const testTeam = await createTestTeam(user.accessToken);
 */
export async function createTestTeam(
  token: string,
  teamData?: Partial<CreateTeamRequest>
): Promise<TestTeam> {
  const testId = generateTestId('team');
  const name = teamData?.name || `Test Team ${testId}`;
  const description = teamData?.description || `Test team created at ${new Date().toISOString()}`;

  const createTeamData: CreateTeamRequest = {
    name,
    description,
  };

  const team = await apiRequest<Team>('/teams', {
    method: 'POST',
    body: JSON.stringify(createTeamData),
    token,
  });

  return {
    name,
    description,
    team: team,
  };
}

/**
 * Create a test project
 *
 * @param token - Authentication token
 * @param projectData - Optional project data override
 * @returns Test project data
 *
 * @example
 * const testProject = await createTestProject(user.accessToken);
 * const projectWithTeam = await createTestProject(user.accessToken, { teamId: team.id });
 */
export async function createTestProject(
  token: string,
  projectData?: Partial<CreateProjectRequest>
): Promise<TestProject> {
  const testId = generateTestId('project');
  const name = projectData?.name || `Test Project ${testId}`;
  const description =
    projectData?.description || `Test project created at ${new Date().toISOString()}`;

  const createProjectData: CreateProjectRequest = {
    name,
    description,
    ...(projectData?.teamId && { teamId: projectData.teamId }),
    ...(projectData?.repositoryUrl && { repositoryUrl: projectData.repositoryUrl }),
  };

  const project = await apiRequest<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify(createProjectData),
    token,
  });

  return {
    name,
    description,
    teamId: projectData?.teamId,
    project: project,
  };
}

/**
 * Create a test environment
 *
 * @param token - Authentication token
 * @param projectId - Project ID for the environment
 * @param envData - Optional environment data override
 * @returns Test environment data
 *
 * @example
 * const testEnv = await createTestEnvironment(user.accessToken, project.id);
 */
export async function createTestEnvironment(
  token: string,
  projectId: string,
  envData?: Partial<CreateEnvironmentRequest>
): Promise<TestEnvironment> {
  const testId = generateTestId('env');
  const name = envData?.name || `Test Environment ${testId}`;
  const baseImage = envData?.baseImage || 'ubuntu:22.04';
  const description =
    envData?.description || `Test environment created at ${new Date().toISOString()}`;

  const createEnvData: CreateEnvironmentRequest = {
    name,
    description,
    projectId,
    baseImage,
    cpuLimit: envData?.cpuLimit || 2,
    memoryLimit: envData?.memoryLimit || 2048,
    diskLimit: envData?.diskLimit || 10240,
  };

  const environment = await apiRequest<Environment>('/environments', {
    method: 'POST',
    body: JSON.stringify(createEnvData),
    token,
  });

  return {
    name,
    projectId,
    baseImage,
    description,
    environment: environment,
  };
}

/**
 * Cleanup test user and associated data
 *
 * @param userId - User ID to cleanup
 * @param token - Authentication token
 *
 * @example
 * await cleanupTestUser(user.id, user.accessToken);
 */
export async function cleanupTestUser(userId: string, token: string): Promise<void> {
  try {
    // Note: Backend should implement cascade deletion
    await apiRequest(`/users/${userId}`, {
      method: 'DELETE',
      token,
    });
  } catch (err) {
    console.warn(`Failed to cleanup test user ${userId}:`, err);
  }
}

/**
 * Cleanup test project and associated environments
 *
 * @param projectId - Project ID to cleanup
 * @param token - Authentication token
 *
 * @example
 * await cleanupTestProject(project.id, user.accessToken);
 */
export async function cleanupTestProject(projectId: string, token: string): Promise<void> {
  try {
    await apiRequest(`/projects/${projectId}`, {
      method: 'DELETE',
      token,
    });
  } catch (error) {
    console.warn(`Failed to cleanup test project ${projectId}:`, error);
  }
}

/**
 * Cleanup test team
 *
 * @param teamId - Team ID to cleanup
 * @param token - Authentication token
 *
 * @example
 * await cleanupTestTeam(team.id, user.accessToken);
 */
export async function cleanupTestTeam(teamId: string, token: string): Promise<void> {
  try {
    await apiRequest(`/teams/${teamId}`, {
      method: 'DELETE',
      token,
    });
  } catch (error) {
    console.warn(`Failed to cleanup test team ${teamId}:`, error);
  }
}

/**
 * Cleanup test environment
 *
 * @param environmentId - Environment ID to cleanup
 * @param token - Authentication token
 *
 * @example
 * await cleanupTestEnvironment(environment.id, user.accessToken);
 */
export async function cleanupTestEnvironment(environmentId: string, token: string): Promise<void> {
  try {
    // Stop environment if running
    await apiRequest(`/environments/${environmentId}/stop`, {
      method: 'POST',
      token,
    });

    // Delete environment
    await apiRequest(`/environments/${environmentId}`, {
      method: 'DELETE',
      token,
    });
  } catch (error) {
    console.warn(`Failed to cleanup test environment ${environmentId}:`, error);
  }
}

/**
 * Wait for element to be visible with retry logic
 *
 * @param page - Playwright page object
 * @param selector - Element selector
 * @param options - Wait options
 *
 * @example
 * await waitForElement(page, '[data-testid="dashboard"]');
 */
export async function waitForElement(
  page: Page,
  selector: string,
  options: { timeout?: number; retries?: number } = {}
): Promise<void> {
  const { timeout = 5000, retries = 3 } = options;

  for (let i = 0; i < retries; i++) {
    try {
      await page.waitForSelector(selector, { timeout, state: 'visible' });
      return;
    } catch {
      if (i === retries - 1) {
        throw new Error(`Element "${selector}" not found after ${retries} retries`);
      }
      // Wait before retry
      await page.waitForTimeout(1000);
    }
  }
}

/**
 * Wait for API response with specific endpoint
 *
 * @param page - Playwright page object
 * @param endpoint - API endpoint to wait for (partial match)
 * @param options - Wait options
 * @returns Response data
 *
 * @example
 * const response = await waitForApiResponse(page, '/projects');
 */
export async function waitForApiResponse<T = unknown>(
  page: Page,
  endpoint: string,
  options: { timeout?: number; method?: string } = {}
): Promise<T> {
  const { timeout = 10000, method } = options;

  const response = await page.waitForResponse(
    (response) => {
      const urlMatch = response.url().includes(endpoint);
      const methodMatch = !method || response.request().method() === method;
      return urlMatch && methodMatch;
    },
    { timeout }
  );

  expect(response.ok()).toBeTruthy();
  return await response.json();
}

/**
 * Set authentication token in browser storage
 *
 * @param page - Playwright page object
 * @param accessToken - Access token to store
 * @param refreshToken - Refresh token to store
 *
 * @example
 * await setAuthTokens(page, user.accessToken, user.refreshToken);
 */
export async function setAuthTokens(
  page: Page,
  accessToken: string,
  refreshToken: string
): Promise<void> {
  await page.evaluate(
    ({ access, refresh }) => {
      localStorage.setItem('vibebox_token', access);
      localStorage.setItem('vibebox_refresh_token', refresh);
    },
    { access: accessToken, refresh: refreshToken }
  );
}

/**
 * Clear authentication tokens from browser storage
 *
 * @param page - Playwright page object
 *
 * @example
 * await clearAuthTokens(page);
 */
export async function clearAuthTokens(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('vibebox_token');
    localStorage.removeItem('vibebox_refresh_token');
  });
}

/**
 * Mock data generators
 */
export const mockData = {
  /**
   * Generate mock user data
   *
   * @param overrides - Optional field overrides
   * @returns Mock user object
   */
  user: (overrides?: Partial<User>): User => {
    const testId = generateTestId();
    return {
      id: `user_${testId}`,
      email: `test-${testId}@vibebox.test`,
      displayName: `Test User ${testId}`,
      avatarUrl: null,
      timezone: 'UTC',
      locale: 'en-US',
      notificationsEnabled: true,
      sshPublicKeys: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  },

  /**
   * Generate mock project data
   *
   * @param overrides - Optional field overrides
   * @returns Mock project object
   */
  project: (overrides?: Partial<Project>): Project => {
    const testId = generateTestId();
    return {
      id: `project_${testId}`,
      name: `Test Project ${testId}`,
      description: null,
      ownerId: `user_${testId}`,
      teamId: null,
      repositoryUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  },

  /**
   * Generate mock environment data
   *
   * @param overrides - Optional field overrides
   * @returns Mock environment object
   */
  environment: (overrides?: Partial<Environment>): Environment => {
    const testId = generateTestId();
    return {
      id: `env_${testId}`,
      name: `Test Environment ${testId}`,
      description: null,
      projectId: `project_${testId}`,
      baseImage: 'ubuntu:22.04',
      status: 'STOPPED',
      dockerContainerId: null,
      cpuLimit: 2,
      memoryLimit: 2048,
      diskLimit: 10240,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  },

  /**
   * Generate mock team data
   *
   * @param overrides - Optional field overrides
   * @returns Mock team object
   */
  team: (overrides?: Partial<Team>): Team => {
    const testId = generateTestId();
    return {
      id: `team_${testId}`,
      name: `Test Team ${testId}`,
      description: null,
      ownerId: `user_${testId}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  },
};
