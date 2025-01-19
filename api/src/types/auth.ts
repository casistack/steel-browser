export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  key: string;
  scopes: string[];
  createdAt: Date;
  lastUsedAt?: Date | null;
  user?: User;
}

export interface User {
  id: string;
  email: string;
  passwordHash?: string | null;
  createdAt: Date;
  updatedAt: Date;
  oauthProviders?: OAuthProvider[];
  profile?: UserProfile;
  apiKeys?: ApiKey[];
}

export interface OAuthProvider {
  id: string;
  provider: "google" | "github";
  providerId: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  userId: string;
  user?: User;
}

export interface UserProfile {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  userId: string;
  user?: User;
}
