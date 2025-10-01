/**
 * Contract Tests: Project Endpoints
 * Tests all project CRUD operations
 * Tasks: T040-T044
 */
import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { SchemaValidators, createMockToken } from '../helpers/test-utils';

const BASE_URL = 'http://localhost:3000';
const mockProjectId = '550e8400-e29b-41d4-a716-446655440000';
const mockTeamId = '650e8400-e29b-41d4-a716-446655440000';

/**
 * GET /projects - List projects
 * Task: T040
 */
describe('GET /projects', () => {
  it('should return 200 with array of projects when authenticated', async () => {
    const authToken = createMockToken();

    const response = await supertest(BASE_URL)
      .get('/api/v1/projects')
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);

    if (response.body.length > 0) {
      response.body.forEach((project: any) => {
        SchemaValidators.validateProject(project);
      });
    }
  });

  it('should filter by teamId query parameter', async () => {
    const authToken = createMockToken();

    const response = await supertest(BASE_URL)
      .get(`/api/v1/projects?teamId=${mockTeamId}`)
      .set('Authorization', authToken);

    expect([200, 401]).toContain(response.status);
  });

  it('should filter by archived query parameter', async () => {
    const authToken = createMockToken();

    const response = await supertest(BASE_URL)
      .get('/api/v1/projects?archived=true')
      .set('Authorization', authToken);

    expect([200, 401]).toContain(response.status);
  });

  it('should return 401 when no authentication token provided', async () => {
    const response = await supertest(BASE_URL)
      .get('/api/v1/projects');

    expect(response.status).toBe(401);
  });
});

/**
 * POST /projects - Create project
 * Task: T041
 */
describe('POST /projects', () => {
  it('should return 201 with created project', async () => {
    const authToken = createMockToken();
    const projectData = {
      name: 'Test Project',
      slug: 'test-project',
      description: 'A test project',
    };

    const response = await supertest(BASE_URL)
      .post('/api/v1/projects')
      .set('Authorization', authToken)
      .send(projectData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(201);
    if (response.status === 201) {
      SchemaValidators.validateProject(response.body);
    }
  });

  it('should return 400 for missing required name', async () => {
    const authToken = createMockToken();
    const projectData = { slug: 'test' };

    const response = await supertest(BASE_URL)
      .post('/api/v1/projects')
      .set('Authorization', authToken)
      .send(projectData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
  });

  it('should return 400 for missing required slug', async () => {
    const authToken = createMockToken();
    const projectData = { name: 'Test' };

    const response = await supertest(BASE_URL)
      .post('/api/v1/projects')
      .set('Authorization', authToken)
      .send(projectData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
  });

  it('should return 400 for invalid slug pattern', async () => {
    const authToken = createMockToken();
    const projectData = {
      name: 'Test',
      slug: 'Invalid_Slug!',
    };

    const response = await supertest(BASE_URL)
      .post('/api/v1/projects')
      .set('Authorization', authToken)
      .send(projectData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
  });

  it('should accept optional teamId for team-owned project', async () => {
    const authToken = createMockToken();
    const projectData = {
      name: 'Team Project',
      slug: 'team-project',
      teamId: mockTeamId,
    };

    const response = await supertest(BASE_URL)
      .post('/api/v1/projects')
      .set('Authorization', authToken)
      .send(projectData)
      .set('Content-Type', 'application/json');

    expect([201, 401, 404]).toContain(response.status);
  });

  it('should return 401 when no authentication token provided', async () => {
    const projectData = {
      name: 'Test',
      slug: 'test',
    };

    const response = await supertest(BASE_URL)
      .post('/api/v1/projects')
      .send(projectData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(401);
  });
});

/**
 * GET /projects/{projectId} - Get project details
 * Task: T042
 */
describe('GET /projects/{projectId}', () => {
  it('should return 200 with project details', async () => {
    const authToken = createMockToken();

    const response = await supertest(BASE_URL)
      .get(`/api/v1/projects/${mockProjectId}`)
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    if (response.status === 200) {
      SchemaValidators.validateProject(response.body);
    }
  });

  it('should return 404 for non-existent project', async () => {
    const authToken = createMockToken();
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const response = await supertest(BASE_URL)
      .get(`/api/v1/projects/${nonExistentId}`)
      .set('Authorization', authToken);

    expect(response.status).toBe(404);
  });

  it('should return 400 for invalid UUID format', async () => {
    const authToken = createMockToken();

    const response = await supertest(BASE_URL)
      .get('/api/v1/projects/invalid-id')
      .set('Authorization', authToken);

    expect(response.status).toBe(400);
  });

  it('should return 401 when no authentication token provided', async () => {
    const response = await supertest(BASE_URL)
      .get(`/api/v1/projects/${mockProjectId}`);

    expect(response.status).toBe(401);
  });
});

/**
 * PATCH /projects/{projectId} - Update project
 * Task: T043
 */
describe('PATCH /projects/{projectId}', () => {
  it('should return 200 when project is updated', async () => {
    const authToken = createMockToken();
    const updateData = {
      name: 'Updated Project Name',
      description: 'Updated description',
    };

    const response = await supertest(BASE_URL)
      .patch(`/api/v1/projects/${mockProjectId}`)
      .set('Authorization', authToken)
      .send(updateData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(200);
  });

  it('should accept isArchived field to archive project', async () => {
    const authToken = createMockToken();
    const updateData = { isArchived: true };

    const response = await supertest(BASE_URL)
      .patch(`/api/v1/projects/${mockProjectId}`)
      .set('Authorization', authToken)
      .send(updateData)
      .set('Content-Type', 'application/json');

    expect([200, 401, 404]).toContain(response.status);
  });

  it('should return 404 for non-existent project', async () => {
    const authToken = createMockToken();
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    const updateData = { name: 'Updated' };

    const response = await supertest(BASE_URL)
      .patch(`/api/v1/projects/${nonExistentId}`)
      .set('Authorization', authToken)
      .send(updateData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(404);
  });

  it('should return 401 when no authentication token provided', async () => {
    const updateData = { name: 'Updated' };

    const response = await supertest(BASE_URL)
      .patch(`/api/v1/projects/${mockProjectId}`)
      .send(updateData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(401);
  });
});

/**
 * DELETE /projects/{projectId} - Delete project
 * Task: T044
 */
describe('DELETE /projects/{projectId}', () => {
  it('should return 204 when project is deleted', async () => {
    const authToken = createMockToken();

    const response = await supertest(BASE_URL)
      .delete(`/api/v1/projects/${mockProjectId}`)
      .set('Authorization', authToken);

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});
  });

  it('should return 404 for non-existent project', async () => {
    const authToken = createMockToken();
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const response = await supertest(BASE_URL)
      .delete(`/api/v1/projects/${nonExistentId}`)
      .set('Authorization', authToken);

    expect(response.status).toBe(404);
  });

  it('should return 400 for invalid UUID format', async () => {
    const authToken = createMockToken();

    const response = await supertest(BASE_URL)
      .delete('/api/v1/projects/invalid-id')
      .set('Authorization', authToken);

    expect(response.status).toBe(400);
  });

  it('should return 401 when no authentication token provided', async () => {
    const response = await supertest(BASE_URL)
      .delete(`/api/v1/projects/${mockProjectId}`);

    expect(response.status).toBe(401);
  });
});
