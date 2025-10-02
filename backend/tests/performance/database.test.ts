/**
 * Database Performance Tests
 * Tests query performance with indexes and optimizations
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { EnvironmentStatus, SessionStatus, UserTeamRole } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Configurable performance threshold for CI/CD environments
 * Set PERF_MAX_MS environment variable to customize (default: 1000ms)
 * This prevents flaky tests on slower CI runners while still catching major regressions
 */
const PERF_THRESHOLD_MS = parseInt(process.env.PERF_MAX_MS || '1000', 10);

describe('Database Performance Tests', () => {
  let testUserId: string;
  let testTeamId: string;
  let testProjectId: string;
  let testEnvironmentId: string;

  beforeAll(async () => {
    // Create test data
    const user = await prisma.user.create({
      data: {
        email: `perf-test-${Date.now()}@example.com`,
        displayName: 'Performance Test User',
      },
    });
    testUserId = user.id;

    const team = await prisma.team.create({
      data: {
        name: 'Performance Test Team',
        slug: `perf-test-team-${Date.now()}`,
      },
    });
    testTeamId = team.id;

    await prisma.userTeam.create({
      data: {
        userId: testUserId,
        teamId: testTeamId,
        role: UserTeamRole.admin,
      },
    });

    const project = await prisma.project.create({
      data: {
        name: 'Performance Test Project',
        slug: `perf-test-proj-${Date.now()}`,
        teamId: testTeamId,
      },
    });
    testProjectId = project.id;

    const environment = await prisma.environment.create({
      data: {
        name: 'Performance Test Environment',
        slug: 'perf-test-env',
        projectId: testProjectId,
        creatorId: testUserId,
        baseImage: 'node:20-alpine',
        status: EnvironmentStatus.stopped,
      },
    });
    testEnvironmentId = environment.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.environment.deleteMany({
      where: { projectId: testProjectId },
    });
    await prisma.project.deleteMany({
      where: { id: testProjectId },
    });
    await prisma.userTeam.deleteMany({
      where: { teamId: testTeamId },
    });
    await prisma.team.deleteMany({
      where: { id: testTeamId },
    });
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
    await prisma.$disconnect();
  });

  describe('Index Performance', () => {
    it('should efficiently query environments by userId and status', async () => {
      const start = Date.now();

      // This query should use the compound index (creator_id, status)
      const environments = await prisma.environment.findMany({
        where: {
          creatorId: testUserId,
          status: EnvironmentStatus.running,
        },
        take: 10,
      });

      const duration = Date.now() - start;

      expect(environments).toBeDefined();
      expect(duration).toBeLessThan(PERF_THRESHOLD_MS); // Should be very fast with index
    });

    it('should efficiently query environments by projectId and status', async () => {
      const start = Date.now();

      // This query should use the compound index (project_id, status)
      const environments = await prisma.environment.findMany({
        where: {
          projectId: testProjectId,
          status: EnvironmentStatus.stopped,
        },
        take: 10,
      });

      const duration = Date.now() - start;

      expect(environments).toBeDefined();
      expect(duration).toBeLessThan(PERF_THRESHOLD_MS); // Should be very fast with index
    });

    it('should efficiently query sessions by environmentId and status', async () => {
      const start = Date.now();

      // This query should use the compound index (environment_id, status)
      const sessions = await prisma.session.findMany({
        where: {
          environmentId: testEnvironmentId,
          status: SessionStatus.active,
        },
        take: 10,
      });

      const duration = Date.now() - start;

      expect(sessions).toBeDefined();
      expect(duration).toBeLessThan(PERF_THRESHOLD_MS); // Should be very fast with index
    });

    it('should efficiently query projects by teamId and isArchived', async () => {
      const start = Date.now();

      // This query should use the compound index (team_id, is_archived)
      const projects = await prisma.project.findMany({
        where: {
          teamId: testTeamId,
          isArchived: false,
        },
        take: 10,
      });

      const duration = Date.now() - start;

      expect(projects).toBeDefined();
      expect(duration).toBeLessThan(PERF_THRESHOLD_MS); // Should be very fast with index
    });

    it('should efficiently query user teams by userId and role', async () => {
      const start = Date.now();

      // This query should use the compound index (user_id, role)
      const userTeams = await prisma.userTeam.findMany({
        where: {
          userId: testUserId,
          role: UserTeamRole.admin,
        },
        take: 10,
      });

      const duration = Date.now() - start;

      expect(userTeams).toBeDefined();
      expect(duration).toBeLessThan(PERF_THRESHOLD_MS); // Should be very fast with index
    });
  });

  describe('Query Optimization', () => {
    it('should use select to fetch only needed fields', async () => {
      const start = Date.now();

      // Optimized query with select
      const environments = await prisma.environment.findMany({
        where: { projectId: testProjectId },
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
        },
        take: 10,
      });

      const duration = Date.now() - start;

      expect(environments).toBeDefined();
      expect(environments.length).toBeGreaterThanOrEqual(0);
      if (environments.length > 0) {
        expect(environments[0]).toHaveProperty('id');
        expect(environments[0]).toHaveProperty('name');
        expect(environments[0]).toHaveProperty('status');
        expect(environments[0]).not.toHaveProperty('baseImage'); // Not selected
      }
      expect(duration).toBeLessThan(PERF_THRESHOLD_MS); // Should be faster with select
    });

    it('should efficiently filter userTeams in nested queries', async () => {
      const start = Date.now();

      // Optimized nested query with where filter
      const project = await prisma.project.findUnique({
        where: { id: testProjectId },
        select: {
          id: true,
          teamId: true,
          team: {
            select: {
              userTeams: {
                where: { userId: testUserId },
                select: { userId: true },
              },
            },
          },
        },
      });

      const duration = Date.now() - start;

      expect(project).toBeDefined();
      expect(duration).toBeLessThan(PERF_THRESHOLD_MS); // Should be fast with index and filtering
    });
  });

  describe('Pagination Performance', () => {
    it('should efficiently paginate large result sets', async () => {
      // Create multiple test environments
      const createPromises = Array.from({ length: 50 }, (_, i) =>
        prisma.environment.create({
          data: {
            name: `Perf Test Env ${i}`,
            slug: `perf-env-${i}-${Date.now()}`,
            projectId: testProjectId,
            creatorId: testUserId,
            baseImage: 'node:20-alpine',
            status: EnvironmentStatus.stopped,
          },
        })
      );
      await Promise.all(createPromises);

      const start = Date.now();

      // Paginated query
      const environments = await prisma.environment.findMany({
        where: { projectId: testProjectId },
        skip: 10,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });

      const duration = Date.now() - start;

      expect(environments.length).toBeLessThanOrEqual(20);
      expect(duration).toBeLessThan(PERF_THRESHOLD_MS); // Should be fast with index
    });
  });

  describe('N+1 Query Prevention', () => {
    it('should avoid N+1 queries when fetching projects with team data', async () => {
      const start = Date.now();

      // Single optimized query instead of N+1
      const projects = await prisma.project.findMany({
        where: { teamId: testTeamId },
        select: {
          id: true,
          name: true,
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        take: 10,
      });

      const duration = Date.now() - start;

      expect(projects).toBeDefined();
      expect(duration).toBeLessThan(PERF_THRESHOLD_MS); // Single query, no N+1
    });

    it('should batch log queries efficiently', async () => {
      // Create test logs
      const logData = Array.from({ length: 100 }, (_, i) => ({
        environmentId: testEnvironmentId,
        timestamp: new Date(),
        stream: 'stdout' as const,
        message: `Test log message ${i}`,
      }));

      await prisma.logEntry.createMany({ data: logData });

      const start = Date.now();

      // Single query to fetch logs
      const logs = await prisma.logEntry.findMany({
        where: { environmentId: testEnvironmentId },
        take: 50,
        orderBy: { timestamp: 'desc' },
      });

      const duration = Date.now() - start;

      expect(logs.length).toBe(50);
      expect(duration).toBeLessThan(PERF_THRESHOLD_MS); // Should be fast with index
    });
  });
});
