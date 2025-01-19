import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError, ZodSchema } from 'zod';
import { fromZodError } from 'zod-validation-error';

interface ValidationError {
  statusCode: number;
  error: string;
  message: string;
  details: {
    path: string[];
    message: string;
  }[];
}

declare module 'fastify' {
  interface FastifyInstance {
    validateRequest: (schema: {
      body?: ZodSchema;
      params?: ZodSchema;
      querystring?: ZodSchema;
      headers?: ZodSchema;
    }) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const validationMiddleware: FastifyPluginAsync = async (fastify) => {
  const validateRequest = (schema: {
    body?: ZodSchema;
    params?: ZodSchema;
    querystring?: ZodSchema;
    headers?: ZodSchema;
  }) => {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        // Validate request body if schema is provided
        if (schema.body) {
          request.body = await schema.body.parseAsync(request.body);
        }

        // Validate URL parameters if schema is provided
        if (schema.params) {
          request.params = await schema.params.parseAsync(request.params);
        }

        // Validate query string if schema is provided
        if (schema.querystring) {
          request.query = await schema.querystring.parseAsync(request.query);
        }

        // Validate headers if schema is provided
        if (schema.headers) {
          request.headers = await schema.headers.parseAsync(request.headers);
        }
      } catch (error) {
        if (error instanceof ZodError) {
          const validationError = fromZodError(error);
          const responseError: ValidationError = {
            statusCode: 400,
            error: 'Bad Request',
            message: 'Validation error',
            details: error.errors.map(err => ({
              path: err.path,
              message: err.message,
            })),
          };

          reply.code(400).send(responseError);
          return;
        }

        // Handle unexpected errors
        fastify.log.error('Validation error:', error);
        reply.code(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Validation failed',
        });
      }
    };
  };

  // Register the validation decorator
  fastify.decorate('validateRequest', validateRequest);

  // Add schema compiler for route validation
  fastify.setValidatorCompiler(({ schema }) => {
    return (data) => {
      try {
        return { value: (schema as ZodSchema).parse(data) };
      } catch (error) {
        return { error };
      }
    };
  });
};

export default fp(validationMiddleware, {
  name: 'validation',
  dependencies: ['@fastify/swagger'],
});