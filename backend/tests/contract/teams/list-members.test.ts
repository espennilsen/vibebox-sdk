/**
 * Contract Test: GET /teams/{teamId}/members
 * Tests list team members endpoint contract
 * Task: T038
 */
import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { SchemaValidators, createMockToken } from '../helpers/test-utils';

describe('GET /teams/{teamId}/members', () => {
  const mockTeamId = '550e8400-e29b-41d4-a716-446655440000';

  /**
   * Test: Should return array of team members
   * Following TDD: This test will FAIL until the endpoint is implemented
   */
  it('should return 200 with array of team members', async () => {
    // Arrange
    const authToken = createMockToken();

    // Act
    const response = await supertest('http://localhost:3000')
      .get(`/api/v1/teams/${mockTeamId}/members`)
      .set('Authorization', authToken);

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(Array.isArray(response.body)).toBe(true);

    if (response.body.length > 0) {
      response.body.forEach((member: any) => {
        SchemaValidators.validateTeamMember(member);
      });
    }
  });

  /**
   * Test: Should return 401 when no authentication token provided
   */
  it('should return 401 when no authentication token provided', async () => {
    // Act
    const response = await supertest('http://localhost:3000')
      .get(`/api/v1/teams/${mockTeamId}/members`);

    // Assert
    expect(response.status).toBe(401);
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
      .get(`/api/v1/teams/${nonExistentId}/members`)
      .set('Authorization', authToken);

    // Assert
    expect(response.status).toBe(404);
  });
});
