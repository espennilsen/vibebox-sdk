/**
 * Database Client - Task T004
 * Prisma client singleton for database access
 */
import { PrismaClient } from '@prisma/client';

let prismaInstance: PrismaClient | undefined;

function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return prismaInstance;
}

export const prisma = getPrismaClient();

/**
 * Disconnect from database
 * Call this on application shutdown
 */
export async function disconnectDb(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = undefined;
  }
}

export default prisma;
