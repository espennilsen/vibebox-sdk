/**
 * Test Setup - Task T006
 * Global test setup for Vitest
 */
import { beforeAll, afterAll, afterEach } from 'vitest';
import { getPrismaClient, disconnectDb } from '../src/lib/db';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env files
// Try backend/.env first, then fall back to root .env
config({ path: resolve(__dirname, '../.env') });
config({ path: resolve(__dirname, '../../.env') });

// Set test environment
process.env.NODE_ENV = 'test';

// Set test JWT secrets if not already set (minimum 32 characters required)
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-key-with-minimum-32-characters-required';
}
if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-minimum-32-chars-required';
}

// Replace 'postgres' hostname with 'localhost' for tests running outside Docker
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/@postgres:/g, '@localhost:');
}
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL_TEST = process.env.DATABASE_URL_TEST.replace(/@postgres:/g, '@localhost:');
}

// Ensure DATABASE_URL_TEST is set
if (!process.env.DATABASE_URL_TEST) {
  throw new Error('DATABASE_URL_TEST environment variable is required for testing');
}

beforeAll(async () => {
  // Skip database connection for pure unit tests (no database interaction)
  // Integration tests will handle their own database setup
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
