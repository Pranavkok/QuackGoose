import { PrismaClient } from '@/app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Missing DIRECT_URL or DATABASE_URL');
  }

  const adapter = new PrismaPg({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
