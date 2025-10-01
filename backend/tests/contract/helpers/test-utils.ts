/**
 * Contract Test Utilities
 * Common helpers for contract testing
 */
import { FastifyInstance } from 'fastify';
import supertest from 'supertest';

/**
 * Validates that a response matches the expected status code
 */
export function expectStatus(response: supertest.Response, expectedStatus: number): void {
  if (response.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus} but got ${response.status}. Body: ${JSON.stringify(response.body)}`
    );
  }
}

/**
 * Validates that response body contains required fields
 */
export function expectFields(obj: any, requiredFields: string[]): void {
  const missing = requiredFields.filter(field => !(field in obj));
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
}

/**
 * Validates UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validates ISO 8601 date format
 */
export function isValidISODate(date: string): boolean {
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  return isoRegex.test(date);
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates slug format (lowercase alphanumeric with hyphens, 3-50 chars)
 */
export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9-]{3,50}$/;
  return slugRegex.test(slug);
}

/**
 * Creates a mock JWT token for testing (will fail authentication)
 */
export function createMockToken(): string {
  return 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
}

/**
 * Validates OpenAPI schema compliance for common response structures
 */
export namespace SchemaValidators {
  /**
   * Validates AuthResponse schema
   */
  export function validateAuthResponse(body: any): void {
    expectFields(body, ['accessToken', 'refreshToken', 'user']);
    expect(typeof body.accessToken).toBe('string');
    expect(typeof body.refreshToken).toBe('string');
    validateUser(body.user);
  }

  /**
   * Validates User schema
   */
  export function validateUser(user: any): void {
    expectFields(user, ['id', 'email', 'displayName', 'createdAt']);
    expect(isValidUUID(user.id)).toBe(true);
    expect(isValidEmail(user.email)).toBe(true);
    expect(typeof user.displayName).toBe('string');
    expect(isValidISODate(user.createdAt)).toBe(true);
  }

  /**
   * Validates Team schema
   */
  export function validateTeam(team: any): void {
    expectFields(team, ['id', 'name', 'slug', 'createdAt']);
    expect(isValidUUID(team.id)).toBe(true);
    expect(typeof team.name).toBe('string');
    expect(isValidSlug(team.slug)).toBe(true);
    expect(isValidISODate(team.createdAt)).toBe(true);
  }

  /**
   * Validates TeamMember schema
   */
  export function validateTeamMember(member: any): void {
    expectFields(member, ['user', 'role', 'joinedAt']);
    validateUser(member.user);
    expect(['admin', 'developer', 'viewer']).toContain(member.role);
    expect(isValidISODate(member.joinedAt)).toBe(true);
  }

  /**
   * Validates Project schema
   */
  export function validateProject(project: any): void {
    expectFields(project, ['id', 'name', 'slug', 'createdAt']);
    expect(isValidUUID(project.id)).toBe(true);
    expect(typeof project.name).toBe('string');
    expect(isValidSlug(project.slug)).toBe(true);
    expect(isValidISODate(project.createdAt)).toBe(true);
  }

  /**
   * Validates Environment schema
   */
  export function validateEnvironment(env: any): void {
    expectFields(env, ['id', 'name', 'slug', 'projectId', 'baseImage', 'status', 'createdAt']);
    expect(isValidUUID(env.id)).toBe(true);
    expect(typeof env.name).toBe('string');
    expect(isValidSlug(env.slug)).toBe(true);
    expect(isValidUUID(env.projectId)).toBe(true);
    expect(typeof env.baseImage).toBe('string');
    expect(['stopped', 'starting', 'running', 'stopping', 'error']).toContain(env.status);
    expect(isValidISODate(env.createdAt)).toBe(true);
  }

  /**
   * Validates Session schema
   */
  export function validateSession(session: any): void {
    expectFields(session, ['id', 'environmentId', 'sessionType', 'sessionName', 'status', 'createdAt']);
    expect(isValidUUID(session.id)).toBe(true);
    expect(isValidUUID(session.environmentId)).toBe(true);
    expect(['vscode_server', 'tmux', 'shell']).toContain(session.sessionType);
    expect(typeof session.sessionName).toBe('string');
    expect(['starting', 'active', 'idle', 'terminated']).toContain(session.status);
    expect(isValidISODate(session.createdAt)).toBe(true);
  }

  /**
   * Validates Extension schema
   */
  export function validateExtension(ext: any): void {
    expectFields(ext, ['id', 'extensionId', 'name', 'version', 'publisher']);
    expect(isValidUUID(ext.id)).toBe(true);
    expect(typeof ext.extensionId).toBe('string');
    expect(typeof ext.name).toBe('string');
    expect(typeof ext.version).toBe('string');
    expect(typeof ext.publisher).toBe('string');
  }

  /**
   * Validates EnvironmentExtension schema
   */
  export function validateEnvironmentExtension(envExt: any): void {
    expectFields(envExt, ['id', 'environmentId', 'extension', 'status', 'createdAt']);
    expect(isValidUUID(envExt.id)).toBe(true);
    expect(isValidUUID(envExt.environmentId)).toBe(true);
    validateExtension(envExt.extension);
    expect(['pending', 'installing', 'installed', 'failed', 'uninstalling']).toContain(envExt.status);
    expect(isValidISODate(envExt.createdAt)).toBe(true);
  }

  /**
   * Validates EnvironmentVariable schema
   */
  export function validateEnvironmentVariable(envVar: any): void {
    expectFields(envVar, ['id', 'key', 'value', 'isEncrypted']);
    expect(isValidUUID(envVar.id)).toBe(true);
    expect(typeof envVar.key).toBe('string');
    expect(typeof envVar.value).toBe('string');
    expect(typeof envVar.isEncrypted).toBe('boolean');
  }

  /**
   * Validates LogEntry schema
   */
  export function validateLogEntry(log: any): void {
    expectFields(log, ['id', 'timestamp', 'stream', 'message']);
    expect(isValidUUID(log.id)).toBe(true);
    expect(isValidISODate(log.timestamp)).toBe(true);
    expect(['stdout', 'stderr']).toContain(log.stream);
    expect(typeof log.message).toBe('string');
  }

  /**
   * Validates Pagination schema
   */
  export function validatePagination(pagination: any): void {
    expectFields(pagination, ['page', 'limit', 'total', 'totalPages']);
    expect(typeof pagination.page).toBe('number');
    expect(typeof pagination.limit).toBe('number');
    expect(typeof pagination.total).toBe('number');
    expect(typeof pagination.totalPages).toBe('number');
  }

  /**
   * Validates Error response schema
   */
  export function validateError(body: any): void {
    expectFields(body, ['error', 'message']);
    expect(typeof body.error).toBe('string');
    expect(typeof body.message).toBe('string');
  }
}
