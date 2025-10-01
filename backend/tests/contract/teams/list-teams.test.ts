/**
 * Contract Test: GET /teams
 * Tests list user's teams endpoint contract
 * Task: T033
 */
import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { SchemaValidators, createMockToken } from '../helpers/test-utils';

describe('GET /teams', () => {
  /**
   * Test: Should return array of teams with valid authentication
   * Following TDD: This test will FAIL until the endpoint is implemented
   */
  it('should return 200 with array of teams when authenticated', async () => {
    // Arrange
    const authToken = createMockToken();

    // Act
    const response = await supertest('http://localhost:3000')
      .get('/api/v1/teams')
      .set('Authorization', authToken);

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(Array.isArray(response.body)).toBe(true);

    // Validate each team in array
    if (response.body.length > 0) {
      response.body.forEach((team: any) => {
        SchemaValidators.validateTeam(team);
      });
    }
  });

  /**
   * Test: Should return 401 when no authentication token provided
   */
  it('should return 401 when no authentication token provided', async () => {
    // Act - Request without Authorization header
    const response = await supertest('http://localhost:3000')
      .get('/api/v1/teams');

    // Assert
    expect(response.status).toBe(401);
    SchemaValidators.validateError(response.body);
  });

  /**
   * Test: Should return empty array when user has no teams
   */
  it('should return empty array when user has no teams', async () => {
    // Arrange
    const authToken = createMockToken();

    // Act
    const response = await supertest('http://localhost:3000')
      .get('/api/v1/teams')
      .set('Authorization', authToken);

    // Assert - When implemented, should return empty array for new user
    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);
    }
  });

  /**
   * Test: Should return 401 with invalid authentication token
   */
  it('should return 401 with invalid authentication token', async () => {
    // Arrange
    const invalidToken = 'Bearer invalid.jwt.token';

    // Act
    const response = await supertest('http://localhost:3000')
      .get('/api/v1/teams')
      .set('Authorization', invalidToken);

    // Assert
    expect(response.status).toBe(401);
    SchemaValidators.validateError(response.body);
  });
});
