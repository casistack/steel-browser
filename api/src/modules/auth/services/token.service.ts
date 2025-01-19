import { Injectable } from "@fastify/awilix";
import { db } from "../../db";
import { env } from "../../env";

interface TokenRefreshResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

@Injectable()
export class TokenService {
  private async refreshGoogleToken(refreshToken: string): Promise<TokenRefreshResult> {
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh Google token");
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token, // Google might issue a new refresh token
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  private async refreshGithubToken(refreshToken: string): Promise<TokenRefreshResult> {
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID!,
      client_secret: env.GITHUB_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh GitHub token");
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    };
  }

  async refreshOAuthToken(userId: string, provider: "google" | "github"): Promise<void> {
    const oauthProvider = await db.oAuthProvider.findFirst({
      where: { userId, provider },
    });

    if (!oauthProvider?.refreshToken) {
      throw new Error(`No refresh token found for ${provider}`);
    }

    try {
      const result =
        provider === "google"
          ? await this.refreshGoogleToken(oauthProvider.refreshToken)
          : await this.refreshGithubToken(oauthProvider.refreshToken);

      await db.oAuthProvider.update({
        where: { id: oauthProvider.id },
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken || oauthProvider.refreshToken,
          expiresAt: result.expiresAt,
        },
      });
    } catch (error) {
      // If refresh fails, mark the token as expired
      await db.oAuthProvider.update({
        where: { id: oauthProvider.id },
        data: { expiresAt: new Date() },
      });
      throw error;
    }
  }

  async refreshTokenIfNeeded(userId: string, provider: "google" | "github"): Promise<void> {
    const oauthProvider = await db.oAuthProvider.findFirst({
      where: { userId, provider },
    });

    if (!oauthProvider) return;

    // Refresh if token is expired or will expire in the next 5 minutes
    const shouldRefresh = oauthProvider.expiresAt && oauthProvider.expiresAt.getTime() - Date.now() < 5 * 60 * 1000;

    if (shouldRefresh) {
      await this.refreshOAuthToken(userId, provider);
    }
  }
}
