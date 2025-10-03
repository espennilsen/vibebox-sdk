/**
 * Database Client - Task T004
 * Prisma client singleton for database access with lazy initialization
 */
import { PrismaClient } from '@prisma/client';

let prismaInstance: PrismaClient | undefined;

/**
 * Get or create a PrismaClient instance with connection pooling
 *
 * This function lazily creates a PrismaClient on first call and reuses
 * the same instance on subsequent calls. After calling disconnectDb(),
 * this function will create a new instance on the next invocation.
 *
 * Connection pooling is configured via DATABASE_URL query parameters:
 * - connection_limit: Maximum number of connections in the pool (default: 10)
 * - pool_timeout: Time to wait for a connection from the pool (default: 10s)
 *
 * @returns {PrismaClient} Active PrismaClient instance
 *
 * @example
 * ```typescript
 * const client = getPrismaClient();
 * const users = await client.user.findMany();
 * ```
 *
 * @example Connection URL with pooling
 * ```
 * DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10"
 * ```
 */
export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    // Get connection pool configuration from environment
    const connectionLimit = parseInt(process.env.DB_POOL_SIZE || '10', 10);
    const poolTimeout = parseInt(process.env.DB_POOL_TIMEOUT || '10', 10);

    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      datasources: {
        db: {
          url: buildDatabaseUrl(process.env.DATABASE_URL!, {
            connectionLimit,
            poolTimeout,
          }),
        },
      },
    });
  }
  return prismaInstance;
}

/**
 * Build database URL with connection pooling parameters
 *
 * @param baseUrl - Base database URL
 * @param options - Pooling options
 * @returns Database URL with pooling parameters
 */
function buildDatabaseUrl(
  baseUrl: string,
  options: {
    connectionLimit?: number;
    poolTimeout?: number;
  }
): string {
  try {
    const url = new URL(baseUrl);

    // Add connection pooling parameters if not already present
    if (options.connectionLimit && !url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', options.connectionLimit.toString());
    }

    if (options.poolTimeout && !url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', options.poolTimeout.toString());
    }

    // Recommended settings for production
    if (process.env.NODE_ENV === 'production') {
      // Enable statement caching for better performance
      if (!url.searchParams.has('statement_cache_size')) {
        url.searchParams.set('statement_cache_size', '100');
      }

      // Set connection timeout
      if (!url.searchParams.has('connect_timeout')) {
        url.searchParams.set('connect_timeout', '10');
      }
    }

    return url.toString();
  } catch (error) {
    // If URL parsing fails, return the original URL
    console.error('Failed to parse DATABASE_URL for connection pooling:', error);
    return baseUrl;
  }
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
    await prismaInstance.$disconnect();
    prismaInstance = undefined;
  }
}

// Default export for convenience
export default getPrismaClient;
