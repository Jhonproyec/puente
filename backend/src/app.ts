import express, { Application, Request, Response } from 'express';
import { validateEnv } from './config/env';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';
import { logger } from './config/logger';
import { authRouter } from './routes/auth.routes';
import { notFound } from './utils/notFound';
import { errorHandler } from './utils/errorHandler';
import { userRoutes } from './routes/user.routes';
import { catalogRouter } from './routes/catalogs.route';
import { rolPermissionRoute } from './routes/rolPermissions.route';
import { formRouter } from './routes/formBuilder.routes';
import cookieParser from 'cookie-parser';
import { formResponseRouter } from './routes/formResponse.routes';
import { imagesCatalog } from './routes/imageCatalog.routes';
import path from 'path';
import syncRouter from './routes/sync.routes';


export function createServer(): Application {
  validateEnv();
  const app: Application = express();

  // MIDDLEWARE DE SEGURIDAD
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: [
            "'self'",
            "'data:'",
            'https:',
            ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : [])
          ],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    })
  );

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(',') || ['https://localhost:4200'],
      credentials: true,
      optionsSuccessStatus: 200,
    })
  );
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

  // LIMITAR PETICIONES
  // const limiter = rateLimit({
  //   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), //15 MINUTOS
  //   max: parseInt(process.env.RATE_LIMIT_MAX_REQUEST || '100'),
  //   message: {
  //     error: 'Demasiados intentos desde esta IP, por favor intenta más tarde.',
  //   },
  //   standardHeaders: true,
  //   legacyHeaders: false,
  // });

  // app.use(limiter);
  // Límite estricto solo para auth (prevenir fuerza bruta)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 20,
    message: { error: 'Demasiados intentos de login, por favor intenta más tarde.' }
  });

  // Límite normal para API general
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 500,
    message: { error: 'Demasiadas peticiones, por favor intenta más tarde.' }
  });

  // Límite alto para catálogos y formularios (muchas peticiones al cargar)
  const catalogLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { error: 'Demasiadas peticiones a catálogos.' }
  });

  //MIDDLEWARE GENERAL
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use(
    morgan('combined', {
      stream: {
        write: (message: string) => logger.info(message.trim()),
      },
    })
  );
  // TODO IMPLEMENTAR HEAL RUTAS
  // app.use('/health', healR)

  // API Routes
  const apiPrefix = process.env.API_PREFIX || '/api';
  const apiVersion = process.env.API_VERSION || 'v1';
  app.use(`${apiPrefix}/${apiVersion}/auth`, authLimiter, authRouter);
  app.use(`${apiPrefix}/${apiVersion}/user`, apiLimiter, userRoutes);
  app.use(`${apiPrefix}/${apiVersion}/catalogs`, catalogLimiter, catalogRouter);
  app.use(`${apiPrefix}/${apiVersion}/rol`, apiLimiter, rolPermissionRoute);
  app.use(`${apiPrefix}/${apiVersion}/formBuilder`, apiLimiter, formRouter);
  app.use(`${apiPrefix}/${apiVersion}/form-responses`, apiLimiter, formResponseRouter);
  app.use(`${apiPrefix}/${apiVersion}/image-catalog`, apiLimiter, imagesCatalog);
  app.use(`${apiPrefix}/${apiVersion}/sync`, apiLimiter, syncRouter);
  




  app.get('/', (_: Request, res: Response) => {
    res.json({
      message: 'Backend API is running',
      version: '1.0.0',
      ENVIRONMENT: process.env.NODE_ENV,
    });
  });

  // TODO IMPLEMENTAR
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
