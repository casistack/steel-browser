import { Injectable } from '@fastify/awilix';
import { User } from '../../types/user';
import { db } from '../../db';
import { OAuthProfile } from './types';

@Injectable()
export class AuthService {
  async findOrCreateFromOAuth(profile: OAuthProfile) {
    const existingUser = await db.user.findUnique({
      where: { email: profile.email },
      include: { oauthProviders: true }
    });

    if (existingUser) {
      // Update OAuth provider info if needed
      const existingProvider = existingUser.oauthProviders.find(
        p => p.provider === profile.provider
      );

      if (!existingProvider) {
        await db.user.update({
          where: { id: existingUser.id },
          data: {
            oauthProviders: {
              create: {
                provider: profile.provider,
                providerId: profile.providerId,
                accessToken: profile.accessToken,
                refreshToken: profile.refreshToken
              }
            }
          }
        });
      }

      return existingUser;
    }

    // Create new user
    return await db.user.create({
      data: {
        email: profile.email,
        profile: {
          create: {
            firstName: profile.name?.split(' ')[0],
            lastName: profile.name?.split(' ')[1],
            avatarUrl: profile.avatar
          }
        },
        oauthProviders: {
          create: {
            provider: profile.provider,
            providerId: profile.providerId,
            accessToken: profile.accessToken,
            refreshToken: profile.refreshToken
          }
        }
      }
    });
  }
}