import { FastifyPluginAsync } from "fastify";
import { AuthService } from "../services/auth.service";
import fp from "fastify-plugin";

const googleRoutes: FastifyPluginAsync = async (fastify) => {
  const authService = fastify.diContainer.resolve("authService") as AuthService;

  fastify.get("/auth/google/callback", async (request, reply) => {
    try {
      const { token } = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

      // Fetch user profile from Google
      const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
        },
      });

      const googleProfile = await userResponse.json();

      const user = await authService.findOrCreateFromOAuth({
        provider: "google",
        providerId: googleProfile.id,
        email: googleProfile.email,
        name: googleProfile.name,
        avatar: googleProfile.picture,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
      });

      // Set session
      request.session.set("userId", user.id);

      // Redirect to frontend
      return reply.redirect("/dashboard");
    } catch (error) {
      fastify.log.error("Google OAuth error:", error);
      return reply.redirect("/login?error=oauth_failed");
    }
  });
};

export default fp(googleRoutes, {
  name: "googleRoutes",
  dependencies: ["googleOAuth2"],
});
