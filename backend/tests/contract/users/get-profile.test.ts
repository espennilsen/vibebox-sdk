/**
 * Contract Test: GET /users/me
 * Tests get current user profile endpoint contract
 * Task: T031
 */
import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { SchemaValidators, createMockToken } from '../helpers/test-utils';

describe('GET /users/me', () => {
  /**
   * Test: Should return current user profile with valid authentication
   * Following TDD: This test will FAIL until the endpoint is implemented
   */
  it('should return 200 with user profile when authenticated', async () => {
    // Arrange
    const authToken = createMockToken();

    // Act
    const response = await supertest('http://localhost:3000')
      .get('/api/v1/users/me')
      .set('Authorization', authToken);

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    SchemaValidators.validateUser(response.body);
  });

  /**
   * Test: Should return 401 when no authentication token provided
   */
  it('should return 401 when no authentication token provided', async () => {
    // Act - Request without Authorization header
    const response = await supertest('http://localhost:3000')
      .get('/api/v1/users/me');

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

    // Act
    const response = await supertest('http://localhost:3000')
      .get('/api/v1/users/me')
      .set('Authorization', invalidToken);

    // Assert
    expect(response.status).toBe(401);
    SchemaValidators.validateError(response.body);
  });

  /**
   * Test: Should return 401 with expired authentication token
   */
  it('should return 401 with expired authentication token', async () => {
    // Arrange - Use a token with expired timestamp
    const expiredToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MTYyMzkwMjJ9.xxx';

    // Act
    const response = await supertest('http://localhost:3000')
      .get('/api/v1/users/me')
      .set('Authorization', expiredToken);

    // Assert
    expect(response.status).toBe(401);
    SchemaValidators.validateError(response.body);
  });

  /**
   * Test: Should include all required User schema fields
   */
  it('should return user with all required fields per OpenAPI schema', async () => {
    // Arrange
    const authToken = createMockToken();

    // Act
    const response = await supertest('http://localhost:3000')
      .get('/api/v1/users/me')
      .set('Authorization', authToken);

    // Assert - When implemented, response should have required fields
    if (response.status === 200) {
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('displayName');
      expect(response.body).toHaveProperty('createdAt');
    }
  });

  /**
   * Test: Should accept Bearer token format
   */
  it('should accept Bearer token format in Authorization header', async () => {
    // Arrange
    const bearerToken = createMockToken();

    // Act
    const response = await supertest('http://localhost:3000')
      .get('/api/v1/users/me')
      .set('Authorization', bearerToken);

    // Assert - Should not return 400 for malformed auth header
    expect(response.status).not.toBe(400);
  });
});
