import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import { User } from '../types/auth';

interface CreateUserOptions {
  email?: string;
  passwordHash?: string;
}

interface CreateApiKeyOptions {
  name?: string;
  scopes?: string[];
}

export async function createTestUser(prisma: PrismaClient, options: CreateUserOptions = {}): Promise<User> {
  const email = options.email || `test.${randomBytes(4).toString('hex')}@example.com`;
  
  return await prisma.user.create({
    data: {
      email,
      passwordHash: options.passwordHash,
    },
  });
}

export async function createTestApiKey(
  prisma: PrismaClient,
  userId: string,
  options: CreateApiKeyOptions = {}
) {
  const name = options.name || 'Test API Key';
  const scopes = options.scopes || ['*'];
  const key = randomBytes(32).toString('hex');

  return await prisma.apiKey.create({
    data: {
      name,
      key,
      scopes,
      userId,
    },
    include: {
      user: true,
    },
  });
}

export function generateAccessToken(app: FastifyInstance, user: User) {
  return app.jwt.sign({
    id: user.id,
    email: user.email,
  });
}

export function generateApiKeyHash(key: string): string {
  return key; // In tests, we don't hash the key for simplicity
}

export async function cleanupDatabase(prisma: PrismaClient) {
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`);

  if (tables.length > 0) {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ${tables.join(', ')} CASCADE;`
    );
  }
}

export async function setupTestDatabase(prisma: PrismaClient) {
  // Create Redis client for testing
  const redis = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  };

  // Clean up existing data
  await cleanupDatabase(prisma);

  return {
    redis,
    cleanup: async () => {
      await cleanupDatabase(prisma);
      await prisma.$disconnect();
    },
  };
}

export function createTestHeaders(token: string, type: 'jwt' | 'apiKey' = 'jwt') {
  if (type === 'jwt') {
    return {
      Authorization: `Bearer ${token}`,
    };
  }
  return {
    'X-API-Key': token,
  };
}

export async function waitForAsync(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}