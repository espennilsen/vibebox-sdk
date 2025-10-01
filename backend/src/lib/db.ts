/**
 * Database Client - Task T004
 * Prisma client singleton for database access with lazy initialization
 */
import { PrismaClient } from '@prisma/client';

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
let prismaInstance: PrismaClient | undefined;

/**
 * Get or create a PrismaClient instance
 *
 * This function lazily creates a PrismaClient on first call and reuses
 * the same instance on subsequent calls. After calling disconnectDb(),
 * this function will create a new instance on the next invocation.
 *
 * @returns {PrismaClient} Active PrismaClient instance
 *
 * @example
 * ```typescript
 * const client = getPrismaClient();
 * const users = await client.user.findMany();
 * ```
 */
export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return prismaInstance;
}

/**
 * Disconnect from database and reset the client instance
 *
 * Call this on application shutdown. After disconnection, the next call
 * to getPrismaClient() will create a fresh PrismaClient instance.
 *
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * await disconnectDb();
 * ```
 */
export async function disconnectDb(): Promise<void> {
  if (prismaInstance) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await prismaInstance.$disconnect();
    prismaInstance = undefined;
  }
}

// Default export for convenience
export default getPrismaClient;
