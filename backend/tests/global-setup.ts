/**
 * Global Test Setup - Runs once before all tests
 * Starts the test server and connects to database
 */
import { createServer } from '../src/server';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
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

// Ensure DATABASE_URL_TEST is set
if (!process.env.DATABASE_URL_TEST) {
  throw new Error('DATABASE_URL_TEST environment variable is required for testing');
}

export async function setup() {
  console.log('Starting test server...');
  
  // Create and start the test server
  const testServer = await createServer();
  await testServer.listen({ port: 3000, host: '0.0.0.0' });
  
  console.log('Test server started on port 3000');
  
  // Store server instance globally for cleanup
  (global as any).__TEST_SERVER__ = testServer;
  
  return async () => {
    console.log('Stopping test server...');
    await testServer.close();
    console.log('Test server stopped');
  };
}

export default setup;
