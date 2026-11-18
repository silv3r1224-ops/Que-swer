import { PrismaClient } from '@prisma/client';

// Shared Prisma client; in tests a separate client is created per test file.
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
