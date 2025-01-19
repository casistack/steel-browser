interface EnvConfig {
  // Server settings
  PORT: string;
  NODE_ENV: string;
  API_URL: string;

  // Database
  DATABASE_URL: string;

  // Authentication
  JWT_SECRET: string;
  API_KEY?: string;

  // Redis settings
  REDIS_HOST: string;
  REDIS_PORT: string;
  REDIS_PASSWORD?: string;

  // OAuth settings
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
}

// Environment validation
const requiredEnvVars: (keyof EnvConfig)[] = ["DATABASE_URL", "JWT_SECRET"];

// Check required environment variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const env: EnvConfig = {
  // Server settings
  PORT: process.env.PORT || "3000",
  NODE_ENV: process.env.NODE_ENV || "development",
  API_URL: process.env.API_URL || "http://localhost:3000",

  // Database
  DATABASE_URL: process.env.DATABASE_URL!,

  // Authentication
  JWT_SECRET: process.env.JWT_SECRET!,
  API_KEY: process.env.API_KEY,

  // Redis settings
  REDIS_HOST: process.env.REDIS_HOST || "localhost",
  REDIS_PORT: process.env.REDIS_PORT || "6379",
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,

  // OAuth settings
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
};

// Type assertion to ensure all required fields are present
export default env as Required<EnvConfig>;

// Environment type guard
export function isProduction(): boolean {
  return env.NODE_ENV === "production";
}

export function isTest(): boolean {
  return env.NODE_ENV === "test";
}

export function isDevelopment(): boolean {
  return env.NODE_ENV === "development";
}
