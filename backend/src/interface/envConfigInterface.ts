export default interface EnvConfigInterface {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  HOST: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;
  BCRYPT_SALT_ROUNDS: number;
  CORS_ORIGIN: string;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  LOG_LEVEL: string;
  LOG_FILE: string;
  API_VERSION: string;
  API_PREFIX: string;
  DEFAULT_TTL: number;
}
