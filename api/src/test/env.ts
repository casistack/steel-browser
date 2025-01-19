import { config } from 'dotenv';
import { join } from 'path';

// Load test environment variables
config({ path: join(__dirname, '../..', '.env.test') });

export const testEnv = {
  DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/steel_test',
  JWT_SECRET: 'test-jwt-secret',
  API_URL: 'http://localhost:3000',
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  REDIS_PASSWORD: undefined,
};

// Override process.env with test environment
process.env = {
  ...process.env,
  ...testEnv,
};

export default testEnv;