export interface User {
  id: string;
  email: string;
  passwordHash?: string;
  oauthProviders: OAuthProvider[];
  profile: UserProfile;
  apiKeys: ApiKey[];
  createdAt: Date;
  updatedAt: Date;
}

interface OAuthProvider {
  provider: 'google' | 'github' | 'facebook';
  providerId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

interface UserProfile {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

interface ApiKey {
  key: string;
  name: string;
  scopes: string[];
  createdAt: Date;
  lastUsedAt?: Date;
}