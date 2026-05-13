import dotenv from 'dotenv';
import { createServer } from './app';
import { connectDatabase } from './config/database';
import { logger } from './config/logger';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

async function startServer(): Promise<void> {
  try {
    await connectDatabase();
    logger.info('Conexión a la base de datos establecida');

    const app = createServer();
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on http://${HOST}:${PORT}`);
    });

    // Manejo graceful de shutdown
    const gracefulShutdown = (signal: string) => {
      console.log(`Received ${signal}, shutting down gracefully`);
      server.close(err => {
        if (err) {
          logger.error('Error during shutdown:', err);
          process.exit(1);
        }
        logger.info('Server closed successfully');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// MANEJO DE ERRORES NO CAPTURADOS
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at: ', promise, 'reason: ', reason);
  process.exit(1);
});

process.on('uncaughtException', error => {
  logger.error('Uncaught Exception: ', error);
  process.exit(1);
});

startServer();
