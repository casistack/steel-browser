import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { build } from '../../../app';
import {
  createTestUser,
  createTestApiKey,
  generateAccessToken,
  createTestHeaders,
  setupTestDatabase,
} from '../../../test/helpers';
import { User } from '../../../types/auth';

describe('API Key Management', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let user: User;
  let accessToken: string;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    app = await build();
    prisma = app.db;
    const setup = await setupTestDatabase(prisma);
    cleanup = setup.cleanup;
  });

  beforeEach(async () => {
    // Create a test user
    user = await createTestUser(prisma);
    accessToken = generateAccessToken(app, user);
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  describe('POST /api-keys', () => {
    it('should create a new API key', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api-keys',
        headers: createTestHeaders(accessToken),
        payload: {
          name: 'Test API Key',
          scopes: ['read', 'write'],
        },
      });

      expect(response.statusCode).toBe(201);
      
      const body = JSON.parse(response.payload);
      expect(body).toMatchObject({
        name: 'Test API Key',
        scopes: ['read', 'write'],
      });
      expect(body.key).toBeDefined();
      expect(body.id).toBeDefined();
      expect(body.createdAt).toBeDefined();
      expect(body.lastUsedAt).toBeNull();

      // Verify key was stored in database
      const storedKey = await prisma.apiKey.findUnique({
        where: { id: body.id },
        include: { user: true },
      });
      expect(storedKey).toBeDefined();
      expect(storedKey?.userId).toBe(user.id);
    });

    it('should enforce authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api-keys',
        payload: {
          name: 'Test API Key',
          scopes: ['read'],
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should validate API key name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api-keys',
        headers: createTestHeaders(accessToken),
        payload: {
          name: '',
          scopes: ['read'],
        },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload)).toMatchObject({
        error: 'Bad Request',
        message: 'Validation error',
      });
    });
  });

  describe('GET /api-keys', () => {
    it('should list user API keys', async () => {
      // Create test API keys
      await createTestApiKey(prisma, user.id, {
        name: 'Test Key 1',
        scopes: ['read'],
      });
      await createTestApiKey(prisma, user.id, {
        name: 'Test Key 2',
        scopes: ['write'],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api-keys',
        headers: createTestHeaders(accessToken),
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.payload);
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(2);
      expect(body[0].key).toBeUndefined(); // Should not return key hash
      expect(body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Test Key 1', scopes: ['read'] }),
          expect.objectContaining({ name: 'Test Key 2', scopes: ['write'] }),
        ])
      );
    });

    it('should only return the user\'s own API keys', async () => {
      // Create another user with their own API key
      const otherUser = await createTestUser(prisma, { email: 'other@example.com' });
      await createTestApiKey(prisma, otherUser.id);

      // Create test API key for main user
      await createTestApiKey(prisma, user.id);

      const response = await app.inject({
        method: 'GET',
        url: '/api-keys',
        headers: createTestHeaders(accessToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toHaveLength(1);
      expect(body[0].userId).toBe(user.id);
    });
  });

  describe('DELETE /api-keys/:keyId', () => {
    it('should revoke an API key', async () => {
      const apiKey = await createTestApiKey(prisma, user.id);

      const response = await app.inject({
        method: 'DELETE',
        url: `/api-keys/${apiKey.id}`,
        headers: createTestHeaders(accessToken),
      });

      expect(response.statusCode).toBe(204);

      // Verify key was deleted
      const deletedKey = await prisma.apiKey.findUnique({
        where: { id: apiKey.id },
      });
      expect(deletedKey).toBeNull();
    });

    it('should not allow revoking other user\'s keys', async () => {
      const otherUser = await createTestUser(prisma, { email: 'other@example.com' });
      const otherKey = await createTestApiKey(prisma, otherUser.id);

      const response = await app.inject({
        method: 'DELETE',
        url: `/api-keys/${otherKey.id}`,
        headers: createTestHeaders(accessToken),
      });

      expect(response.statusCode).toBe(403);

      // Verify key still exists
      const key = await prisma.apiKey.findUnique({
        where: { id: otherKey.id },
      });
      expect(key).toBeDefined();
    });
  });
});