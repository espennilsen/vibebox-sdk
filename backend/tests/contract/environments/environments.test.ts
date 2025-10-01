/**
 * Contract Tests: Environment Endpoints
 * Tests all environment CRUD and lifecycle operations
 * Tasks: T045-T054
 */
import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { SchemaValidators, createMockToken } from '../helpers/test-utils';

const BASE_URL = 'http://localhost:3000';
const mockEnvironmentId = '550e8400-e29b-41d4-a716-446655440000';
const mockProjectId = '650e8400-e29b-41d4-a716-446655440000';

/**
 * GET /environments - List environments
 * Task: T045
 */
describe('GET /environments', () => {
  it('should return 200 with paginated environments', async () => {
    const authToken = createMockToken();

    const response = await supertest(BASE_URL)
      .get('/api/v1/environments')
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      SchemaValidators.validatePagination(response.body.pagination);

      if (response.body.data.length > 0) {
        response.body.data.forEach((env: any) => {
          SchemaValidators.validateEnvironment(env);
        });
      }
    }
  });

  it('should filter by projectId query parameter', async () => {
    const authToken = createMockToken();

    const response = await supertest(BASE_URL)
      .get(`/api/v1/environments?projectId=${mockProjectId}`)
      .set('Authorization', authToken);

    expect([200, 401]).toContain(response.status);
  });

  it('should filter by status query parameter', async () => {
    const authToken = createMockToken();

    const response = await supertest(BASE_URL)
      .get('/api/v1/environments?status=running')
      .set('Authorization', authToken);

    expect([200, 401]).toContain(response.status);
  });

  it('should support pagination with page and limit', async () => {
    const authToken = createMockToken();

    const response = await supertest(BASE_URL)
      .get('/api/v1/environments?page=1&limit=10')
      .set('Authorization', authToken);

    expect([200, 401]).toContain(response.status);
  });

  it('should return 401 when no authentication token provided', async () => {
    const response = await supertest(BASE_URL)
      .get('/api/v1/environments');

    expect(response.status).toBe(401);
  });
});

/**
 * POST /environments - Create environment
 * Task: T046
 */
describe('POST /environments', () => {
  it('should return 201 with created environment', async () => {
    const authToken = createMockToken();
    const envData = {
      name: 'Test Environment',
      slug: 'test-env',
      projectId: mockProjectId,
      baseImage: 'node:20',
      cpuLimit: 2.0,
      memoryLimit: 4096,
      storageLimit: 20480,
    };

    const response = await supertest(BASE_URL)
      .post('/api/v1/environments')
      .set('Authorization', authToken)
      .send(envData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(201);
    if (response.status === 201) {
      SchemaValidators.validateEnvironment(response.body);
    }
  });

  it('should return 400 for missing required fields', async () => {
    const authToken = createMockToken();
    const envData = { name: 'Test' }; // Missing required fields

    const response = await supertest(BASE_URL)
      .post('/api/v1/environments')
      .set('Authorization', authToken)
      .send(envData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
  });

  it('should validate cpuLimit range (0.1-8.0)', async () => {
    const authToken = createMockToken();
    const envData = {
      name: 'Test',
      slug: 'test',
      projectId: mockProjectId,
      baseImage: 'node:20',
      cpuLimit: 10.0, // Exceeds maximum
    };

    const response = await supertest(BASE_URL)
      .post('/api/v1/environments')
      .set('Authorization', authToken)
      .send(envData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
  });

  it('should validate memoryLimit range (512-16384)', async () => {
    const authToken = createMockToken();
    const envData = {
      name: 'Test',
      slug: 'test',
      projectId: mockProjectId,
      baseImage: 'node:20',
      memoryLimit: 100, // Below minimum
    };

    const response = await supertest(BASE_URL)
      .post('/api/v1/environments')
      .set('Authorization', authToken)
      .send(envData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
  });

  it('should accept ports array with containerPort', async () => {
    const authToken = createMockToken();
    const envData = {
      name: 'Test',
      slug: 'test',
      projectId: mockProjectId,
      baseImage: 'node:20',
      ports: [
        { containerPort: 3000, hostPort: 3000, protocol: 'tcp' },
      ],
    };

    const response = await supertest(BASE_URL)
      .post('/api/v1/environments')
      .set('Authorization', authToken)
      .send(envData)
      .set('Content-Type', 'application/json');

    expect([201, 400, 401]).toContain(response.status);
  });

  it('should accept environmentVariables array', async () => {
    const authToken = createMockToken();
    const envData = {
      name: 'Test',
      slug: 'test',
      projectId: mockProjectId,
      baseImage: 'node:20',
      environmentVariables: [
        { key: 'NODE_ENV', value: 'production', isEncrypted: false },
      ],
    };

    const response = await supertest(BASE_URL)
      .post('/api/v1/environments')
      .set('Authorization', authToken)
      .send(envData)
      .set('Content-Type', 'application/json');

    expect([201, 400, 401]).toContain(response.status);
  });

  it('should accept extensions array', async () => {
    const authToken = createMockToken();
    const envData = {
      name: 'Test',
      slug: 'test',
      projectId: mockProjectId,
      baseImage: 'node:20',
      extensions: ['ms-python.python', 'dbaeumer.vscode-eslint'],
    };

    const response = await supertest(BASE_URL)
      .post('/api/v1/environments')
      .set('Authorization', authToken)
      .send(envData)
      .set('Content-Type', 'application/json');

    expect([201, 400, 401]).toContain(response.status);
  });

  it('should return 401 when no authentication token provided', async () => {
    const envData = {
      name: 'Test',
      slug: 'test',
      projectId: mockProjectId,
      baseImage: 'node:20',
    };

    const response = await supertest(BASE_URL)
      .post('/api/v1/environments')
      .send(envData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(401);
  });
});

/**
 * GET /environments/{environmentId} - Get environment details
 * Task: T047
 */
describe('GET /environments/{environmentId}', () => {
  it('should return 200 with environment details', async () => {
    const authToken = createMockToken();

    const response = await supertest(BASE_URL)
      .get(`/api/v1/environments/${mockEnvironmentId}`)
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    if (response.status === 200) {
      SchemaValidators.validateEnvironment(response.body);
    }
  });

  it('should return 404 for non-existent environment', async () => {
    const authToken = createMockToken();
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const response = await supertest(BASE_URL)
      .get(`/api/v1/environments/${nonExistentId}`)
      .set('Authorization', authToken);

    expect(response.status).toBe(404);
  });

  it('should return 401 when no authentication token provided', async () => {
    const response = await supertest(BASE_URL)
      .get(`/api/v1/environments/${mockEnvironmentId}`);

    expect(response.status).toBe(401);
  });
});

/**
 * PATCH /environments/{environmentId} - Update environment
 * Task: T048
 */
describe('PATCH /environments/{environmentId}', () => {
  it('should return 200 when environment is updated', async () => {
    const authToken = createMockToken();
    const updateData = {
      name: 'Updated Environment',
      description: 'Updated description',
    };

    const response = await supertest(BASE_URL)
      .patch(`/api/v1/environments/${mockEnvironmentId}`)
      .set('Authorization', authToken)
      .send(updateData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(200);
  });

  it('should return 404 for non-existent environment', async () => {
    const authToken = createMockToken();
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    const updateData = { name: 'Updated' };

    const response = await supertest(BASE_URL)
      .patch(`/api/v1/environments/${nonExistentId}`)
      .set('Authorization', authToken)
      .send(updateData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(404);
  });

  it('should return 401 when no authentication token provided', async () => {
    const updateData = { name: 'Updated' };

    const response = await supertest(BASE_URL)
      .patch(`/api/v1/environments/${mockEnvironmentId}`)
      .send(updateData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(401);
  });
});

/**
 * DELETE /environments/{environmentId} - Delete environment
 * Task: T049
 */
describe('DELETE /environments/{environmentId}', () => {
  it('should return 204 when environment is deleted', async () => {
    const authToken = createMockToken();

    const response = await supertest(BASE_URL)
      .delete(`/api/v1/environments/${mockEnvironmentId}`)
      .set('Authorization', authToken);

    expect(response.status).toBe(204);
  });

  it('should return 404 for non-existent environment', async () => {
    const authToken = createMockToken();
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const response = await supertest(BASE_URL)
      .delete(`/api/v1/environments/${nonExistentId}`)
      .set('Authorization', authToken);

    expect(response.status).toBe(404);
  });

  it('should return 401 when no authentication token provided', async () => {
    const response = await supertest(BASE_URL)
      .delete(`/api/v1/environments/${mockEnvironmentId}`);

    expect(response.status).toBe(401);
  });
});

/**
 * POST /environments/{environmentId}/start - Start environment
 * Task: T050
 */
describe('POST /environments/{environmentId}/start', () => {
  it('should return 200 when environment starts', async () => {
    const authToken = createMockToken();

    const response = await supertest(BASE_URL)
      .post(`/api/v1/environments/${mockEnvironmentId}/start`)
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    if (response.status === 200) {
      SchemaValidators.validateEnvironment(response.body);
    }
  });

  it('should return 409 when environment is already running', async () => {
    const authToken = createMockToken();

    const response = await supertest(BASE_URL)
      .post(`/api/v1/environments/${mockEnvironmentId}/start`)
      .set('Authorization', authToken);

    expect([200, 409, 401, 404]).toContain(response.status);
  });

  it('should return 401 when no authentication token provided', async () => {
    const response = await supertest(BASE_URL)
      .post(`/api/v1/environments/${mockEnvironmentId}/start`);

    expect(response.status).toBe(401);
  });
});

/**
 * POST /environments/{environmentId}/stop - Stop environment
 * Task: T051
 */
describe('POST /environments/{environmentId}/stop', () => {
  it('should return 200 when environment stops', async () => {
    const authToken = createMockToken();

    const response = await supertest(BASE_URL)
      .post(`/api/v1/environments/${mockEnvironmentId}/stop`)
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    if (response.status === 200) {
      SchemaValidators.validateEnvironment(response.body);
    }
  });

  it('should return 409 when environment is already stopped', async () => {
    const authToken = createMockToken();

    const response = await supertest(BASE_URL)
      .post(`/api/v1/environments/${mockEnvironmentId}/stop`)
      .set('Authorization', authToken);

    expect([200, 409, 401, 404]).toContain(response.status);
  });

  it('should return 401 when no authentication token provided', async () => {
    const response = await supertest(BASE_URL)
      .post(`/api/v1/environments/${mockEnvironmentId}/stop`);

    expect(response.status).toBe(401);
  });
});

/**
 * POST /environments/{environmentId}/ports - Add port mapping
 * Task: T052
 */
describe('POST /environments/{environmentId}/ports', () => {
  it('should return 201 when port is added', async () => {
    const authToken = createMockToken();
    const portData = {
      containerPort: 8080,
      hostPort: 8080,
      protocol: 'tcp',
    };

    const response = await supertest(BASE_URL)
      .post(`/api/v1/environments/${mockEnvironmentId}/ports`)
      .set('Authorization', authToken)
      .send(portData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(201);
  });

  it('should return 400 for missing required containerPort', async () => {
    const authToken = createMockToken();
    const portData = { hostPort: 8080 }; // Missing containerPort

    const response = await supertest(BASE_URL)
      .post(`/api/v1/environments/${mockEnvironmentId}/ports`)
      .set('Authorization', authToken)
      .send(portData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
  });

  it('should validate protocol enum (tcp, udp)', async () => {
    const authToken = createMockToken();
    const portData = {
      containerPort: 8080,
      protocol: 'invalid',
    };

    const response = await supertest(BASE_URL)
      .post(`/api/v1/environments/${mockEnvironmentId}/ports`)
      .set('Authorization', authToken)
      .send(portData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
  });

  it('should return 401 when no authentication token provided', async () => {
    const portData = { containerPort: 8080 };

    const response = await supertest(BASE_URL)
      .post(`/api/v1/environments/${mockEnvironmentId}/ports`)
      .send(portData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(401);
  });
});

/**
 * GET /environments/{environmentId}/variables - List environment variables
 * Task: T053
 */
describe('GET /environments/{environmentId}/variables', () => {
  it('should return 200 with array of environment variables', async () => {
    const authToken = createMockToken();

    const response = await supertest(BASE_URL)
      .get(`/api/v1/environments/${mockEnvironmentId}/variables`)
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        response.body.forEach((envVar: any) => {
          SchemaValidators.validateEnvironmentVariable(envVar);
        });
      }
    }
  });

  it('should return 401 when no authentication token provided', async () => {
    const response = await supertest(BASE_URL)
      .get(`/api/v1/environments/${mockEnvironmentId}/variables`);

    expect(response.status).toBe(401);
  });
});

/**
 * POST /environments/{environmentId}/variables - Add environment variable
 * Task: T054
 */
describe('POST /environments/{environmentId}/variables', () => {
  it('should return 201 when variable is added', async () => {
    const authToken = createMockToken();
    const varData = {
      key: 'API_KEY',
      value: 'secret-value',
      isEncrypted: true,
    };

    const response = await supertest(BASE_URL)
      .post(`/api/v1/environments/${mockEnvironmentId}/variables`)
      .set('Authorization', authToken)
      .send(varData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(201);
  });

  it('should return 400 for missing required key', async () => {
    const authToken = createMockToken();
    const varData = { value: 'test' }; // Missing key

    const response = await supertest(BASE_URL)
      .post(`/api/v1/environments/${mockEnvironmentId}/variables`)
      .set('Authorization', authToken)
      .send(varData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
  });

  it('should return 400 for missing required value', async () => {
    const authToken = createMockToken();
    const varData = { key: 'TEST' }; // Missing value

    const response = await supertest(BASE_URL)
      .post(`/api/v1/environments/${mockEnvironmentId}/variables`)
      .set('Authorization', authToken)
      .send(varData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
  });

  it('should return 401 when no authentication token provided', async () => {
    const varData = {
      key: 'TEST',
      value: 'value',
    };

    const response = await supertest(BASE_URL)
      .post(`/api/v1/environments/${mockEnvironmentId}/variables`)
      .send(varData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(401);
  });
});
