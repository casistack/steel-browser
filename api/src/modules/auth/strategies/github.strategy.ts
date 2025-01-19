import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { env } from "../../env";
import fastifyOAuth2 from "@fastify/oauth2";
import fp from "fastify-plugin";

const githubOAuthConfig = {
  name: "github",
  scope: ["user:email", "read:user"],
  credentials: {
    client: {
      id: env.GITHUB_CLIENT_ID,
      secret: env.GITHUB_CLIENT_SECRET,
    },
    auth: {
      authorizeHost: "https://github.com",
      authorizePath: "/login/oauth/authorize",
      tokenHost: "https://github.com",
      tokenPath: "/login/oauth/access_token",
    },
  },
  callbackUri: `${env.API_URL}/auth/github/callback`,
  startRedirectPath: "/auth/github",
  callbackParams: {
    code: "code",
    state: "state",
  },
};

const githubStrategy: FastifyPluginAsync = async (fastify) => {
  await fastify.register(fastifyOAuth2, {
    ...githubOAuthConfig,
    callbackUriParams: {
      scope: githubOAuthConfig.scope.join(" "),
    },
  });
};

export default fp(githubStrategy, {
  name: "githubOAuth2",
  fastify: "4.x",
});
