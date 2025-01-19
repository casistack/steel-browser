import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { ApiKeyService } from '../services/api-key.service';
import {
  createApiKeySchema,
  listApiKeysSchema,
  revokeApiKeySchema,
} from '../schemas/api-key.schema';
import { User } from '../../../types/auth';

interface CreateApiKeyBody {
  name: string;
  scopes?: string[];
}

interface ApiKeyParams {
  keyId: string;
}

interface ApiKeyResponse {
  id: string;
  name: string;
  key?: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
}

const apiKeyRoutes: FastifyPluginAsync = async (fastify) => {
  const apiKeyService = new ApiKeyService(fastify);

  // Create new API key
  fastify.post<{
    Body: CreateApiKeyBody;
  }>(
    '/api-keys',
    {
      preHandler: [
        fastify.authenticate,
        fastify.validateRequest({ body: createApiKeySchema.body }),
        fastify.rateLimit({ points: 10, duration: 60 }), // 10 requests per minute
      ],
    },
    async (request, reply) => {
      try {
        const apiKey = await apiKeyService.generateApiKey(
          request.user as User,
          request.body.name,
          request.body.scopes
        );

        const response: ApiKeyResponse = {
          ...apiKey,
          createdAt: apiKey.createdAt.toISOString(),
          lastUsedAt: apiKey.lastUsedAt?.toISOString() || null,
        };

        return reply.code(201).send(response);
      } catch (error) {
        request.log.error('Failed to create API key:', error);
        return reply.code(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to create API key',
        });
      }
    }
  );

  // List API keys
  fastify.get(
    '/api-keys',
    {
      schema: listApiKeysSchema,
      preHandler: [
        fastify.authenticate,
        fastify.rateLimit({ points: 30, duration: 60 }), // 30 requests per minute
      ],
    },
    async (request) => {
      try {
        const apiKeys = await apiKeyService.listApiKeys((request.user as User).id);
        return apiKeys.map(key => ({
          ...key,
          createdAt: key.createdAt.toISOString(),
          lastUsedAt: key.lastUsedAt?.toISOString() || null,
        }));
      } catch (error) {
        request.log.error('Failed to list API keys:', error);
        throw {
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to list API keys',
        };
      }
    }
  );

  // Revoke API key
  fastify.delete<{
    Params: ApiKeyParams;
  }>(
    '/api-keys/:keyId',
    {
      preHandler: [
        fastify.authenticate,
        fastify.validateRequest({ params: revokeApiKeySchema.params }),
        fastify.rateLimit({ points: 10, duration: 60 }), // 10 requests per minute
      ],
    },
    async (request, reply) => {
      try {
        await apiKeyService.revokeApiKey(
          (request.user as User).id,
          request.params.keyId
        );
        return reply.code(204).send();
      } catch (error) {
        request.log.error('Failed to revoke API key:', error);
        return reply.code(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to revoke API key',
        });
      }
    }
  );
};

export default fp(apiKeyRoutes, {
  name: 'apiKeyRoutes',
  dependencies: ['authenticate', 'validation', 'rateLimit'],
});