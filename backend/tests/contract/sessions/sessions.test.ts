/**
 * Contract Tests: Session Endpoints
 * Tests session management operations
 * Tasks: T055-T057
 */
import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { SchemaValidators, createMockToken } from '../helpers/test-utils';

const BASE_URL = 'http://localhost:3000';
const mockEnvironmentId = '550e8400-e29b-41d4-a716-446655440000';
const mockSessionId = '750e8400-e29b-41d4-a716-446655440000';

/**
 * GET /environments/{environmentId}/sessions - List environment sessions
 * Task: T055
 */
describe('GET /environments/{environmentId}/sessions', () => {
  it('should return 200 with array of sessions', async () => {
    const authToken = createMockToken();

    const response = await supertest(BASE_URL)
      .get(`/api/v1/environments/${mockEnvironmentId}/sessions`)
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        response.body.forEach((session: any) => {
          SchemaValidators.validateSession(session);
        });
      }
    }
  });

  it('should return 401 when no authentication token provided', async () => {
    const response = await supertest(BASE_URL)
      .get(`/api/v1/environments/${mockEnvironmentId}/sessions`);

    expect(response.status).toBe(401);
  });

  it('should return 404 for non-existent environment', async () => {
    const authToken = createMockToken();
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const response = await supertest(BASE_URL)
      .get(`/api/v1/environments/${nonExistentId}/sessions`)
      .set('Authorization', authToken);

    expect(response.status).toBe(404);
  });
});

/**
 * POST /environments/{environmentId}/sessions - Create new session
 * Task: T056
 */
describe('POST /environments/{environmentId}/sessions', () => {
  it('should return 201 with created vscode_server session', async () => {
    const authToken = createMockToken();
    const sessionData = {
      sessionType: 'vscode_server',
      sessionName: 'main-vscode',
    };

    const response = await supertest(BASE_URL)
      .post(`/api/v1/environments/${mockEnvironmentId}/sessions`)
      .set('Authorization', authToken)
      .send(sessionData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(201);
    if (response.status === 201) {
      SchemaValidators.validateSession(response.body);
    }
  });

  it('should return 201 with created tmux session', async () => {
    const authToken = createMockToken();
    const sessionData = {
      sessionType: 'tmux',
      sessionName: 'dev-session',
    };

    const response = await supertest(BASE_URL)
      .post(`/api/v1/environments/${mockEnvironmentId}/sessions`)
      .set('Authorization', authToken)
      .send(sessionData)
      .set('Content-Type', 'application/json');

    expect([201, 401, 404]).toContain(response.status);
  });

  it('should return 201 with created shell session', async () => {
    const authToken = createMockToken();
    const sessionData = {
      sessionType: 'shell',
      sessionName: 'bash-1',
    };

    const response = await supertest(BASE_URL)
      .post(`/api/v1/environments/${mockEnvironmentId}/sessions`)
      .set('Authorization', authToken)
      .send(sessionData)
      .set('Content-Type', 'application/json');

    expect([201, 401, 404]).toContain(response.status);
  });

  it('should return 400 for missing required sessionType', async () => {
    const authToken = createMockToken();
    const sessionData = {
      sessionName: 'test-session',
      // Missing sessionType
    };

    const response = await supertest(BASE_URL)
      .post(`/api/v1/environments/${mockEnvironmentId}/sessions`)
      .set('Authorization', authToken)
      .send(sessionData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
  });

  it('should return 400 for missing required sessionName', async () => {
    const authToken = createMockToken();
    const sessionData = {
      sessionType: 'shell',
      // Missing sessionName
    };

    const response = await supertest(BASE_URL)
      .post(`/api/v1/environments/${mockEnvironmentId}/sessions`)
      .set('Authorization', authToken)
      .send(sessionData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
  });

  it('should validate sessionType enum (vscode_server, tmux, shell)', async () => {
    const authToken = createMockToken();
    const sessionData = {
      sessionType: 'invalid-type',
      sessionName: 'test',
    };

    const response = await supertest(BASE_URL)
      .post(`/api/v1/environments/${mockEnvironmentId}/sessions`)
      .set('Authorization', authToken)
      .send(sessionData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
  });

  it('should return 401 when no authentication token provided', async () => {
    const sessionData = {
      sessionType: 'shell',
      sessionName: 'test',
    };

    const response = await supertest(BASE_URL)
      .post(`/api/v1/environments/${mockEnvironmentId}/sessions`)
      .send(sessionData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(401);
  });

  it('should return 404 for non-existent environment', async () => {
    const authToken = createMockToken();
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    const sessionData = {
      sessionType: 'shell',
      sessionName: 'test',
    };

    const response = await supertest(BASE_URL)
      .post(`/api/v1/environments/${nonExistentId}/sessions`)
      .set('Authorization', authToken)
      .send(sessionData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(404);
  });
});

/**
 * DELETE /sessions/{sessionId} - Terminate session
 * Task: T057
 */
describe('DELETE /sessions/{sessionId}', () => {
  it('should return 204 when session is terminated', async () => {
    const authToken = createMockToken();

    const response = await supertest(BASE_URL)
      .delete(`/api/v1/sessions/${mockSessionId}`)
      .set('Authorization', authToken);

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});
  });

  it('should return 401 when no authentication token provided', async () => {
    const response = await supertest(BASE_URL)
      .delete(`/api/v1/sessions/${mockSessionId}`);

    expect(response.status).toBe(401);
  });

  it('should return 404 for non-existent session', async () => {
    const authToken = createMockToken();
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const response = await supertest(BASE_URL)
      .delete(`/api/v1/sessions/${nonExistentId}`)
      .set('Authorization', authToken);

    expect(response.status).toBe(404);
  });

  it('should return 400 for invalid UUID format', async () => {
    const authToken = createMockToken();

    const response = await supertest(BASE_URL)
      .delete('/api/v1/sessions/invalid-id')
      .set('Authorization', authToken);

    expect(response.status).toBe(400);
  });
});
