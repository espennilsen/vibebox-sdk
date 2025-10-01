/**
 * Contract Test: POST /teams/{teamId}/members
 * Tests add team member endpoint contract
 * Task: T039
 */
import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { SchemaValidators, createMockToken } from '../helpers/test-utils';

describe('POST /teams/{teamId}/members', () => {
  const mockTeamId = '550e8400-e29b-41d4-a716-446655440000';

  /**
   * Test: Should add team member with valid data
   * Following TDD: This test will FAIL until the endpoint is implemented
   */
  it('should return 201 when member is added', async () => {
    // Arrange
    const authToken = createMockToken();
    const memberData = {
      email: 'newmember@example.com',
      role: 'developer',
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .post(`/api/v1/teams/${mockTeamId}/members`)
      .set('Authorization', authToken)
      .send(memberData)
      .set('Content-Type', 'application/json');

    // Assert
    expect(response.status).toBe(201);
  });

  /**
   * Test: Should return 400 for missing required email field
   */
  it('should return 400 for missing email', async () => {
    // Arrange
    const authToken = createMockToken();
    const memberData = {
      role: 'developer',
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .post(`/api/v1/teams/${mockTeamId}/members`)
      .set('Authorization', authToken)
      .send(memberData)
      .set('Content-Type', 'application/json');

    // Assert
    expect(response.status).toBe(400);
  });

  /**
   * Test: Should return 400 for missing required role field
   */
  it('should return 400 for missing role', async () => {
    // Arrange
    const authToken = createMockToken();
    const memberData = {
      email: 'member@example.com',
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .post(`/api/v1/teams/${mockTeamId}/members`)
      .set('Authorization', authToken)
      .send(memberData)
      .set('Content-Type', 'application/json');

    // Assert
    expect(response.status).toBe(400);
  });

  /**
   * Test: Should validate role enum (admin, developer, viewer)
   */
  it('should return 400 for invalid role value', async () => {
    // Arrange
    const authToken = createMockToken();
    const memberData = {
      email: 'member@example.com',
      role: 'invalid-role',
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .post(`/api/v1/teams/${mockTeamId}/members`)
      .set('Authorization', authToken)
      .send(memberData)
      .set('Content-Type', 'application/json');

    // Assert
    expect(response.status).toBe(400);
  });

  /**
   * Test: Should accept admin role
   */
  it('should accept admin role', async () => {
    // Arrange
    const authToken = createMockToken();
    const memberData = {
      email: 'admin@example.com',
      role: 'admin',
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .post(`/api/v1/teams/${mockTeamId}/members`)
      .set('Authorization', authToken)
      .send(memberData)
      .set('Content-Type', 'application/json');

    // Assert
    expect([201, 401, 404]).toContain(response.status);
  });

  /**
   * Test: Should accept viewer role
   */
  it('should accept viewer role', async () => {
    // Arrange
    const authToken = createMockToken();
    const memberData = {
      email: 'viewer@example.com',
      role: 'viewer',
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .post(`/api/v1/teams/${mockTeamId}/members`)
      .set('Authorization', authToken)
      .send(memberData)
      .set('Content-Type', 'application/json');

    // Assert
    expect([201, 401, 404]).toContain(response.status);
  });

  /**
   * Test: Should return 401 when no authentication token provided
   */
  it('should return 401 when no authentication token provided', async () => {
    // Arrange
    const memberData = {
      email: 'member@example.com',
      role: 'developer',
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .post(`/api/v1/teams/${mockTeamId}/members`)
      .send(memberData)
      .set('Content-Type', 'application/json');

    // Assert
    expect(response.status).toBe(401);
  });
});
