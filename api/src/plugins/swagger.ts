import { FastifyPluginAsync } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fp from 'fastify-plugin';
import { env } from '../env';

const swaggerPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Steel Browser API',
        description: 'API documentation for Steel Browser',
        version: '1.0.0',
        contact: {
          name: 'API Support',
          url: 'https://github.com/yourusername/steel-browser',
        },
      },
      externalDocs: {
        description: 'Find more info here',
        url: 'https://github.com/yourusername/steel-browser',
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token in the format "Bearer {token}"',
          },
          apiKeyAuth: {
            type: 'apiKey',
            name: 'X-API-Key',
            in: 'header',
            description: 'API key for authentication',
          },
        },
      },
      tags: [
        { name: 'API Keys', description: 'API key management endpoints' },
        { name: 'Authentication', description: 'Authentication related endpoints' },
      ],
      security: [
        { bearerAuth: [] },
        { apiKeyAuth: [] },
      ],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayRequestDuration: true,
    },
    uiHooks: {
      onRequest: function (request, reply, next) {
        // Only allow documentation access in non-production or with admin access
        if (env.NODE_ENV === 'production' && !request.headers['x-admin-access']) {
          reply.status(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'Documentation access restricted in production',
          });
          return;
        }
        next();
      },
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  // Add hook to update the Swagger documentation when the server starts
  fastify.addHook('onReady', async () => {
    // Generate swagger documentation
    const documentation = await fastify.swagger();
    fastify.log.info(
      `📚 API Documentation available at ${env.API_URL}/documentation`
    );

    // Log OpenAPI spec location in development
    if (env.NODE_ENV === 'development') {
      fastify.log.info(
        `🔍 OpenAPI specification available at ${env.API_URL}/documentation/json`
      );
    }
  });
};

export default fp(swaggerPlugin, {
  name: 'swagger',
  dependencies: ['@fastify/sensible'],
});