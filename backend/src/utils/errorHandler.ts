import { Request, Response, NextFunction } from 'express';
import { AppError } from './appError';
import { Prisma } from '@prisma/client';

export const errorHandler = (error: Error, __: Request, res: Response, ___: NextFunction): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details: any = undefined;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    details = error.details;
  }

  // Errores de Prisma
  else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaError = handlePrismaError(error);
    statusCode = prismaError.statusCode;
    message = prismaError.message;
    details = prismaError.details;
  }
  // Errores de validación de Prisma
  else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Invalid data provided';
    details = process.env.NODE_ENV === 'development' ? error.message : undefined;
  }
  // Errores de conexión de Prisma
  else if (error instanceof Prisma.PrismaClientInitializationError) {
    statusCode = 500;
    message = 'Database connection error';
    details = process.env.NODE_ENV === 'development' ? error.message : undefined;
  }
  // Error de sintaxis JSON
  else if (error instanceof SyntaxError && 'body' in error) {
    statusCode = 400;
    message = 'Invalid JSON format';
  } // Otros errores
  else {
    statusCode = 500;
    message = process.env.NODE_ENV === 'development' ? error.message : 'Internal Server Error';
  }

  // Respuesta de error
  const errorResponse: any = {
    success: false,
    error: {
      message,
      statusCode,
    },
  };

  // Incluir detalles adicionales en desarrollo
  if (process.env.NODE_ENV === 'development' && details) {
    errorResponse.error.details = details;
  }

  // Incluir stack trace solo en desarrollo
  if (process.env.NODE_ENV === 'development' && error.stack) {
    errorResponse.error.stack = error.stack;
  }

  res.status(statusCode).json(errorResponse);
};

function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): {
  statusCode: number;
  message: string;
  details?: any;
} {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      const target = error.meta?.target as string[] | undefined;
      return {
        statusCode: 409,
        message: `Duplicate value for ${target?.join(', ') || 'unique field'}`,
        details: process.env.NODE_ENV === 'development' ? error.meta : undefined,
      };

    case 'P2025':
      // Record not found
      return {
        statusCode: 404,
        message: 'Record not found',
        details: process.env.NODE_ENV === 'development' ? error.meta : undefined,
      };

    case 'P2003':
      // Foreign key constraint violation
      return {
        statusCode: 400,
        message: 'Invalid reference to related record',
        details: process.env.NODE_ENV === 'development' ? error.meta : undefined,
      };

    case 'P2004':
      // Constraint violation
      return {
        statusCode: 400,
        message: 'Database constraint violation',
        details: process.env.NODE_ENV === 'development' ? error.meta : undefined,
      };

    default:
      return {
        statusCode: 500,
        message: 'Database operation failed',
        details: process.env.NODE_ENV === 'development' ? error.meta : undefined,
      };
  }
}
