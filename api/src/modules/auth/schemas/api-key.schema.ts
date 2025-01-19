import { z } from 'zod';

export const apiKeySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()),
  createdAt: z.date(),
  lastUsedAt: z.date().optional(),
});

export const createApiKeySchema = {
  body: z.object({
    name: z.string().min(1).max(100),
    scopes: z.array(z.string()).optional().default(['*']),
  }),
  response: {
    201: z.object({
      id: z.string().uuid(),
      name: z.string(),
      key: z.string(), // The actual API key (only shown once)
      scopes: z.array(z.string()),
      createdAt: z.string(), // ISO date string
      lastUsedAt: z.string().nullable(), // ISO date string
    }),
  },
};

export const listApiKeysSchema = {
  response: {
    200: z.array(z.object({
      id: z.string().uuid(),
      name: z.string(),
      scopes: z.array(z.string()),
      createdAt: z.string(),
      lastUsedAt: z.string().nullable(),
    })),
  },
};

export const revokeApiKeySchema = {
  params: z.object({
    keyId: z.string().uuid(),
  }),
  response: {
    204: z.null(),
  },
};

// Type exports for use in routes
export type CreateApiKeyBody = z.infer<typeof createApiKeySchema.body>;
export type ApiKeyResponse = z.infer<typeof createApiKeySchema.response[201]>;
export type ListApiKeysResponse = z.infer<typeof listApiKeysSchema.response[200]>;