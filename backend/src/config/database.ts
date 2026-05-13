import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

let isDisconnected = false;
declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' }, 
    { level: 'error', emit: 'stdout' },
    { level: 'info', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
});

if (process.env.NODE_ENV != 'production') {
  globalThis.__prisma = prisma;
}

if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e: any) => {
    logger.debug(`Query: ${e.query}`);
    logger.debug(`Duration: ${e.duration}ms`);
  });
}

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Conexión a la base de datos correctamente');
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Prueba a la base de datos correcta');
  } catch (error) {
    logger.error('Error al conectarse a la base de datos: ', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (isDisconnected) return; // 🔒 ya desconectado

  try {
    await prisma.$disconnect();
    logger.info('Base de datos desconectada');
    isDisconnected = true; // marcar como desconectado
  } catch (error) {
    logger.error('Error al desconectarse de la base de datos: ', error);
    throw error;
  }
}

process.on('SIGINT', async () => {
  logger.info('SIGINT recibido, cerrando la base de datos...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM recibido, cerrando la base de datos...');
  await disconnectDatabase();
  process.exit(0);
});
