import { Request, Response, NextFunction } from 'express';
import { AppError } from './appError';

export const notFound = (req: Request, __: Response, next: NextFunction) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};
