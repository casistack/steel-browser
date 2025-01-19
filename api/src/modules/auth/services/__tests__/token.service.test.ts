import { TokenService } from "../token.service";
import { mockFetchResponse, mockFetchError } from "@/test/setup";
import { db } from "@/db";

jest.mock("@/db", () => ({
  db: {
    oAuthProvider: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe("TokenService", () => {
  let tokenService: TokenService;
  const mockUserId = "test-user-id";
  const mockProviderId = "test-provider-id";

  beforeEach(() => {
    tokenService = new TokenService();
    jest.clearAllMocks();
  });

  describe("refreshTokenIfNeeded", () => {
    it("should not refresh if no provider found", async () => {
      (db.oAuthProvider.findFirst as jest.Mock).mockResolvedValueOnce(null);

      await tokenService.refreshTokenIfNeeded(mockUserId, "google");

      expect(db.oAuthProvider.findFirst).toHaveBeenCalledWith({
        where: { userId: mockUserId, provider: "google" },
      });
      expect(db.oAuthProvider.update).not.toHaveBeenCalled();
    });

    it("should not refresh if token is not expired", async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes in future
      (db.oAuthProvider.findFirst as jest.Mock).mockResolvedValueOnce({
        id: mockProviderId,
        expiresAt: futureDate,
      });

      await tokenService.refreshTokenIfNeeded(mockUserId, "google");

      expect(db.oAuthProvider.update).not.toHaveBeenCalled();
    });

    it("should refresh Google token if expired", async () => {
      const pastDate = new Date(Date.now() - 1000); // 1 second ago
      (db.oAuthProvider.findFirst as jest.Mock).mockResolvedValueOnce({
        id: mockProviderId,
        refreshToken: "old-refresh-token",
        expiresAt: pastDate,
      });

      mockFetchResponse({
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expires_in: 3600,
      });

      await tokenService.refreshTokenIfNeeded(mockUserId, "google");

      expect(db.oAuthProvider.update).toHaveBeenCalledWith({
        where: { id: mockProviderId },
        data: expect.objectContaining({
          accessToken: "new-access-token",
          refreshToken: "new-refresh-token",
        }),
      });
    });

    it("should refresh GitHub token if expired", async () => {
      const pastDate = new Date(Date.now() - 1000);
      (db.oAuthProvider.findFirst as jest.Mock).mockResolvedValueOnce({
        id: mockProviderId,
        refreshToken: "old-refresh-token",
        expiresAt: pastDate,
      });

      mockFetchResponse({
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
      });

      await tokenService.refreshTokenIfNeeded(mockUserId, "github");

      expect(db.oAuthProvider.update).toHaveBeenCalledWith({
        where: { id: mockProviderId },
        data: expect.objectContaining({
          accessToken: "new-access-token",
          refreshToken: "new-refresh-token",
        }),
      });
    });

    it("should handle refresh failure", async () => {
      const pastDate = new Date(Date.now() - 1000);
      (db.oAuthProvider.findFirst as jest.Mock).mockResolvedValueOnce({
        id: mockProviderId,
        refreshToken: "old-refresh-token",
        expiresAt: pastDate,
      });

      mockFetchError(401, "Invalid refresh token");

      await expect(tokenService.refreshTokenIfNeeded(mockUserId, "google")).rejects.toThrow(
        "Failed to refresh Google token",
      );

      expect(db.oAuthProvider.update).toHaveBeenCalledWith({
        where: { id: mockProviderId },
        data: expect.objectContaining({
          expiresAt: expect.any(Date),
        }),
      });
    });
  });
});
