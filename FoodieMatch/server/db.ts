import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma Client to prevent multiple instances in development
// This is especially important for hot module replacement (HMR) in development

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Initialize Prisma Client with singleton pattern
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

// In production, always create a new instance
// In development, reuse the global instance to prevent connection pool exhaustion
export const prisma = globalThis.__prisma ?? prismaClientSingleton();

// Store the instance globally in development to survive hot reloads
if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

// Gracefully shutdown Prisma Client on application termination
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
