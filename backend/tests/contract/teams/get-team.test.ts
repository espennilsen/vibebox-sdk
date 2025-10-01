/**
 * Contract Test: GET /teams/{teamId}
 * Tests get team details endpoint contract
 * Task: T035
 */
import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { SchemaValidators, createMockToken } from '../helpers/test-utils';

describe('GET /teams/{teamId}', () => {
  const mockTeamId = '550e8400-e29b-41d4-a716-446655440000';

  /**
   * Test: Should return team details with valid authentication
   * Following TDD: This test will FAIL until the endpoint is implemented
   */
  it('should return 200 with team details when authenticated', async () => {
    // Arrange
    const authToken = createMockToken();

    // Act
    const response = await supertest('http://localhost:3000')
      .get(`/api/v1/teams/${mockTeamId}`)
      .set('Authorization', authToken);

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    SchemaValidators.validateTeam(response.body);
  });

  /**
   * Test: Should return 401 when no authentication token provided
   */
  it('should return 401 when no authentication token provided', async () => {
    // Act
    const response = await supertest('http://localhost:3000')
      .get(`/api/v1/teams/${mockTeamId}`);

    // Assert
    expect(response.status).toBe(401);
    SchemaValidators.validateError(response.body);
  });

  /**
   * Test: Should return 404 for non-existent team
   */
  it('should return 404 for non-existent team', async () => {
    // Arrange
    const authToken = createMockToken();
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    // Act
    const response = await supertest('http://localhost:3000')
      .get(`/api/v1/teams/${nonExistentId}`)
      .set('Authorization', authToken);

    // Assert
    expect(response.status).toBe(404);
    SchemaValidators.validateError(response.body);
  });

  /**
   * Test: Should return 400 for invalid UUID format
   */
  it('should return 400 for invalid teamId format', async () => {
    // Arrange
    const authToken = createMockToken();
    const invalidId = 'not-a-uuid';

    // Act
    const response = await supertest('http://localhost:3000')
      .get(`/api/v1/teams/${invalidId}`)
      .set('Authorization', authToken);

    // Assert
    expect(response.status).toBe(400);
  });
});
