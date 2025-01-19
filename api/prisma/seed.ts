import { PrismaClient } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';

const prisma = new PrismaClient();

function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

async function seed() {
  try {
    // Clean up existing data
    await prisma.apiKey.deleteMany();
    await prisma.oauthProvider.deleteMany();
    await prisma.userProfile.deleteMany();
    await prisma.user.deleteMany();

    console.log('🧹 Cleaned up existing data');

    // Create test users
    const users = await Promise.all([
      prisma.user.create({
        data: {
          email: 'admin@example.com',
          profile: {
            create: {
              firstName: 'Admin',
              lastName: 'User',
              avatarUrl: 'https://www.gravatar.com/avatar/admin?d=identicon',
            },
          },
        },
      }),
      prisma.user.create({
        data: {
          email: 'user@example.com',
          profile: {
            create: {
              firstName: 'Regular',
              lastName: 'User',
              avatarUrl: 'https://www.gravatar.com/avatar/user?d=identicon',
            },
          },
        },
      }),
    ]);

    console.log('👥 Created test users');

    // Create API keys for each user
    for (const user of users) {
      const keys = await Promise.all([
        // Read-only API key
        prisma.apiKey.create({
          data: {
            name: 'Read Only Access',
            key: hashApiKey(randomBytes(32).toString('hex')),
            scopes: ['read'],
            userId: user.id,
          },
        }),
        // Full access API key
        prisma.apiKey.create({
          data: {
            name: 'Full Access',
            key: hashApiKey(randomBytes(32).toString('hex')),
            scopes: ['read', 'write'],
            userId: user.id,
          },
        }),
      ]);

      console.log(`🔑 Created ${keys.length} API keys for ${user.email}`);
    }

    // Create OAuth provider entries for testing
    await prisma.oauthProvider.create({
      data: {
        provider: 'google',
        providerId: 'test_google_id',
        accessToken: 'test_access_token',
        refreshToken: 'test_refresh_token',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        userId: users[0].id,
      },
    });

    console.log('🔌 Created OAuth provider entries');

    console.log('✅ Database seeding completed successfully');

    // Log summary
    const summary = await prisma.$transaction([
      prisma.user.count(),
      prisma.apiKey.count(),
      prisma.oauthProvider.count(),
    ]);

    console.log('\n📊 Database Summary:');
    console.log(`Users: ${summary[0]}`);
    console.log(`API Keys: ${summary[1]}`);
    console.log(`OAuth Providers: ${summary[2]}\n`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeding
if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Failed to seed database:', error);
      process.exit(1);
    });
}

export default seed;