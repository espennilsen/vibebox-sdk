/**
 * Contract Test Utilities
 * Common helpers for contract testing
 */
import { FastifyInstance } from 'fastify';
import supertest from 'supertest';

/**
 * Validates that a response matches the expected status code
 *
 * Throws a descriptive error if the status code doesn't match, including
 * the actual status and response body for debugging.
 *
 * @param response - Supertest response object
 * @param expectedStatus - Expected HTTP status code
 * @throws {Error} If status code doesn't match expected value
 * @public
 *
 * @example
 * ```typescript
 * const response = await request(app).get('/api/users');
 * expectStatus(response, 200);
 * ```
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
 *
 * Checks that all required fields are present in the object.
 * Throws a descriptive error listing missing fields.
 *
 * @param obj - Object to validate (typically response body)
 * @param requiredFields - Array of field names that must be present
 * @throws {Error} If any required fields are missing
 * @public
 *
 * @example
 * ```typescript
 * expectFields(response.body, ['id', 'email', 'createdAt']);
 * ```
 */
export function expectFields(obj: any, requiredFields: string[]): void {
  const missing = requiredFields.filter(field => !(field in obj));
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
}

/**
 * Validates UUID format (version 4)
 *
 * Checks if a string matches the UUID v4 format:
 * xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 *
 * @param uuid - String to validate
 * @returns True if valid UUID format, false otherwise
 * @public
 *
 * @example
 * ```typescript
 * expect(isValidUUID(user.id)).toBe(true);
 * ```
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validates ISO 8601 date format
 *
 * Checks if a string matches ISO 8601 format:
 * YYYY-MM-DDTHH:mm:ss.sssZ or YYYY-MM-DDTHH:mm:ss
 *
 * @param date - String to validate
 * @returns True if valid ISO 8601 format, false otherwise
 * @public
 *
 * @example
 * ```typescript
 * expect(isValidISODate(user.createdAt)).toBe(true);
 * ```
 */
export function isValidISODate(date: string): boolean {
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  return isoRegex.test(date);
}

/**
 * Validates email format
 *
 * Checks if a string matches basic email format:
 * localpart@domain.tld
 *
 * @param email - String to validate
 * @returns True if valid email format, false otherwise
 * @public
 *
 * @example
 * ```typescript
 * expect(isValidEmail(user.email)).toBe(true);
 * ```
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates slug format
 *
 * Checks if a string is a valid URL slug:
 * - Lowercase letters (a-z)
 * - Numbers (0-9)
 * - Hyphens (-)
 * - Length: 3-50 characters
 *
 * @param slug - String to validate
 * @returns True if valid slug format, false otherwise
 * @public
 *
 * @example
 * ```typescript
 * expect(isValidSlug(team.slug)).toBe(true);
 * // Valid: 'my-team-name', 'project-123'
 * // Invalid: 'My Team', 'ab', 'with_underscores'
 * ```
 */
export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9-]{3,50}$/;
  return slugRegex.test(slug);
}

/**
 * Creates a mock JWT token for testing
 *
 * Returns a static JWT token that will fail authentication.
 * Use this to test endpoints that require authentication but should reject invalid tokens.
 *
 * @returns Mock JWT token string with 'Bearer ' prefix
 * @public
 *
 * @example
 * ```typescript
 * const response = await request(app)
 *   .get('/api/users')
 *   .set('Authorization', createMockToken());
 * expectStatus(response, 401);
 * ```
 */
export function createMockToken(): string {
  return 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
}

/**
 * Schema validators for OpenAPI contract testing
 *
 * Collection of validator functions that check response bodies against
 * expected schemas defined in the OpenAPI specification.
 * Each validator checks field presence, types, and format constraints.
 *
 * @public
 *
 * @example
 * ```typescript
 * const response = await request(app).post('/api/auth/register').send(userData);
 * SchemaValidators.validateAuthResponse(response.body);
 * ```
 */
export namespace SchemaValidators {
  /**
   * Validates AuthResponse schema
   *
   * Checks that the authentication response contains:
   * - accessToken (string)
   * - refreshToken (string)
   * - user (valid User object)
   *
   * @param body - Response body to validate
   * @throws {Error} If schema validation fails
   * @public
   */
  export function validateAuthResponse(body: any): void {
    expectFields(body, ['accessToken', 'refreshToken', 'user']);
    expect(typeof body.accessToken).toBe('string');
    expect(typeof body.refreshToken).toBe('string');
    validateUser(body.user);
  }

  /**
   * Validates User schema
   *
   * Checks required fields: id (UUID), email, displayName, createdAt (ISO date)
   *
   * @param user - User object to validate
   * @throws {Error} If schema validation fails
   * @public
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
   *
   * Checks required fields: id (UUID), name, slug, createdAt (ISO date)
   *
   * @param team - Team object to validate
   * @throws {Error} If schema validation fails
   * @public
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
   *
   * Checks required fields: user (User object), role (admin/developer/viewer), joinedAt (ISO date)
   *
   * @param member - TeamMember object to validate
   * @throws {Error} If schema validation fails
   * @public
   */
  export function validateTeamMember(member: any): void {
    expectFields(member, ['user', 'role', 'joinedAt']);
    validateUser(member.user);
    expect(['admin', 'developer', 'viewer']).toContain(member.role);
    expect(isValidISODate(member.joinedAt)).toBe(true);
  }

  /**
   * Validates Project schema
   *
   * Checks required fields: id (UUID), name, slug, createdAt (ISO date)
   *
   * @param project - Project object to validate
   * @throws {Error} If schema validation fails
   * @public
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
   *
   * Checks required fields: id (UUID), name, slug, projectId (UUID), baseImage, status, createdAt (ISO date)
   *
   * @param env - Environment object to validate
   * @throws {Error} If schema validation fails
   * @public
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
   *
   * Checks required fields: id (UUID), environmentId (UUID), sessionType, sessionName, status, createdAt (ISO date)
   *
   * @param session - Session object to validate
   * @throws {Error} If schema validation fails
   * @public
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
   *
   * Checks required fields: id (UUID), extensionId, name, version, publisher
   *
   * @param ext - Extension object to validate
   * @throws {Error} If schema validation fails
   * @public
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
   *
   * Checks required fields: id (UUID), environmentId (UUID), extension (Extension object), status, createdAt (ISO date)
   *
   * @param envExt - EnvironmentExtension object to validate
   * @throws {Error} If schema validation fails
   * @public
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
   *
   * Checks required fields: id (UUID), key, value, isEncrypted (boolean)
   *
   * @param envVar - EnvironmentVariable object to validate
   * @throws {Error} If schema validation fails
   * @public
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
   *
   * Checks required fields: id (UUID), timestamp (ISO date), stream (stdout/stderr), message
   *
   * @param log - LogEntry object to validate
   * @throws {Error} If schema validation fails
   * @public
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
   *
   * Checks required fields: page, limit, total, totalPages (all numbers)
   *
   * @param pagination - Pagination object to validate
   * @throws {Error} If schema validation fails
   * @public
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
   *
   * Checks required fields: error, message (both strings)
   *
   * @param body - Error response body to validate
   * @throws {Error} If schema validation fails
   * @public
   */
  export function validateError(body: any): void {
    expectFields(body, ['error', 'message']);
    expect(typeof body.error).toBe('string');
    expect(typeof body.message).toBe('string');
  }
}
