import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { env } from '../../env';
import fastifyOAuth2 from '@fastify/oauth2';
import fp from 'fastify-plugin';

const googleOAuthConfig = {
  name: 'google',
  scope: ['profile', 'email'],
  credentials: {
    client: {
      id: env.GOOGLE_CLIENT_ID,
      secret: env.GOOGLE_CLIENT_SECRET
    },
    auth: {
      authorizeHost: 'https://accounts.google.com',
      authorizePath: '/o/oauth2/v2/auth',
      tokenHost: 'https://www.googleapis.com',
      tokenPath: '/oauth2/v4/token'
    }
  },
  callbackUri: `${env.API_URL}/auth/google/callback`,
  startRedirectPath: '/auth/google',
  callbackParams: {
    code: 'code',
    state: 'state'
  }
};

const googleStrategy: FastifyPluginAsync = async (fastify) => {
  await fastify.register(fastifyOAuth2, {
    ...googleOAuthConfig,
    callbackUriParams: {
      access_type: 'offline',
      prompt: 'consent'
    }
  });
};

export default fp(googleStrategy, {
  name: 'googleOAuth2',
  fastify: '4.x'
});