import path from 'path';
import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'noleido';
const logFile = process.env.LOG_FILE || 'logs/proble.log';

const logDir = path.dirname(logFile);

const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// FORMATO CONSOLA DE DESARROLLO
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss',
  }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = '\n' + JSON.stringify(meta, null, 2);
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

const transports: winston.transport[] = [];

// Transport para consola
transports.push(
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? customFormat : consoleFormat,
  })
);

// Transport para archivo en producción
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: logFile,
      format: customFormat,
      maxsize: 5242888, //5mb
      maxFiles: 5,
    })
  );

  //Log de errores separado
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: customFormat,
      maxsize: 5242888, //5mb
      maxFiles: 5,
    })
  );
}

export const logger = winston.createLogger({
  level: logLevel,
  format: customFormat,
  transports,
  exitOnError: false,
});

export const logRequest = (req: any, res: any, next: any) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });
  });

  next();
};
