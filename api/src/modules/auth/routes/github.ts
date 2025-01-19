import { FastifyPluginAsync } from "fastify";
import { AuthService } from "../services/auth.service";
import fp from "fastify-plugin";

const githubRoutes: FastifyPluginAsync = async (fastify) => {
  const authService = fastify.diContainer.resolve("authService") as AuthService;

  fastify.get("/auth/github/callback", async (request, reply) => {
    try {
      const { token } = await fastify.githubOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

      // Fetch user profile from GitHub
      const userResponse = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          Accept: "application/json",
        },
      });

      const githubProfile = await userResponse.json();

      // Fetch email if not public
      let email = githubProfile.email;
      if (!email) {
        const emailsResponse = await fetch("https://api.github.com/user/emails", {
          headers: {
            Authorization: `Bearer ${token.access_token}`,
            Accept: "application/json",
          },
        });
        const emails = await emailsResponse.json();
        const primaryEmail = emails.find((e: any) => e.primary);
        email = primaryEmail?.email;
      }

      const user = await authService.findOrCreateFromOAuth({
        provider: "github",
        providerId: githubProfile.id.toString(),
        email: email,
        name: githubProfile.name || githubProfile.login,
        avatar: githubProfile.avatar_url,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
      });

      // Set session
      request.session.set("userId", user.id);

      // Redirect to frontend
      return reply.redirect("/dashboard");
    } catch (error) {
      fastify.log.error("GitHub OAuth error:", error);
      return reply.redirect("/login?error=oauth_failed");
    }
  });
};

export default fp(githubRoutes, {
  name: "githubRoutes",
  dependencies: ["githubOAuth2"],
});
