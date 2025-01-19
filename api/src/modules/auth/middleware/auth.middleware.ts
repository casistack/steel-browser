import { FastifyPluginAsync, FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import fp from "fastify-plugin";
import { User } from "@/types/auth";

export interface AuthOptions {
  ignorePaths?: string[];
}

export class AuthenticationError extends Error {
  statusCode: number;
  error: string;

  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
    this.statusCode = 401;
    this.error = "Unauthorized";
  }
}

const authMiddleware: FastifyPluginAsync<AuthOptions> = async (fastify, options) => {
  const { ignorePaths = [] } = options;

  const authenticate: preHandlerHookHandler = async (request, reply) => {
    try {
      // Skip authentication for ignored paths
      if (ignorePaths.some((path) => request.routerPath.startsWith(path))) {
        return;
      }

      // Check for API key in header
      const apiKey = request.headers["x-api-key"] as string;
      if (apiKey) {
        const apiKeyService = request.diContainer.resolve("apiKeyService");
        const keyData = await apiKeyService.validateApiKey(apiKey);
        if (keyData) {
          request.user = keyData.user;
          return;
        }
      }

      // Check for JWT token
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        throw new AuthenticationError("No authentication provided");
      }

      if (authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const decoded = await fastify.jwt.verify(token);
        if (typeof decoded === "object" && decoded !== null) {
          request.user = decoded as User;
          return;
        }
      }

      throw new AuthenticationError("Invalid authentication format");
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError(error instanceof Error ? error.message : "Authentication failed");
    }
  };

  // Register the authenticate decorator
  fastify.decorate("authenticate", authenticate);

  // Add hook to handle authentication errors
  fastify.addHook("onError", async (request, reply, error) => {
    if (error instanceof AuthenticationError) {
      reply.code(error.statusCode).send({
        statusCode: error.statusCode,
        error: error.error,
        message: error.message,
      });
    }
  });
};

export default fp(authMiddleware, {
  name: "authenticate",
  dependencies: ["@fastify/jwt"],
});

export async function apiKeyAuthMiddleware(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  const apiKey = request.headers["x-api-key"] as string;
  if (!apiKey) {
    done();
    return;
  }

  try {
    const apiKeyService = request.diContainer.resolve("apiKeyService");
    const validKey = await apiKeyService.validateApiKey(apiKey);

    if (validKey) {
      request.user = validKey.user;
    }
  } catch (error) {
    request.log.error("API key validation failed:", error);
  }

  done();
}
