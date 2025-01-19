import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import IORedis from 'ioredis';
import { User } from '../../../types/auth';

export interface RateLimitOptions {
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  points?: number;        // Number of points
  duration?: number;      // Per number of seconds
  blockDuration?: number; // Block if consumed more than points per duration
}

interface RateLimitError {
  msBeforeNext: number;
}

declare module 'fastify' {
  interface FastifyInstance {
    rateLimit: (opts?: {
      points?: number;
      duration?: number;
      blockDuration?: number;
    }) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const isRateLimitError = (error: unknown): error is RateLimitError => {
  return typeof error === 'object' && error !== null && 'msBeforeNext' in error;
};

const rateLimitMiddleware: FastifyPluginAsync<RateLimitOptions> = async (fastify, options) => {
  const {
    redis,
    points = 60,        // 60 requests
    duration = 60,      // per 60 seconds
    blockDuration = 60  // Block for 60 seconds if exceeded
  } = options;

  // Initialize Redis client
  const redisClient = new IORedis({
    host: redis.host,
    port: redis.port,
    password: redis.password,
    enableOfflineQueue: false,
  });

  // Handle Redis connection errors
  redisClient.on('error', (err) => {
    fastify.log.error('Redis error:', err);
  });

  // Create rate limit decorator
  const rateLimit = (opts: {
    points?: number;
    duration?: number;
    blockDuration?: number;
  } = {}) => {
    const limiter = new RateLimiterRedis({
      storeClient: redisClient,
      points: opts.points || points,
      duration: opts.duration || duration,
      blockDuration: opts.blockDuration || blockDuration,
      insuranceLimiter: new RateLimiterRedis({
        storeClient: new IORedis(redis),
        points: 1,
        duration: 1,
      }),
    });

    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        // Get key based on user ID or IP
        const key = (request.user as User)?.id || request.ip;
        
        // Consume points
        const rateLimitResult: RateLimiterRes = await limiter.consume(key);
        
        // Set rate limit headers
        reply.header('X-RateLimit-Limit', opts.points || points);
        reply.header('X-RateLimit-Remaining', rateLimitResult.remainingPoints);
        reply.header('X-RateLimit-Reset', new Date(Date.now() + rateLimitResult.msBeforeNext).toISOString());
        
      } catch (error) {
        if (isRateLimitError(error)) {
          // Rate limit exceeded
          const retryAfter = Math.ceil(error.msBeforeNext / 1000);
          
          reply
            .code(429)
            .header('Retry-After', retryAfter)
            .send({
              statusCode: 429,
              error: 'Too Many Requests',
              message: 'Rate limit exceeded',
              retryAfter,
            });
        } else {
          // Handle other errors
          fastify.log.error('Rate limit error:', error);
          reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Rate limiting failed',
          });
        }
      }
    };
  };

  // Register the rate limit decorator
  fastify.decorate('rateLimit', rateLimit);

  // Add hook to close Redis connection when the server stops
  fastify.addHook('onClose', async () => {
    await redisClient.quit();
  });
};

export default fp(rateLimitMiddleware, {
  name: 'rateLimit',
});