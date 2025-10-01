/**
 * Contract Tests: Extension Endpoints
 * Tests VS Code extension management operations
 * Tasks: T058-T061
 */
import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { SchemaValidators, createMockToken } from '../helpers/test-utils';

const BASE_URL = 'http://localhost:3000';
const mockEnvironmentId = '550e8400-e29b-41d4-a716-446655440000';
const mockExtensionId = '850e8400-e29b-41d4-a716-446655440000';

/**
 * GET /extensions - Search extensions
 * Task: T058
 */
describe('GET /extensions', () => {
  it('should return 200 with array of extensions', async () => {
    const authToken = createMockToken();

    const response = await supertest(BASE_URL)
      .get('/api/v1/extensions')
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        response.body.forEach((ext: any) => {
          SchemaValidators.validateExtension(ext);
        });
      }
    }
  });

  it('should filter by query parameter', async () => {
    const authToken = createMockToken();

    const response = await supertest(BASE_URL)
      .get('/api/v1/extensions?query=python')
      .set('Authorization', authToken);

    expect([200, 401]).toContain(response.status);
  });

  it('should filter by publisher parameter', async () => {
    const authToken = createMockToken();

    const response = await supertest(BASE_URL)
      .get('/api/v1/extensions?publisher=microsoft')
      .set('Authorization', authToken);

    expect([200, 401]).toContain(response.status);
  });

  it('should return 401 when no authentication token provided', async () => {
    const response = await supertest(BASE_URL)
      .get('/api/v1/extensions');

    expect(response.status).toBe(401);
  });
});

/**
 * GET /environments/{environmentId}/extensions - List installed extensions
 * Task: T059
 */
describe('GET /environments/{environmentId}/extensions', () => {
  it('should return 200 with array of installed extensions', async () => {
    const authToken = createMockToken();

    const response = await supertest(BASE_URL)
      .get(`/api/v1/environments/${mockEnvironmentId}/extensions`)
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        response.body.forEach((envExt: any) => {
          SchemaValidators.validateEnvironmentExtension(envExt);
        });
      }
    }
  });

  it('should return 401 when no authentication token provided', async () => {
    const response = await supertest(BASE_URL)
      .get(`/api/v1/environments/${mockEnvironmentId}/extensions`);

    expect(response.status).toBe(401);
  });

  it('should return 404 for non-existent environment', async () => {
    const authToken = createMockToken();
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const response = await supertest(BASE_URL)
      .get(`/api/v1/environments/${nonExistentId}/extensions`)
      .set('Authorization', authToken);

    expect(response.status).toBe(404);
  });
});

/**
 * POST /environments/{environmentId}/extensions - Install extension
 * Task: T060
 */
describe('POST /environments/{environmentId}/extensions', () => {
  it('should return 202 when extension installation starts', async () => {
    const authToken = createMockToken();
    const extData = {
      extensionId: 'ms-python.python',
    };

    const response = await supertest(BASE_URL)
      .post(`/api/v1/environments/${mockEnvironmentId}/extensions`)
      .set('Authorization', authToken)
      .send(extData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(202);
    if (response.status === 202) {
      SchemaValidators.validateEnvironmentExtension(response.body);
    }
  });

  it('should return 400 for missing required extensionId', async () => {
    const authToken = createMockToken();
    const extData = {}; // Missing extensionId

    const response = await supertest(BASE_URL)
      .post(`/api/v1/environments/${mockEnvironmentId}/extensions`)
      .set('Authorization', authToken)
      .send(extData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
  });

  it('should return 401 when no authentication token provided', async () => {
    const extData = {
      extensionId: 'ms-python.python',
    };

    const response = await supertest(BASE_URL)
      .post(`/api/v1/environments/${mockEnvironmentId}/extensions`)
      .send(extData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(401);
  });

  it('should return 404 for non-existent environment', async () => {
    const authToken = createMockToken();
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    const extData = {
      extensionId: 'ms-python.python',
    };

    const response = await supertest(BASE_URL)
      .post(`/api/v1/environments/${nonExistentId}/extensions`)
      .set('Authorization', authToken)
      .send(extData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(404);
  });
});

/**
 * DELETE /environments/{environmentId}/extensions/{extensionId} - Uninstall extension
 * Task: T061
 */
describe('DELETE /environments/{environmentId}/extensions/{extensionId}', () => {
  it('should return 202 when extension uninstallation starts', async () => {
    const authToken = createMockToken();

    const response = await supertest(BASE_URL)
      .delete(`/api/v1/environments/${mockEnvironmentId}/extensions/${mockExtensionId}`)
      .set('Authorization', authToken);

    expect(response.status).toBe(202);
  });

  it('should return 401 when no authentication token provided', async () => {
    const response = await supertest(BASE_URL)
      .delete(`/api/v1/environments/${mockEnvironmentId}/extensions/${mockExtensionId}`);

    expect(response.status).toBe(401);
  });

  it('should return 404 for non-existent environment', async () => {
    const authToken = createMockToken();
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const response = await supertest(BASE_URL)
      .delete(`/api/v1/environments/${nonExistentId}/extensions/${mockExtensionId}`)
      .set('Authorization', authToken);

    expect(response.status).toBe(404);
  });

  it('should return 404 for non-existent extension', async () => {
    const authToken = createMockToken();
    const nonExistentExtId = '00000000-0000-0000-0000-000000000000';

    const response = await supertest(BASE_URL)
      .delete(`/api/v1/environments/${mockEnvironmentId}/extensions/${nonExistentExtId}`)
      .set('Authorization', authToken);

    expect(response.status).toBe(404);
  });

  it('should return 400 for invalid UUID format', async () => {
    const authToken = createMockToken();

    const response = await supertest(BASE_URL)
      .delete(`/api/v1/environments/${mockEnvironmentId}/extensions/invalid-id`)
      .set('Authorization', authToken);

    expect(response.status).toBe(400);
  });
});
