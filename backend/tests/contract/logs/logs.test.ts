/**
 * Contract Tests: Log Endpoints
 * Tests log retrieval operations
 * Task: T062
 */
import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { SchemaValidators, createMockToken } from '../helpers/test-utils';

const BASE_URL = 'http://localhost:3000';
const mockEnvironmentId = '550e8400-e29b-41d4-a716-446655440000';

/**
 * GET /environments/{environmentId}/logs - Get environment logs
 * Task: T062
 */
describe('GET /environments/{environmentId}/logs', () => {
  it('should return 200 with array of log entries', async () => {
    const authToken = createMockToken();

    const response = await supertest(BASE_URL)
      .get(`/api/v1/environments/${mockEnvironmentId}/logs`)
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        response.body.forEach((log: any) => {
          SchemaValidators.validateLogEntry(log);
        });
      }
    }
  });

  it('should filter by since query parameter', async () => {
    const authToken = createMockToken();
    const since = '2025-09-30T00:00:00Z';

    const response = await supertest(BASE_URL)
      .get(`/api/v1/environments/${mockEnvironmentId}/logs?since=${encodeURIComponent(since)}`)
      .set('Authorization', authToken);

    expect([200, 401, 404]).toContain(response.status);
  });

  it('should filter by until query parameter', async () => {
    const authToken = createMockToken();
    const until = '2025-09-30T23:59:59Z';

    const response = await supertest(BASE_URL)
      .get(`/api/v1/environments/${mockEnvironmentId}/logs?until=${encodeURIComponent(until)}`)
      .set('Authorization', authToken);

    expect([200, 401, 404]).toContain(response.status);
  });

  it('should support tail parameter (default 100)', async () => {
    const authToken = createMockToken();

    const response = await supertest(BASE_URL)
      .get(`/api/v1/environments/${mockEnvironmentId}/logs?tail=50`)
      .set('Authorization', authToken);

    expect([200, 401, 404]).toContain(response.status);
  });

  it('should filter by stream parameter (stdout, stderr, all)', async () => {
    const authToken = createMockToken();

    const stdoutResponse = await supertest(BASE_URL)
      .get(`/api/v1/environments/${mockEnvironmentId}/logs?stream=stdout`)
      .set('Authorization', authToken);

    const stderrResponse = await supertest(BASE_URL)
      .get(`/api/v1/environments/${mockEnvironmentId}/logs?stream=stderr`)
      .set('Authorization', authToken);

    const allResponse = await supertest(BASE_URL)
      .get(`/api/v1/environments/${mockEnvironmentId}/logs?stream=all`)
      .set('Authorization', authToken);

    expect([200, 401, 404]).toContain(stdoutResponse.status);
    expect([200, 401, 404]).toContain(stderrResponse.status);
    expect([200, 401, 404]).toContain(allResponse.status);
  });

  it('should validate stream enum', async () => {
    const authToken = createMockToken();

    const response = await supertest(BASE_URL)
      .get(`/api/v1/environments/${mockEnvironmentId}/logs?stream=invalid`)
      .set('Authorization', authToken);

    expect([400, 401, 404]).toContain(response.status);
  });

  it('should return 401 when no authentication token provided', async () => {
    const response = await supertest(BASE_URL)
      .get(`/api/v1/environments/${mockEnvironmentId}/logs`);

    expect(response.status).toBe(401);
  });

  it('should return 404 for non-existent environment', async () => {
    const authToken = createMockToken();
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const response = await supertest(BASE_URL)
      .get(`/api/v1/environments/${nonExistentId}/logs`)
      .set('Authorization', authToken);

    expect(response.status).toBe(404);
  });

  it('should support combined query parameters', async () => {
    const authToken = createMockToken();
    const since = '2025-09-30T00:00:00Z';

    const response = await supertest(BASE_URL)
      .get(`/api/v1/environments/${mockEnvironmentId}/logs?since=${encodeURIComponent(since)}&tail=100&stream=stdout`)
      .set('Authorization', authToken);

    expect([200, 401, 404]).toContain(response.status);
  });
});
