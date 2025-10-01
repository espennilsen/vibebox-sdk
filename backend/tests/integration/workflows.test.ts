/**
 * Integration Tests: Multi-Step User Workflows
 * Tests complete user journeys through the VibeBox application
 *
 * These tests verify that multiple endpoints work together correctly
 * to support real-world user scenarios and business workflows.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  createTestUser,
  authenticatedRequest,
  generateTeam,
  generateProject,
  generateEnvironment,
  SchemaValidators,
  TestUserCredentials,
} from '../contract/helpers/test-utils';

describe('Integration: User Workflows', () => {
  /**
   * Workflow 1: New User Onboarding
   *
   * A new user registers, logs in, and sets up their profile
   * This tests the complete authentication and profile management flow
   */
  describe('New User Onboarding', () => {
    it('should complete full onboarding flow', async () => {
      // Step 1: Register new user
      const userCredentials = await createTestUser();
      expect(userCredentials.userId).toBeDefined();
      expect(userCredentials.accessToken).toBeDefined();

      // Step 2: Login with credentials (to verify login works)
      const loginResponse = await authenticatedRequest(
        'POST',
        '/auth/login',
        '',
        {
          body: {
            email: userCredentials.email,
            password: userCredentials.password,
          },
        }
      );

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.accessToken).toBeDefined();

      // Step 3: Get user profile
      const profileResponse = await authenticatedRequest(
        'GET',
        '/users/me',
        userCredentials.accessToken!
      );

      expect(profileResponse.status).toBe(200);
      SchemaValidators.validateUser(profileResponse.body);
      expect(profileResponse.body.email).toBe(userCredentials.email);
      expect(profileResponse.body.displayName).toBe(userCredentials.displayName);

      // Step 4: Update user profile (timezone, avatar)
      const updateResponse = await authenticatedRequest(
        'PATCH',
        '/users/me',
        userCredentials.accessToken!,
        {
          body: {
            timezone: 'America/New_York',
            avatarUrl: 'https://example.com/avatar.png',
          },
        }
      );

      expect(updateResponse.status).toBe(200);

      // Step 5: Verify profile changes persist
      const verifyResponse = await authenticatedRequest(
        'GET',
        '/users/me',
        userCredentials.accessToken!
      );

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.timezone).toBe('America/New_York');
      expect(verifyResponse.body.avatarUrl).toBe('https://example.com/avatar.png');
    });
  });

  /**
   * Workflow 2: Team Collaboration
   *
   * User A creates a team, adds User B, creates a project,
   * then removes User B and verifies access control
   */
  describe('Team Collaboration', () => {
    it('should handle complete team collaboration workflow', async () => {
      // Setup: Create two users
      const userA = await createTestUser();
      const userB = await createTestUser();

      // Step 1: User A creates team
      const teamData = generateTeam();
      const createTeamResponse = await authenticatedRequest(
        'POST',
        '/teams',
        userA.accessToken!,
        { body: teamData }
      );

      expect(createTeamResponse.status).toBe(201);
      SchemaValidators.validateTeam(createTeamResponse.body);
      const teamId = createTeamResponse.body.id;

      // Step 2: User A adds User B as developer
      const addMemberResponse = await authenticatedRequest(
        'POST',
        `/teams/${teamId}/members`,
        userA.accessToken!,
        {
          body: {
            email: userB.email,
            role: 'developer',
          },
        }
      );

      expect(addMemberResponse.status).toBe(201);

      // Step 3: User B lists teams (should see new team)
      const listTeamsResponse = await authenticatedRequest(
        'GET',
        '/teams',
        userB.accessToken!
      );

      expect(listTeamsResponse.status).toBe(200);
      const userBTeams = listTeamsResponse.body.data || listTeamsResponse.body;
      const foundTeam = Array.isArray(userBTeams)
        ? userBTeams.find((t: any) => t.id === teamId)
        : null;
      expect(foundTeam).toBeDefined();

      // Step 4: User A creates team project
      const projectData = generateProject({ teamId });
      const createProjectResponse = await authenticatedRequest(
        'POST',
        '/projects',
        userA.accessToken!,
        { body: projectData }
      );

      expect(createProjectResponse.status).toBe(201);
      const projectId = createProjectResponse.body.id;

      // Step 5: User B can access team project
      const accessProjectResponse = await authenticatedRequest(
        'GET',
        `/projects/${projectId}`,
        userB.accessToken!
      );

      expect(accessProjectResponse.status).toBe(200);
      expect(accessProjectResponse.body.id).toBe(projectId);

      // Step 6: User A removes User B
      const removeMemberResponse = await authenticatedRequest(
        'DELETE',
        `/teams/${teamId}/members/${userB.userId}`,
        userA.accessToken!
      );

      expect(removeMemberResponse.status).toBe(204);

      // Step 7: User B can no longer access team
      const verifyNoAccessResponse = await authenticatedRequest(
        'GET',
        `/teams/${teamId}`,
        userB.accessToken!
      );

      // Should return 403 Forbidden or 404 Not Found
      expect([403, 404]).toContain(verifyNoAccessResponse.status);
    });
  });

  /**
   * Workflow 3: Project & Environment Lifecycle
   *
   * Complete lifecycle from project creation through environment
   * management to archival
   */
  describe('Project & Environment Lifecycle', () => {
    it('should handle complete project and environment lifecycle', async () => {
      // Setup
      const user = await createTestUser();

      // Step 1: Create personal project
      const projectData = generateProject();
      const createProjectResponse = await authenticatedRequest(
        'POST',
        '/projects',
        user.accessToken!,
        { body: projectData }
      );

      expect(createProjectResponse.status).toBe(201);
      const projectId = createProjectResponse.body.id;

      // Step 2: Create environment for project
      const envData = generateEnvironment(projectId);
      const createEnvResponse = await authenticatedRequest(
        'POST',
        '/environments',
        user.accessToken!,
        { body: envData }
      );

      expect(createEnvResponse.status).toBe(201);
      SchemaValidators.validateEnvironment(createEnvResponse.body);
      const environmentId = createEnvResponse.body.id;
      expect(createEnvResponse.body.status).toBe('stopped');

      // Step 3: Start environment
      const startEnvResponse = await authenticatedRequest(
        'POST',
        `/environments/${environmentId}/start`,
        user.accessToken!
      );

      expect(startEnvResponse.status).toBe(200);

      // Step 4: Verify environment status is 'running'
      const checkStatusResponse = await authenticatedRequest(
        'GET',
        `/environments/${environmentId}`,
        user.accessToken!
      );

      expect(checkStatusResponse.status).toBe(200);
      expect(['running', 'starting']).toContain(checkStatusResponse.body.status);

      // Step 5: Add environment variable
      const addEnvVarResponse = await authenticatedRequest(
        'POST',
        `/environments/${environmentId}/variables`,
        user.accessToken!,
        {
          body: {
            key: 'API_KEY',
            value: 'test-secret-key',
            isEncrypted: true,
          },
        }
      );

      expect(addEnvVarResponse.status).toBe(201);
      SchemaValidators.validateEnvironmentVariable(addEnvVarResponse.body);

      // Step 6: Add port mapping
      const addPortResponse = await authenticatedRequest(
        'POST',
        `/environments/${environmentId}/ports`,
        user.accessToken!,
        {
          body: {
            containerPort: 3000,
            hostPort: 8080,
            protocol: 'http',
          },
        }
      );

      expect(addPortResponse.status).toBe(201);

      // Step 7: Stop environment
      const stopEnvResponse = await authenticatedRequest(
        'POST',
        `/environments/${environmentId}/stop`,
        user.accessToken!
      );

      expect(stopEnvResponse.status).toBe(200);

      // Step 8: Delete environment
      const deleteEnvResponse = await authenticatedRequest(
        'DELETE',
        `/environments/${environmentId}`,
        user.accessToken!
      );

      expect(deleteEnvResponse.status).toBe(204);

      // Step 9: Archive project
      const archiveProjectResponse = await authenticatedRequest(
        'PATCH',
        `/projects/${projectId}`,
        user.accessToken!,
        {
          body: {
            archived: true,
          },
        }
      );

      expect(archiveProjectResponse.status).toBe(200);
      expect(archiveProjectResponse.body.archived).toBe(true);
    });
  });

  /**
   * Workflow 4: Multi-Team Scenario
   *
   * User joins multiple teams with different roles and verifies
   * role-based access control across teams
   */
  describe('Multi-Team Scenario', () => {
    it('should handle user with multiple team roles correctly', async () => {
      // Setup: Create main user and two team admins
      const user = await createTestUser();
      const adminA = await createTestUser();
      const adminB = await createTestUser();

      // Step 1: Admin A creates Team A
      const teamAData = generateTeam({ name: 'Team Alpha' });
      const createTeamAResponse = await authenticatedRequest(
        'POST',
        '/teams',
        adminA.accessToken!,
        { body: teamAData }
      );

      expect(createTeamAResponse.status).toBe(201);
      const teamAId = createTeamAResponse.body.id;

      // Step 2: Admin B creates Team B
      const teamBData = generateTeam({ name: 'Team Beta' });
      const createTeamBResponse = await authenticatedRequest(
        'POST',
        '/teams',
        adminB.accessToken!,
        { body: teamBData }
      );

      expect(createTeamBResponse.status).toBe(201);
      const teamBId = createTeamBResponse.body.id;

      // Step 3: User joins Team A as admin
      const addToTeamAResponse = await authenticatedRequest(
        'POST',
        `/teams/${teamAId}/members`,
        adminA.accessToken!,
        {
          body: {
            email: user.email,
            role: 'admin',
          },
        }
      );

      expect(addToTeamAResponse.status).toBe(201);

      // Step 4: User joins Team B as viewer
      const addToTeamBResponse = await authenticatedRequest(
        'POST',
        `/teams/${teamBId}/members`,
        adminB.accessToken!,
        {
          body: {
            email: user.email,
            role: 'viewer',
          },
        }
      );

      expect(addToTeamBResponse.status).toBe(201);

      // Step 5: Create project in Team A (should work - user is admin)
      const projectAData = generateProject({ teamId: teamAId });
      const createProjectAResponse = await authenticatedRequest(
        'POST',
        '/projects',
        user.accessToken!,
        { body: projectAData }
      );

      expect(createProjectAResponse.status).toBe(201);

      // Step 6: Try to create project in Team B (should fail - viewer role)
      const projectBData = generateProject({ teamId: teamBId });
      const createProjectBResponse = await authenticatedRequest(
        'POST',
        '/projects',
        user.accessToken!,
        { body: projectBData }
      );

      // Viewers should not be able to create projects
      expect(createProjectBResponse.status).toBe(403);

      // Step 7: Team B admin promotes user to developer
      const updateRoleResponse = await authenticatedRequest(
        'PATCH',
        `/teams/${teamBId}/members/${user.userId}`,
        adminB.accessToken!,
        {
          body: {
            role: 'developer',
          },
        }
      );

      expect(updateRoleResponse.status).toBe(200);

      // Step 8: Create project in Team B (should now work - developer role)
      const retryCreateProjectBResponse = await authenticatedRequest(
        'POST',
        '/projects',
        user.accessToken!,
        { body: projectBData }
      );

      expect(retryCreateProjectBResponse.status).toBe(201);

      // Verify user's team memberships
      const listTeamsResponse = await authenticatedRequest(
        'GET',
        '/teams',
        user.accessToken!
      );

      expect(listTeamsResponse.status).toBe(200);
      const teams = listTeamsResponse.body.data || listTeamsResponse.body;
      expect(Array.isArray(teams)).toBe(true);
      expect(teams.length).toBeGreaterThanOrEqual(2);
    });
  });

  /**
   * Workflow 5: VS Code Extension Management
   *
   * Complete workflow for installing and managing VS Code extensions
   * in an environment
   */
  describe('VS Code Extension Management', () => {
    it('should handle extension installation and management workflow', async () => {
      // Setup
      const user = await createTestUser();

      // Create project and environment
      const projectData = generateProject();
      const projectResponse = await authenticatedRequest(
        'POST',
        '/projects',
        user.accessToken!,
        { body: projectData }
      );
      expect(projectResponse.status).toBe(201);

      const envData = generateEnvironment(projectResponse.body.id);
      const envResponse = await authenticatedRequest(
        'POST',
        '/environments',
        user.accessToken!,
        { body: envData }
      );
      expect(envResponse.status).toBe(201);
      const environmentId = envResponse.body.id;

      // Step 1: Search for extensions
      const searchResponse = await authenticatedRequest(
        'GET',
        '/extensions',
        user.accessToken!,
        {
          query: {
            search: 'typescript',
          },
        }
      );

      expect(searchResponse.status).toBe(200);

      // Step 2: Install extension to environment
      const installResponse = await authenticatedRequest(
        'POST',
        `/environments/${environmentId}/extensions`,
        user.accessToken!,
        {
          body: {
            extensionId: 'ms-vscode.vscode-typescript-next',
            name: 'TypeScript Nightly',
            version: '5.0.0',
            publisher: 'Microsoft',
          },
        }
      );

      expect(installResponse.status).toBe(201);
      SchemaValidators.validateEnvironmentExtension(installResponse.body);
      expect(['pending', 'installing']).toContain(installResponse.body.status);

      // Step 3: List installed extensions
      const listExtensionsResponse = await authenticatedRequest(
        'GET',
        `/environments/${environmentId}/extensions`,
        user.accessToken!
      );

      expect(listExtensionsResponse.status).toBe(200);
      const extensions = listExtensionsResponse.body.data || listExtensionsResponse.body;
      expect(Array.isArray(extensions)).toBe(true);
      expect(extensions.length).toBeGreaterThan(0);

      // Step 4: Uninstall extension
      const extensionInstallId = installResponse.body.id;
      const uninstallResponse = await authenticatedRequest(
        'DELETE',
        `/environments/${environmentId}/extensions/${extensionInstallId}`,
        user.accessToken!
      );

      expect(uninstallResponse.status).toBe(204);
    });
  });

  /**
   * Workflow 6: Session and Log Management
   *
   * Complete workflow for creating sessions and accessing logs
   */
  describe('Session and Log Management', () => {
    it('should handle session creation and log access workflow', async () => {
      // Setup
      const user = await createTestUser();

      // Create project and environment
      const projectData = generateProject();
      const projectResponse = await authenticatedRequest(
        'POST',
        '/projects',
        user.accessToken!,
        { body: projectData }
      );
      const envData = generateEnvironment(projectResponse.body.id);
      const envResponse = await authenticatedRequest(
        'POST',
        '/environments',
        user.accessToken!,
        { body: envData }
      );
      const environmentId = envResponse.body.id;

      // Start environment
      await authenticatedRequest(
        'POST',
        `/environments/${environmentId}/start`,
        user.accessToken!
      );

      // Step 1: Create VS Code session
      const createSessionResponse = await authenticatedRequest(
        'POST',
        '/sessions',
        user.accessToken!,
        {
          body: {
            environmentId,
            sessionType: 'vscode_server',
            sessionName: 'main-vscode',
          },
        }
      );

      expect(createSessionResponse.status).toBe(201);
      SchemaValidators.validateSession(createSessionResponse.body);
      const sessionId = createSessionResponse.body.id;

      // Step 2: List active sessions
      const listSessionsResponse = await authenticatedRequest(
        'GET',
        '/sessions',
        user.accessToken!,
        {
          query: {
            environmentId,
          },
        }
      );

      expect(listSessionsResponse.status).toBe(200);

      // Step 3: Access session logs
      const logsResponse = await authenticatedRequest(
        'GET',
        `/sessions/${sessionId}/logs`,
        user.accessToken!,
        {
          query: {
            stream: 'stdout',
            limit: 100,
          },
        }
      );

      expect(logsResponse.status).toBe(200);

      // Step 4: Filter logs by timestamp
      const filteredLogsResponse = await authenticatedRequest(
        'GET',
        `/sessions/${sessionId}/logs`,
        user.accessToken!,
        {
          query: {
            since: new Date(Date.now() - 3600000).toISOString(), // Last hour
            limit: 50,
          },
        }
      );

      expect(filteredLogsResponse.status).toBe(200);

      // Step 5: Terminate session
      const terminateResponse = await authenticatedRequest(
        'DELETE',
        `/sessions/${sessionId}`,
        user.accessToken!
      );

      expect(terminateResponse.status).toBe(204);
    });
  });

  /**
   * Workflow 7: Error Recovery and Cleanup
   *
   * Tests that the system handles errors gracefully and cleans up properly
   */
  describe('Error Recovery and Cleanup', () => {
    it('should handle errors and cleanup gracefully', async () => {
      const user = await createTestUser();

      // Step 1: Try to access non-existent resource
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const notFoundResponse = await authenticatedRequest(
        'GET',
        `/projects/${nonExistentId}`,
        user.accessToken!
      );

      expect(notFoundResponse.status).toBe(404);
      SchemaValidators.validateError(notFoundResponse.body);

      // Step 2: Create project with invalid data
      const invalidProjectResponse = await authenticatedRequest(
        'POST',
        '/projects',
        user.accessToken!,
        {
          body: {
            name: '', // Invalid: empty name
            slug: 'test',
          },
        }
      );

      expect(invalidProjectResponse.status).toBe(400);

      // Step 3: Try to delete resource that doesn't exist
      const deleteNonExistentResponse = await authenticatedRequest(
        'DELETE',
        `/projects/${nonExistentId}`,
        user.accessToken!
      );

      expect(deleteNonExistentResponse.status).toBe(404);

      // Step 4: Verify user can still perform valid operations
      const validProjectData = generateProject();
      const validProjectResponse = await authenticatedRequest(
        'POST',
        '/projects',
        user.accessToken!,
        { body: validProjectData }
      );

      expect(validProjectResponse.status).toBe(201);

      // Cleanup: Delete the project
      const cleanupResponse = await authenticatedRequest(
        'DELETE',
        `/projects/${validProjectResponse.body.id}`,
        user.accessToken!
      );

      expect(cleanupResponse.status).toBe(204);
    });
  });
});
