/**
 * Contract Test: POST /auth/register
 * Tests the user registration endpoint contract
 * Task: T027
 */
import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { SchemaValidators } from '../helpers/test-utils';

describe('POST /auth/register', () => {
  /**
   * Test: Should accept valid registration request and return 201 with auth response
   * Following TDD: This test will FAIL until the endpoint is implemented
   */
  it('should accept valid registration and return 201 with access token, refresh token, and user', async () => {
    // Arrange
    const requestBody = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      displayName: 'Test User',
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .post('/api/v1/auth/register')
      .send(requestBody)
      .set('Content-Type', 'application/json');

    // Assert
    expect(response.status).toBe(201);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    SchemaValidators.validateAuthResponse(response.body);
  });

  /**
   * Test: Should reject registration with invalid email format
   */
  it('should return 400 for invalid email format', async () => {
    // Arrange
    const requestBody = {
      email: 'invalid-email',
      password: 'SecurePass123!',
      displayName: 'Test User',
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .post('/api/v1/auth/register')
      .send(requestBody)
      .set('Content-Type', 'application/json');

    // Assert
    expect(response.status).toBe(400);
    SchemaValidators.validateError(response.body);
  });

  /**
   * Test: Should reject registration with password shorter than 8 characters
   */
  it('should return 400 for password shorter than 8 characters', async () => {
    // Arrange
    const requestBody = {
      email: 'test@example.com',
      password: 'short',
      displayName: 'Test User',
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .post('/api/v1/auth/register')
      .send(requestBody)
      .set('Content-Type', 'application/json');

    // Assert
    expect(response.status).toBe(400);
    SchemaValidators.validateError(response.body);
  });

  /**
   * Test: Should reject registration with missing required fields
   */
  it('should return 400 for missing required fields', async () => {
    // Arrange
    const requestBody = {
      email: 'test@example.com',
      // Missing password and displayName
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .post('/api/v1/auth/register')
      .send(requestBody)
      .set('Content-Type', 'application/json');

    // Assert
    expect(response.status).toBe(400);
    SchemaValidators.validateError(response.body);
  });

  /**
   * Test: Should reject registration with displayName exceeding 100 characters
   */
  it('should return 400 for displayName exceeding max length', async () => {
    // Arrange
    const requestBody = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      displayName: 'a'.repeat(101), // 101 characters
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .post('/api/v1/auth/register')
      .send(requestBody)
      .set('Content-Type', 'application/json');

    // Assert
    expect(response.status).toBe(400);
    SchemaValidators.validateError(response.body);
  });

  /**
   * Test: Should return 409 when email already exists
   * Note: This test will fail until both registration and duplicate detection are implemented
   */
  it('should return 409 for duplicate email', async () => {
    // Arrange
    const requestBody = {
      email: 'existing@example.com',
      password: 'SecurePass123!',
      displayName: 'Test User',
    };

    // Act - First registration (would succeed if implemented)
    await supertest('http://localhost:3000')
      .post('/api/v1/auth/register')
      .send(requestBody)
      .set('Content-Type', 'application/json');

    // Act - Second registration with same email
    const response = await supertest('http://localhost:3000')
      .post('/api/v1/auth/register')
      .send(requestBody)
      .set('Content-Type', 'application/json');

    // Assert
    expect(response.status).toBe(409);
    SchemaValidators.validateError(response.body);
  });

  /**
   * Test: Should not require authentication (security: [] in OpenAPI spec)
   */
  it('should not require authentication token', async () => {
    // Arrange
    const requestBody = {
      email: 'noauth@example.com',
      password: 'SecurePass123!',
      displayName: 'No Auth User',
    };

    // Act - Request without Authorization header
    const response = await supertest('http://localhost:3000')
      .post('/api/v1/auth/register')
      .send(requestBody)
      .set('Content-Type', 'application/json');

    // Assert - Should not return 401 (will return 201 when implemented, currently 404)
    expect(response.status).not.toBe(401);
  });
});
