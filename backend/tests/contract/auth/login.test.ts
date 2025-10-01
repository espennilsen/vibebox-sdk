/**
 * Contract Test: POST /auth/login
 * Tests the user login endpoint contract
 * Task: T028
 */
import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { SchemaValidators } from '../helpers/test-utils';

describe('POST /auth/login', () => {
  /**
   * Test: Should accept valid credentials and return 200 with auth response
   * Following TDD: This test will FAIL until the endpoint is implemented
   */
  it('should accept valid credentials and return 200 with access token, refresh token, and user', async () => {
    // Arrange
    const requestBody = {
      email: 'user@example.com',
      password: 'CorrectPassword123!',
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .post('/api/v1/auth/login')
      .send(requestBody)
      .set('Content-Type', 'application/json');

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    SchemaValidators.validateAuthResponse(response.body);
  });

  /**
   * Test: Should return 401 for invalid credentials
   */
  it('should return 401 for invalid email', async () => {
    // Arrange
    const requestBody = {
      email: 'nonexistent@example.com',
      password: 'AnyPassword123!',
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .post('/api/v1/auth/login')
      .send(requestBody)
      .set('Content-Type', 'application/json');

    // Assert
    expect(response.status).toBe(401);
    SchemaValidators.validateError(response.body);
  });

  /**
   * Test: Should return 401 for invalid password
   */
  it('should return 401 for invalid password', async () => {
    // Arrange
    const requestBody = {
      email: 'user@example.com',
      password: 'WrongPassword123!',
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .post('/api/v1/auth/login')
      .send(requestBody)
      .set('Content-Type', 'application/json');

    // Assert
    expect(response.status).toBe(401);
    SchemaValidators.validateError(response.body);
  });

  /**
   * Test: Should return 400 for missing required fields
   */
  it('should return 400 for missing email', async () => {
    // Arrange
    const requestBody = {
      password: 'SomePassword123!',
      // Missing email
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .post('/api/v1/auth/login')
      .send(requestBody)
      .set('Content-Type', 'application/json');

    // Assert
    expect(response.status).toBe(400);
    SchemaValidators.validateError(response.body);
  });

  /**
   * Test: Should return 400 for missing password
   */
  it('should return 400 for missing password', async () => {
    // Arrange
    const requestBody = {
      email: 'user@example.com',
      // Missing password
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .post('/api/v1/auth/login')
      .send(requestBody)
      .set('Content-Type', 'application/json');

    // Assert
    expect(response.status).toBe(400);
    SchemaValidators.validateError(response.body);
  });

  /**
   * Test: Should not require authentication (security: [] in OpenAPI spec)
   */
  it('should not require authentication token', async () => {
    // Arrange
    const requestBody = {
      email: 'user@example.com',
      password: 'Password123!',
    };

    // Act - Request without Authorization header
    const response = await supertest('http://localhost:3000')
      .post('/api/v1/auth/login')
      .send(requestBody)
      .set('Content-Type', 'application/json');

    // Assert - Should not return 401 due to missing auth (will return 200 or 401 for credentials)
    expect(response.status).not.toBe(403);
  });

  /**
   * Test: Should accept valid email format
   */
  it('should validate email format', async () => {
    // Arrange
    const requestBody = {
      email: 'not-an-email',
      password: 'Password123!',
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .post('/api/v1/auth/login')
      .send(requestBody)
      .set('Content-Type', 'application/json');

    // Assert - Could be 400 (validation) or 401 (invalid credentials)
    expect([400, 401]).toContain(response.status);
  });
});
