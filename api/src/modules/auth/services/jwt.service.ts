import { FastifyInstance } from 'fastify';
import { User } from '../../types/user';

export class JwtService {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  signAccessToken(user: User) {
    return this.fastify.jwt.sign({
      id: user.id,
      email: user.email
    }, {
      expiresIn: '15m'
    });
  }

  signRefreshToken(user: User) {
    return this.fastify.jwt.sign({
      id: user.id
    }, {
      expiresIn: '7d'
    });
  }

  verifyToken(token: string) {
    return this.fastify.jwt.verify(token);
  }
}