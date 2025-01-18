import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { env } from '../env';

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (request, reply) => {
    // Skip auth if no API key is configured
    if (!env.API_KEY) {
      return;
    }

    const apiKey = request.headers['x-api-key'];
    
    if (!apiKey) {
      reply.code(401).send({ 
        error: 'Authentication required',
        message: 'Please provide an API key using the X-API-Key header'
      });
      return;
    }

    if (apiKey !== env.API_KEY) {
      reply.code(403).send({ 
        error: 'Invalid API key',
        message: 'The provided API key is invalid'
      });
      return;
    }
  });
};

export default fp(authPlugin, {
  name: 'auth',
  fastify: '4.x'
}); 