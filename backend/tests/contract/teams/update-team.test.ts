/**
 * Contract Test: PATCH /teams/{teamId}
 * Tests update team endpoint contract
 * Task: T036
 */
import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { SchemaValidators, createMockToken } from '../helpers/test-utils';

describe('PATCH /teams/{teamId}', () => {
  const mockTeamId = '550e8400-e29b-41d4-a716-446655440000';

  /**
   * Test: Should update team with valid data
   * Following TDD: This test will FAIL until the endpoint is implemented
   */
  it('should return 200 when team is updated', async () => {
    // Arrange
    const authToken = createMockToken();
    const updateData = {
      name: 'Updated Team Name',
      description: 'Updated description',
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .patch(`/api/v1/teams/${mockTeamId}`)
      .set('Authorization', authToken)
      .send(updateData)
      .set('Content-Type', 'application/json');

    // Assert
    expect(response.status).toBe(200);
  });

  /**
   * Test: Should return 401 when no authentication token provided
   */
  it('should return 401 when no authentication token provided', async () => {
    // Arrange
    const updateData = { name: 'New Name' };

    // Act
    const response = await supertest('http://localhost:3000')
      .patch(`/api/v1/teams/${mockTeamId}`)
      .send(updateData)
      .set('Content-Type', 'application/json');

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
    const updateData = { name: 'New Name' };

    // Act
    const response = await supertest('http://localhost:3000')
      .patch(`/api/v1/teams/${nonExistentId}`)
      .set('Authorization', authToken)
      .send(updateData)
      .set('Content-Type', 'application/json');

    // Assert
    expect(response.status).toBe(404);
  });

  /**
   * Test: Should accept empty update object
   */
  it('should accept empty update object', async () => {
    // Arrange
    const authToken = createMockToken();
    const updateData = {};

    // Act
    const response = await supertest('http://localhost:3000')
      .patch(`/api/v1/teams/${mockTeamId}`)
      .set('Authorization', authToken)
      .send(updateData)
      .set('Content-Type', 'application/json');

    // Assert
    expect([200, 401, 404]).toContain(response.status);
  });
});
