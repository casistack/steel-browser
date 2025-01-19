import "@fastify/jwt";
import { PrismaClient } from "@prisma/client";
import { User } from "./auth";
import { FastifyRequest, FastifyReply, preHandlerHookHandler, RouteGenericInterface } from "fastify";
import { FastifyRequest as OriginalFastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    db: PrismaClient;
    jwt: {
      sign: (payload: Record<string, any>, options?: { expiresIn?: string }) => string;
      verify: (token: string) => Promise<any>;
    };
    authenticate: preHandlerHookHandler;
  }

  interface FastifyRequest extends OriginalFastifyRequest {
    user?: User;
    session: {
      get(key: string): any;
      set(key: string, value: any): void;
    };
    diContainer: {
      resolve(token: string): any;
    };
  }
}

// Route interface types
export interface CreateApiKeyRouteGeneric extends RouteGenericInterface {
  Body: {
    name: string;
    scopes?: string[];
  };
}

export interface RevokeApiKeyRouteGeneric extends RouteGenericInterface {
  Params: {
    keyId: string;
  };
}

export interface ListApiKeysRouteGeneric extends RouteGenericInterface {
  Reply: ApiKeyResponse[];
}

// Response types
export interface ApiKeyResponse {
  id: string;
  name: string;
  key?: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
}

export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
}

// Type helpers
export type TypedRequest<T extends RouteGenericInterface> = FastifyRequest<T> & {
  user: User;
};

export type CreateApiKeyRequest = TypedRequest<CreateApiKeyRouteGeneric>;
export type RevokeApiKeyRequest = TypedRequest<RevokeApiKeyRouteGeneric>;
export type ListApiKeysRequest = TypedRequest<ListApiKeysRouteGeneric>;
