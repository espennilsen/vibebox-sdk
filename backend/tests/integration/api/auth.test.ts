/**
 * Integration Tests: Authentication API Endpoints
 * Tests the full authentication flow including JWT token validation
 * Task: Comprehensive JWT Authentication Testing
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { createServer } from '@/server';
import { getPrismaClient } from '@/lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '@/lib/config';

describe('Authentication API Endpoints - Integration Tests', () => {
  let app: FastifyInstance;
  let prisma: ReturnType<typeof getPrismaClient>;
  let testUserId: string;
  let validAccessToken: string;
  let validRefreshToken: string;

  const testUser = {
    email: 'integration-test@example.com',
    password: 'TestPassword123!',
    displayName: 'Integration Test User',
  };

  beforeAll(async () => {
    // Initialize Fastify app
    app = await createServer();
    await app.ready();

    // Get Prisma client
    prisma = getPrismaClient();
  });

  afterAll(async () => {
    // Cleanup and close
    await app.close();
  });

  beforeEach(async () => {
    // Clean up any existing test user
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
  });

  afterEach(async () => {
    // Clean up test data after each test
    if (typeof testUserId === 'string' && testUserId.length > 0) {
      await prisma.user.deleteMany({
        where: { id: testUserId },
      });
    }
  });

  describe('POST /api/v1/auth/register', () => {
    /**
     * Test: Successful registration
     */
    it('should register new user with valid credentials', async () => {
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: testUser,
      });

      // Assert
      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      expect(body.user.email).toBe(testUser.email);
      expect(body.user.displayName).toBe(testUser.displayName);
      expect(body.user).not.toHaveProperty('passwordHash');

      // Verify token is valid
      const payload = jwt.decode(body.accessToken) as any;
      expect(payload.userId).toBeDefined();
      expect(payload.email).toBe(testUser.email);

      // Store for cleanup
      testUserId = body.user.id;
    });

    /**
     * Test: Duplicate email rejection
     */
    it('should reject registration with duplicate email', async () => {
      // Arrange - Create user first
      const firstResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: testUser,
      });
      const firstBody = JSON.parse(firstResponse.body);
      testUserId = firstBody.user.id;

      // Act - Try to register again with same email
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: testUser,
      });

      // Assert
      expect(response.statusCode).toBe(409); // Conflict
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
      expect(body.message).toContain('Email already exists');
    });

    /**
     * Test: Invalid email format
     */
    it('should reject invalid email format', async () => {
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'invalid-email',
          password: 'TestPassword123!',
          displayName: 'Test User',
        },
      });

      // Assert
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    /**
     * Test: Password too short
     */
    it('should reject password shorter than 8 characters', async () => {
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'short',
          displayName: 'Test User',
        },
      });

      // Assert
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    /**
     * Test: Missing required fields
     */
    it('should reject missing email', async () => {
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          password: 'TestPassword123!',
          displayName: 'Test User',
        },
      });

      // Assert
      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      const user = await prisma.user.create({
        data: {
          email: testUser.email,
          passwordHash: hashedPassword,
          displayName: testUser.displayName,
          timezone: 'UTC',
          locale: 'en-US',
          notificationSettings: {},
        },
      });
      testUserId = user.id;
    });

    /**
     * Test: Successful login
     */
    it('should login with valid credentials', async () => {
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      expect(body.user.email).toBe(testUser.email);

      // Verify tokens are valid
      const accessPayload = jwt.decode(body.accessToken) as any;
      expect(accessPayload.userId).toBe(testUserId);
      expect(accessPayload.email).toBe(testUser.email);

      const refreshPayload = jwt.decode(body.refreshToken) as any;
      expect(refreshPayload.userId).toBe(testUserId);

      // Store for later tests
      validAccessToken = body.accessToken;
      validRefreshToken = body.refreshToken;
    });

    /**
     * Test: Invalid credentials
     */
    it('should reject invalid password', async () => {
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: testUser.email,
          password: 'WrongPassword123!',
        },
      });

      // Assert
      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
      expect(body.message).toContain('Invalid credentials');
    });

    /**
     * Test: Non-existent user
     */
    it('should reject non-existent email', async () => {
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'TestPassword123!',
        },
      });

      // Assert
      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
      expect(body.message).toContain('Invalid credentials');
    });

    /**
     * Test: Missing credentials
     */
    it('should reject missing password', async () => {
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: testUser.email,
        },
      });

      // Assert
      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/auth/me - Protected Route', () => {
    beforeEach(async () => {
      // Create a test user and get valid token
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      const user = await prisma.user.create({
        data: {
          email: testUser.email,
          passwordHash: hashedPassword,
          displayName: testUser.displayName,
          timezone: 'UTC',
          locale: 'en-US',
          notificationSettings: {},
        },
      });
      testUserId = user.id;

      // Login to get valid token
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: testUser.email,
          password: testUser.password,
        },
      });
      const loginBody = JSON.parse(loginResponse.body);
      validAccessToken = loginBody.accessToken;
    });

    /**
     * Test: Access with valid token
     */
    it('should return user data with valid access token', async () => {
      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          Authorization: `Bearer ${validAccessToken}`,
        },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(testUserId);
      expect(body.email).toBe(testUser.email);
      expect(body.displayName).toBe(testUser.displayName);
      expect(body).not.toHaveProperty('passwordHash');
    });

    /**
     * Test: Access without token
     */
    it('should reject request without authentication token', async () => {
      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
      });

      // Assert
      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    /**
     * Test: Access with invalid token
     */
    it('should reject request with invalid token', async () => {
      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          Authorization: 'Bearer invalid-token-here',
        },
      });

      // Assert
      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    /**
     * Test: Access with expired token
     */
    it('should reject request with expired token', async () => {
      // Arrange - Create an expired token
      const expiredToken = jwt.sign(
        { userId: testUserId, email: testUser.email },
        config.jwt.secret,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          Authorization: `Bearer ${expiredToken}`,
        },
      });

      // Assert
      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    /**
     * Test: Access with malformed token
     */
    it('should reject request with malformed Authorization header', async () => {
      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          Authorization: 'InvalidFormat',
        },
      });

      // Assert
      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/v1/auth/refresh - Token Refresh', () => {
    beforeEach(async () => {
      // Create a test user and get valid tokens
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      const user = await prisma.user.create({
        data: {
          email: testUser.email,
          passwordHash: hashedPassword,
          displayName: testUser.displayName,
          timezone: 'UTC',
          locale: 'en-US',
          notificationSettings: {},
        },
      });
      testUserId = user.id;

      // Login to get valid tokens
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: testUser.email,
          password: testUser.password,
        },
      });
      const loginBody = JSON.parse(loginResponse.body);
      validAccessToken = loginBody.accessToken;
      validRefreshToken = loginBody.refreshToken;
    });

    /**
     * Test: Successful token refresh
     */
    it('should refresh access token with valid refresh token', async () => {
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {
          refreshToken: validRefreshToken,
        },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(typeof body).toBe('string'); // New access token
      expect(body.split('.')).toHaveLength(3); // Valid JWT format

      // Verify new token is valid
      const payload = jwt.decode(body) as any;
      expect(payload.userId).toBe(testUserId);
      expect(payload.email).toBe(testUser.email);

      // Verify new token can be used to access protected routes
      const meResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          Authorization: `Bearer ${body}`,
        },
      });
      expect(meResponse.statusCode).toBe(200);
    });

    /**
     * Test: Invalid refresh token
     */
    it('should reject invalid refresh token', async () => {
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {
          refreshToken: 'invalid-refresh-token',
        },
      });

      // Assert
      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    /**
     * Test: Expired refresh token
     */
    it('should reject expired refresh token', async () => {
      // Arrange - Create an expired refresh token
      const expiredRefreshToken = jwt.sign(
        { userId: testUserId, email: testUser.email },
        config.jwt.refreshSecret,
        { expiresIn: '-1d' } // Expired 1 day ago
      );

      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {
          refreshToken: expiredRefreshToken,
        },
      });

      // Assert
      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    /**
     * Test: Using access token as refresh token
     */
    it('should reject access token used as refresh token', async () => {
      // Act - Try to use access token instead of refresh token
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {
          refreshToken: validAccessToken,
        },
      });

      // Assert
      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    /**
     * Test: Missing refresh token
     */
    it('should reject request without refresh token', async () => {
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {},
      });

      // Assert
      expect(response.statusCode).toBe(400);
    });
  });

  describe('Token Expiration Behavior', () => {
    /**
     * Test: Access token expires after 15 minutes
     */
    it('should generate access token with 15-minute expiration', async () => {
      // Arrange - Register a new user
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'expiry-test@example.com',
          password: 'TestPassword123!',
          displayName: 'Expiry Test',
        },
      });
      const body = JSON.parse(response.body);
      testUserId = body.user.id;

      // Assert - Check token expiration
      const payload = jwt.decode(body.accessToken) as any;
      const expiresIn = payload.exp - payload.iat;
      expect(expiresIn).toBe(15 * 60); // 15 minutes in seconds
    });

    /**
     * Test: Refresh token expires after 7 days
     */
    it('should generate refresh token with 7-day expiration', async () => {
      // Arrange - Register a new user
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'refresh-expiry-test@example.com',
          password: 'TestPassword123!',
          displayName: 'Refresh Expiry Test',
        },
      });
      const body = JSON.parse(response.body);
      testUserId = body.user.id;

      // Assert - Check token expiration
      const payload = jwt.decode(body.refreshToken) as any;
      const expiresIn = payload.exp - payload.iat;
      expect(expiresIn).toBe(7 * 24 * 60 * 60); // 7 days in seconds
    });
  });
});
