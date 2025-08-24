import { PrismaClient } from '@prisma/client';

// Singleton Prisma client
let prisma: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    console.log('🔍 Creating new Prisma client with DATABASE_URL:', process.env.DATABASE_URL);
    prisma = new PrismaClient({
      log: ['warn', 'error'],
    });
  }
  return prisma;
}

export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}