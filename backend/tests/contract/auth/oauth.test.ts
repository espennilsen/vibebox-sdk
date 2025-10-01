/**
 * Contract Test: GET /auth/oauth/{provider}
 * Tests OAuth login redirect endpoint contract
 * Task: T029
 */
import { describe, it, expect } from 'vitest';
import supertest from 'supertest';

describe('GET /auth/oauth/{provider}', () => {
  /**
   * Test: Should redirect to GitHub OAuth provider with 302
   * Following TDD: This test will FAIL until the endpoint is implemented
   */
  it('should redirect to GitHub OAuth provider with 302', async () => {
    // Act
    const response = await supertest('http://localhost:3000')
      .get('/api/v1/auth/oauth/github')
      .redirects(0); // Don't follow redirects

    // Assert
    expect(response.status).toBe(302);
    expect(response.headers.location).toBeDefined();
    expect(response.headers.location).toMatch(/github\.com/);
  });

  /**
   * Test: Should redirect to Google OAuth provider with 302
   */
  it('should redirect to Google OAuth provider with 302', async () => {
    // Act
    const response = await supertest('http://localhost:3000')
      .get('/api/v1/auth/oauth/google')
      .redirects(0); // Don't follow redirects

    // Assert
    expect(response.status).toBe(302);
    expect(response.headers.location).toBeDefined();
    expect(response.headers.location).toMatch(/google\.com/);
  });

  /**
   * Test: Should return 400 or 404 for invalid provider
   */
  it('should return error for invalid provider', async () => {
    // Act
    const response = await supertest('http://localhost:3000')
      .get('/api/v1/auth/oauth/invalid-provider')
      .redirects(0);

    // Assert - Should reject invalid provider
    expect([400, 404]).toContain(response.status);
  });

  /**
   * Test: Should not require authentication (security: [] in OpenAPI spec)
   */
  it('should not require authentication token', async () => {
    // Act - Request without Authorization header
    const response = await supertest('http://localhost:3000')
      .get('/api/v1/auth/oauth/github')
      .redirects(0);

    // Assert - Should not return 401 for missing auth
    expect(response.status).not.toBe(401);
  });

  /**
   * Test: Should only accept github and google as valid providers (enum validation)
   */
  it('should only accept github or google providers', async () => {
    // Act - Test with other provider names
    const facebookResponse = await supertest('http://localhost:3000')
      .get('/api/v1/auth/oauth/facebook')
      .redirects(0);

    const twitterResponse = await supertest('http://localhost:3000')
      .get('/api/v1/auth/oauth/twitter')
      .redirects(0);

    // Assert - Both should fail
    expect([400, 404]).toContain(facebookResponse.status);
    expect([400, 404]).toContain(twitterResponse.status);
  });
});
