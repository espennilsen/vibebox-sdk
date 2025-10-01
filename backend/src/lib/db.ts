/**
 * Database Client - Task T004
 * Prisma client singleton for database access
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Disconnect from database
 * Call this on application shutdown
 */
export async function disconnectDb() {
  await prisma.$disconnect();
}

export default prisma;
