import { FastifyReply, FastifyRequest } from "fastify";
import { TokenService } from "../services/token.service";

export async function tokenRefreshMiddleware(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  const userId = request.session.get("userId");
  if (!userId) {
    done();
    return;
  }

  const tokenService = request.diContainer.resolve("tokenService") as TokenService;

  try {
    // Refresh both provider tokens if needed
    await Promise.all([
      tokenService.refreshTokenIfNeeded(userId, "google"),
      tokenService.refreshTokenIfNeeded(userId, "github"),
    ]);
  } catch (error) {
    request.log.error("Token refresh failed:", error);
    // Continue with the request even if refresh fails
  }

  done();
}
