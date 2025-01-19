import Fastify, { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import fastifyJwt from '@fastify/jwt';
import cors from '@fastify/cors';
import { env } from './env';

// Plugins
import authMiddleware from './modules/auth/middleware/auth.middleware';
import validationMiddleware from './modules/auth/middleware/validation.middleware';
import rateLimitMiddleware from './modules/auth/middleware/rate-limit.middleware';

// Routes
import apiKeyRoutes from './modules/auth/routes/api-key.routes';

export async function build(options = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: process.env.NODE_ENV === 'test' ? false : {
      level: 'info',
      transport: {
        target: 'pino-pretty',
      },
    },
    ...options,
  });

  try {
    // Initialize Prisma
    const prisma = new PrismaClient();
    await prisma.$connect();

    // Add prisma to fastify instance
    app.decorate('db', prisma);

    // Register plugins
    await app.register(cors);
    await app.register(fastifyJwt, {
      secret: env.JWT_SECRET,
    });

    // Register middlewares
    await app.register(authMiddleware);
    await app.register(validationMiddleware);
    await app.register(rateLimitMiddleware, {
      redis: {
        host: env.REDIS_HOST || 'localhost',
        port: parseInt(env.REDIS_PORT || '6379'),
        password: env.REDIS_PASSWORD,
      },
    });

    // Register routes
    await app.register(apiKeyRoutes, { prefix: '/api-keys' });

    // Add hook to close Prisma when the app closes
    app.addHook('onClose', async () => {
      await prisma.$disconnect();
    });

    // Add error handler
    app.setErrorHandler((error, request, reply) => {
      request.log.error(error);
      
      // Handle validation errors
      if (error.validation) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Validation error',
          details: error.validation,
        });
      }

      // Handle known errors
      if (error.statusCode) {
        return reply.status(error.statusCode).send(error);
      }

      // Handle unknown errors
      reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      });
    });

    return app;
  } catch (err) {
    app.log.error('Error building server:', err);
    throw err;
  }
}

// Start the server if we're running directly
if (require.main === module) {
  const server = build();
  server.then(app => {
    app.listen({
      port: parseInt(env.PORT || '3000', 10),
      host: '0.0.0.0',
    });
  }).catch(err => {
    console.error('Error starting server:', err);
    process.exit(1);
  });
}