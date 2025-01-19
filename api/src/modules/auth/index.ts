import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import googleStrategy from "./strategies/google.strategy";
import githubStrategy from "./strategies/github.strategy";
import googleRoutes from "./routes/google";
import githubRoutes from "./routes/github";
import { AuthService } from "./services/auth.service";
import { TokenService } from "./services/token.service";
import { tokenRefreshMiddleware } from "./middleware/token-refresh.middleware";

const authPlugin: FastifyPluginAsync = async (fastify) => {
  // Register services
  fastify.diContainer.register({
    token: "authService",
    useClass: AuthService,
  });

  fastify.diContainer.register({
    token: "tokenService",
    useClass: TokenService,
  });

  // Register OAuth strategies
  await fastify.register(googleStrategy);
  await fastify.register(githubStrategy);

  // Register middleware
  fastify.addHook("preHandler", tokenRefreshMiddleware);

  // Register route handlers
  await fastify.register(googleRoutes);
  await fastify.register(githubRoutes);
};

export default fp(authPlugin, {
  name: "auth",
  dependencies: ["@fastify/oauth2", "@fastify/session"],
});
