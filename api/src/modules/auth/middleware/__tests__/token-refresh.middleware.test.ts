import { FastifyRequest, FastifyReply } from "fastify";
import { tokenRefreshMiddleware } from "../token-refresh.middleware";
import { TokenService } from "../../services/token.service";
import { FastifyBaseLogger } from "fastify/types/logger";

type MockFastifyRequest = Omit<FastifyRequest, "session" | "diContainer" | "log"> & {
  session: {
    get: jest.Mock;
  };
  diContainer: {
    resolve: jest.Mock;
  };
  log: Partial<FastifyBaseLogger> & {
    error: jest.Mock;
  };
};

describe("tokenRefreshMiddleware", () => {
  const mockRequest = {
    session: {
      get: jest.fn(),
    },
    diContainer: {
      resolve: jest.fn(),
    },
    log: {
      error: jest.fn(),
      fatal: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
      child: jest.fn(),
    },
  } as unknown as MockFastifyRequest;

  const mockReply = {} as FastifyReply;
  const mockDone = jest.fn();
  const mockTokenService = {
    refreshTokenIfNeeded: jest.fn(),
  } as unknown as jest.Mocked<TokenService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest.diContainer.resolve.mockReturnValue(mockTokenService);
  });

  it("should skip refresh if no user is logged in", async () => {
    mockRequest.session.get.mockReturnValue(null);

    await tokenRefreshMiddleware(mockRequest as unknown as FastifyRequest, mockReply, mockDone);

    expect(mockDone).toHaveBeenCalled();
    expect(mockTokenService.refreshTokenIfNeeded).not.toHaveBeenCalled();
  });

  it("should attempt to refresh both provider tokens if user is logged in", async () => {
    const mockUserId = "test-user-id";
    mockRequest.session.get.mockReturnValue(mockUserId);
    mockTokenService.refreshTokenIfNeeded.mockResolvedValue(undefined);

    await tokenRefreshMiddleware(mockRequest as unknown as FastifyRequest, mockReply, mockDone);

    expect(mockTokenService.refreshTokenIfNeeded).toHaveBeenCalledWith(mockUserId, "google");
    expect(mockTokenService.refreshTokenIfNeeded).toHaveBeenCalledWith(mockUserId, "github");
    expect(mockDone).toHaveBeenCalled();
  });

  it("should continue if token refresh fails", async () => {
    const mockUserId = "test-user-id";
    mockRequest.session.get.mockReturnValue(mockUserId);
    mockTokenService.refreshTokenIfNeeded.mockRejectedValue(new Error("Refresh failed"));

    await tokenRefreshMiddleware(mockRequest as unknown as FastifyRequest, mockReply, mockDone);

    expect(mockRequest.log.error).toHaveBeenCalledWith("Token refresh failed:", expect.any(Error));
    expect(mockDone).toHaveBeenCalled();
  });
});
