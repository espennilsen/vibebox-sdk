/**
 * Contract Test: POST /teams
 * Tests create new team endpoint contract
 * Task: T034
 */
import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { SchemaValidators, createMockToken, isValidSlug } from '../helpers/test-utils';

describe('POST /teams', () => {
  /**
   * Test: Should create team with valid data and return 201
   * Following TDD: This test will FAIL until the endpoint is implemented
   */
  it('should return 201 with created team when authenticated', async () => {
    // Arrange
    const authToken = createMockToken();
    const teamData = {
      name: 'Test Team',
      slug: 'test-team',
      description: 'A test team for contract testing',
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .post('/api/v1/teams')
      .set('Authorization', authToken)
      .send(teamData)
      .set('Content-Type', 'application/json');

    // Assert
    expect(response.status).toBe(201);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    SchemaValidators.validateTeam(response.body);
  });

  /**
   * Test: Should return 400 for missing required fields
   */
  it('should return 400 for missing name field', async () => {
    // Arrange
    const authToken = createMockToken();
    const teamData = {
      slug: 'test-team',
      // Missing required name
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .post('/api/v1/teams')
      .set('Authorization', authToken)
      .send(teamData)
      .set('Content-Type', 'application/json');

    // Assert
    expect(response.status).toBe(400);
    SchemaValidators.validateError(response.body);
  });

  /**
   * Test: Should return 400 for missing slug field
   */
  it('should return 400 for missing slug field', async () => {
    // Arrange
    const authToken = createMockToken();
    const teamData = {
      name: 'Test Team',
      // Missing required slug
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .post('/api/v1/teams')
      .set('Authorization', authToken)
      .send(teamData)
      .set('Content-Type', 'application/json');

    // Assert
    expect(response.status).toBe(400);
    SchemaValidators.validateError(response.body);
  });

  /**
   * Test: Should validate slug pattern (lowercase alphanumeric with hyphens, 3-50 chars)
   */
  it('should return 400 for invalid slug pattern', async () => {
    // Arrange
    const authToken = createMockToken();
    const teamData = {
      name: 'Test Team',
      slug: 'Invalid_Slug!', // Contains uppercase and special chars
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .post('/api/v1/teams')
      .set('Authorization', authToken)
      .send(teamData)
      .set('Content-Type', 'application/json');

    // Assert
    expect(response.status).toBe(400);
    SchemaValidators.validateError(response.body);
  });

  /**
   * Test: Should return 400 for slug shorter than 3 characters
   */
  it('should return 400 for slug shorter than 3 characters', async () => {
    // Arrange
    const authToken = createMockToken();
    const teamData = {
      name: 'Test Team',
      slug: 'ab', // Only 2 characters
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .post('/api/v1/teams')
      .set('Authorization', authToken)
      .send(teamData)
      .set('Content-Type', 'application/json');

    // Assert
    expect(response.status).toBe(400);
    SchemaValidators.validateError(response.body);
  });

  /**
   * Test: Should return 400 for slug longer than 50 characters
   */
  it('should return 400 for slug longer than 50 characters', async () => {
    // Arrange
    const authToken = createMockToken();
    const teamData = {
      name: 'Test Team',
      slug: 'a'.repeat(51), // 51 characters
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .post('/api/v1/teams')
      .set('Authorization', authToken)
      .send(teamData)
      .set('Content-Type', 'application/json');

    // Assert
    expect(response.status).toBe(400);
    SchemaValidators.validateError(response.body);
  });

  /**
   * Test: Should return 400 for name exceeding 100 characters
   */
  it('should return 400 for name exceeding max length', async () => {
    // Arrange
    const authToken = createMockToken();
    const teamData = {
      name: 'a'.repeat(101), // 101 characters
      slug: 'test-team',
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .post('/api/v1/teams')
      .set('Authorization', authToken)
      .send(teamData)
      .set('Content-Type', 'application/json');

    // Assert
    expect(response.status).toBe(400);
    SchemaValidators.validateError(response.body);
  });

  /**
   * Test: Should return 401 when no authentication token provided
   */
  it('should return 401 when no authentication token provided', async () => {
    // Arrange
    const teamData = {
      name: 'Test Team',
      slug: 'test-team',
    };

    // Act - Request without Authorization header
    const response = await supertest('http://localhost:3000')
      .post('/api/v1/teams')
      .send(teamData)
      .set('Content-Type', 'application/json');

    // Assert
    expect(response.status).toBe(401);
    SchemaValidators.validateError(response.body);
  });

  /**
   * Test: Should accept optional description field
   */
  it('should accept optional description field', async () => {
    // Arrange
    const authToken = createMockToken();
    const teamData = {
      name: 'Test Team',
      slug: 'test-team-desc',
      description: 'Optional description',
    };

    // Act
    const response = await supertest('http://localhost:3000')
      .post('/api/v1/teams')
      .set('Authorization', authToken)
      .send(teamData)
      .set('Content-Type', 'application/json');

    // Assert
    expect([201, 401]).toContain(response.status);
  });
});
