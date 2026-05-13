import Joi from 'joi';
import EnvConfigInterface from '../interface/envConfigInterface';
import dotenv from 'dotenv';
dotenv.config();

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),

  PORT: Joi.number().port().default(3000),
  HOST: Joi.string().default('localhost'),
  DATABASE_URL: Joi.string().uri().required().messages({
    'any.required': 'DATABASE_URL es requerido',
    'string.uri': 'DATABASE_URL debe ser una URL válida',
  }),
  JWT_SECRET: Joi.string().min(10).required().messages({
    'any.required': 'JWT_SECRET es requerido',
    'string.min': 'JWT_SECRET must be at least 32 characters long',
  }),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  JWT_REFRESH_SECRET: Joi.string().min(10).required().messages({
    'any.required': 'JWT_REFRESH_SECRET es requerido',
    'string.min': 'JWT_REFRESH_SECRET debe ser mayor a 32 caracteres',
  }),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  BCRYPT_SALT_ROUNDS: Joi.number().integer().min(10).max(15).default(12),
  CORS_ORIGIN: Joi.string().default('http://localhost:4200'),
  RATE_LIMIT_WINDOW_MS: Joi.number().integer().min(60000).default(900000), //min 1 minuto default 15 minutos
  RATE_LIMIT_MAX_REQUEST: Joi.number().integer().min(10).default(100),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_FILE: Joi.string().default('logs/app.log'),
  API_VERSION: Joi.string()
    .pattern(/^v\d+$/)
    .default('v1'),
  API_PREFIX: Joi.string().default('/api'),
  DEFAULT_TTL: Joi.number().messages({
    'any.required': 'TTL no definido'
  })
}).unknown(true); //Permitir otras variables de entorno

export function validateEnv(): EnvConfigInterface {
  const { error, value } = envSchema.validate(process.env, {
    allowUnknown: true,
    abortEarly: false,
  });

  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    // TODO LOGGER ERROR
    throw new Error(`Validación de enviroment falló:\n${errorMessages.join('\n')}`);
  }

  // TODO LOGGER INFO

  if (value.NODE_ENV === 'development') {
    // Log de configuración en desarrollo
    // if (value.NODE_ENV === 'development') {
    //     console.log('Environment configuration:', {
    //       NODE_ENV: value.NODE_ENV,
    //       PORT: value.PORT,
    //       HOST: value.HOST,
    //       API_PREFIX: value.API_PREFIX,
    //       API_VERSION: value.API_VERSION,
    //       LOG_LEVEL: value.LOG_LEVEL,
    //       CORS_ORIGIN: value.CORS_ORIGIN,
    //     });
    //   }
  }
  return value as EnvConfigInterface;
}
export const config = validateEnv();
