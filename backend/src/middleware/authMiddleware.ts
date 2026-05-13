import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequestInterface, JWTPayloadInterface } from '@/interface/authInterface';
import { AppError } from '@/utils/appError';
import { logger } from '@/config/logger';

export const authenticateToken = (
  req: AuthenticatedRequestInterface,
  __: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      throw new AppError('El acceso requiere token', 401);
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET no configurado');
      throw new AppError('Server configuration error', 500);
    }

    const decoded = jwt.verify(token, jwtSecret);
    if (typeof decoded !== 'string' && 'userId' in decoded) {
      const payload = decoded as unknown as JWTPayloadInterface;

      req.user = {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
      };

      logger.debug('Token authenticated successfully', {
        userId: decoded.userId,
        email: decoded.email,
      });
      next();
    } else {
      throw new Error('Token inválido o mal formado');
    }
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Token expired', 401));
    } else if (error instanceof AppError) {
      next(error);
    } else {
      logger.error('Unexpected error in token authentication:', error);
      next(new AppError('Authentication failed', 401));
    }
  }
};
