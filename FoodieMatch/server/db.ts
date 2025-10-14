import { PrismaClient } from '@prisma/client';

// Prisma Client is initialized only once per application lifecycle
export const prisma = new PrismaClient();
