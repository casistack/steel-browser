import { Injectable } from "@fastify/awilix";
import { db } from "../../db";
import { ApiKey, User } from "../../types/auth";
import { randomBytes, createHash } from "crypto";

@Injectable()
export class ApiKeyService {
  private hashKey(key: string): string {
    return createHash("sha256").update(key).digest("hex");
  }

  private generateKey(): string {
    return randomBytes(32).toString("hex");
  }

  async createApiKey(
    userId: string,
    name: string,
    scopes: string[],
  ): Promise<Omit<ApiKey, "user"> & { plainKey: string }> {
    const plainKey = this.generateKey();
    const hashedKey = this.hashKey(plainKey);

    const apiKey = await db.apiKey.create({
      data: {
        userId,
        name,
        key: hashedKey,
        scopes,
      },
    });

    return {
      ...apiKey,
      plainKey,
    };
  }

  async validateApiKey(key: string): Promise<(ApiKey & { user: User }) | null> {
    const hashedKey = this.hashKey(key);

    const apiKey = await db.apiKey.findUnique({
      where: { key: hashedKey },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            passwordHash: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!apiKey) {
      return null;
    }

    // Update last used timestamp
    await db.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      ...apiKey,
      key: hashedKey,
    };
  }

  async listApiKeys(userId: string): Promise<Omit<ApiKey, "key" | "user">[]> {
    const apiKeys = await db.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        scopes: true,
        createdAt: true,
        lastUsedAt: true,
        userId: true,
      },
    });

    return apiKeys;
  }

  async deleteApiKey(userId: string, keyId: string): Promise<void> {
    await db.apiKey.deleteMany({
      where: {
        id: keyId,
        userId,
      },
    });
  }
}
