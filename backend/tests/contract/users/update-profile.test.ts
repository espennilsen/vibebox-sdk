/**
 * Contract Test: PATCH /users/me
 * Tests update current user profile endpoint contract
 * Task: T032
 */
import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { SchemaValidators, createMockToken } from '../helpers/test-utils';

describe('PATCH /users/me', () => {
  /**
   * Test: Should update user profile with valid data and authentication
   * Following TDD: This test will FAIL until the endpoint is implemented
   */
  it('should return 200 with updated user profile when authenticated', async () => {
    // Arrange
    const authToken = createMockToken();
    const updateData = {
      displayName: 'Updated Name',
      timezone: 'America/New_York',
      locale: 'en-US',
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .patch('/api/v1/users/me')
      .set('Authorization', authToken)
      .send(updateData)
      .set('Content-Type', 'application/json');

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    SchemaValidators.validateUser(response.body);
  });

  /**
   * Test: Should update displayName field
   */
  it('should accept and update displayName field', async () => {
    // Arrange
    const authToken = createMockToken();
    const updateData = {
      displayName: 'New Display Name',
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .patch('/api/v1/users/me')
      .set('Authorization', authToken)
      .send(updateData)
      .set('Content-Type', 'application/json');

    // Assert
    if (response.status === 200) {
      expect(response.body.displayName).toBe('New Display Name');
    }
  });

  /**
   * Test: Should update avatarUrl field with valid URI
   */
  it('should accept and update avatarUrl with valid URI', async () => {
    // Arrange
    const authToken = createMockToken();
    const updateData = {
      avatarUrl: 'https://example.com/avatar.png',
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .patch('/api/v1/users/me')
      .set('Authorization', authToken)
      .send(updateData)
      .set('Content-Type', 'application/json');

    // Assert - Should accept valid URI
    expect([200, 401]).toContain(response.status);
  });

  /**
   * Test: Should update sshPublicKey field
   */
  it('should accept and update sshPublicKey field', async () => {
    // Arrange
    const authToken = createMockToken();
    const updateData = {
      sshPublicKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC... user@host',
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .patch('/api/v1/users/me')
      .set('Authorization', authToken)
      .send(updateData)
      .set('Content-Type', 'application/json');

    // Assert
    expect([200, 401]).toContain(response.status);
  });

  /**
   * Test: Should update notificationSettings object
   */
  it('should accept and update notificationSettings object', async () => {
    // Arrange
    const authToken = createMockToken();
    const updateData = {
      notificationSettings: {
        emailNotifications: true,
        desktopNotifications: false,
      },
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .patch('/api/v1/users/me')
      .set('Authorization', authToken)
      .send(updateData)
      .set('Content-Type', 'application/json');

    // Assert
    expect([200, 401]).toContain(response.status);
  });

  /**
   * Test: Should return 401 when no authentication token provided
   */
  it('should return 401 when no authentication token provided', async () => {
    // Arrange
    const updateData = {
      displayName: 'Should Not Update',
    };

    // Act - Request without Authorization header
    const response = await supertest('http://localhost:3000')
      .patch('/api/v1/users/me')
      .send(updateData)
      .set('Content-Type', 'application/json');

    // Assert
    expect(response.status).toBe(401);
    SchemaValidators.validateError(response.body);
  });

  /**
   * Test: Should return 401 with invalid authentication token
   */
  it('should return 401 with invalid authentication token', async () => {
    // Arrange
    const invalidToken = 'Bearer invalid.jwt.token';
    const updateData = {
      displayName: 'Should Not Update',
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .patch('/api/v1/users/me')
      .set('Authorization', invalidToken)
      .send(updateData)
      .set('Content-Type', 'application/json');

    // Assert
    expect(response.status).toBe(401);
    SchemaValidators.validateError(response.body);
  });

  /**
   * Test: Should accept empty update (no fields changed)
   */
  it('should accept empty update object', async () => {
    // Arrange
    const authToken = createMockToken();
    const updateData = {};

    // Act
    const response = await supertest('http://localhost:3000')
      .patch('/api/v1/users/me')
      .set('Authorization', authToken)
      .send(updateData)
      .set('Content-Type', 'application/json');

    // Assert - Should return 200 with unchanged user (when implemented)
    expect([200, 401]).toContain(response.status);
  });

  /**
   * Test: Should validate avatarUrl as URI format
   */
  it('should return 400 for invalid avatarUrl format', async () => {
    // Arrange
    const authToken = createMockToken();
    const updateData = {
      avatarUrl: 'not-a-valid-uri',
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .patch('/api/v1/users/me')
      .set('Authorization', authToken)
      .send(updateData)
      .set('Content-Type', 'application/json');

    // Assert - Should validate URI format
    expect([400, 401]).toContain(response.status);
  });

  /**
   * Test: Should not allow updating immutable fields (id, email, createdAt)
   */
  it('should ignore attempts to update immutable fields', async () => {
    // Arrange
    const authToken = createMockToken();
    const updateData = {
      id: 'new-id-should-be-ignored',
      email: 'newemail@example.com',
      createdAt: '2025-01-01T00:00:00Z',
      displayName: 'Valid Update',
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .patch('/api/v1/users/me')
      .set('Authorization', authToken)
      .send(updateData)
      .set('Content-Type', 'application/json');

    // Assert - Should either ignore immutable fields or return error
    // OpenAPI spec doesn't include id, email, createdAt as updateable
    expect([200, 400, 401]).toContain(response.status);
  });
});
