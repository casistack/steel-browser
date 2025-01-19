import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { env } from '../env';

interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
  stack?: string;
}

class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

const errorHandler: FastifyPluginAsync = async (fastify) => {
  // Custom error types
  fastify.decorate('AppError', AppError);

  // Default error handler
  fastify.setErrorHandler(
    async (error: Error, request: FastifyRequest, reply: FastifyReply) => {
      const response: ErrorResponse = {
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      };

      // Log error details
      request.log.error({
        err: error,
        stack: error.stack,
        url: request.url,
        method: request.method,
        params: request.params,
        query: request.query,
        body: request.body,
      });

      // Handle different types of errors
      if (error instanceof AppError) {
        response.statusCode = error.statusCode;
        response.error = error.name;
        response.message = error.message;
        if (error.details) {
          response.details = error.details;
        }
      } else if (error instanceof ZodError) {
        response.statusCode = 400;
        response.error = 'Validation Error';
        response.message = 'Invalid request data';
        response.details = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
        }));
      } else if (error.name === 'ValidationError') {
        response.statusCode = 400;
        response.error = 'Validation Error';
        response.message = error.message;
      } else if (error.name === 'UnauthorizedError') {
        response.statusCode = 401;
        response.error = 'Unauthorized';
        response.message = 'Authentication required';
      } else if (error.name === 'ForbiddenError') {
        response.statusCode = 403;
        response.error = 'Forbidden';
        response.message = 'Insufficient permissions';
      } else if (error.name === 'NotFoundError') {
        response.statusCode = 404;
        response.error = 'Not Found';
        response.message = error.message || 'Resource not found';
      }

      // Include stack trace in development
      if (env.NODE_ENV === 'development') {
        response.stack = error.stack;
      }

      // Send error response
      reply.status(response.statusCode).send(response);
    }
  );

  // Not found handler
  fastify.setNotFoundHandler(async (request, reply) => {
    const response: ErrorResponse = {
      statusCode: 404,
      error: 'Not Found',
      message: `Route ${request.method}:${request.url} not found`,
    };

    reply.status(404).send(response);
  });

  // Error schema for OpenAPI
  fastify.addSchema({
    $id: 'errorResponse',
    type: 'object',
    properties: {
      statusCode: { type: 'number' },
      error: { type: 'string' },
      message: { type: 'string' },
      details: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
    required: ['statusCode', 'error', 'message'],
  });
};

export default fp(errorHandler, {
  name: 'errorHandler',
  dependencies: ['@fastify/sensible'],
});

// Export error classes for use in other parts of the application
export { AppError };