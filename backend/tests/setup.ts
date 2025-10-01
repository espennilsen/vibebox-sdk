/**
 * Test Setup - Task T006
 * Global test setup for Vitest
 */
import { beforeAll, afterAll, afterEach } from 'vitest';
import { getPrismaClient, disconnectDb } from '../src/lib/db';

// Set test environment
process.env.NODE_ENV = 'test';

// Ensure DATABASE_URL_TEST is set
if (!process.env.DATABASE_URL_TEST) {
  throw new Error('DATABASE_URL_TEST environment variable is required for testing');
}

beforeAll(async () => {
  // Connect to test database
  const prisma = getPrismaClient();
  await prisma.$connect();
});

afterEach(async () => {
  // Clean up database after each test
  // Uncomment the following lines when models are created
  // const prisma = getPrismaClient();
  // const deleteUsers = prisma.user.deleteMany();
  // const deleteTeams = prisma.team.deleteMany();
  // await prisma.$transaction([deleteUsers, deleteTeams]);
});

afterAll(async () => {
  // Disconnect from database using the disconnectDb helper
  await disconnectDb();
});
