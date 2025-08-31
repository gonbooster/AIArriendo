import winston from 'winston';
import path from 'path';

const logLevel = process.env.LOG_LEVEL || 'info';
// ELIMINADO: No generar archivos .log
// const logFile = process.env.LOG_FILE || 'logs/app.log';

// Custom format for logs
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      try {
        log += ` ${JSON.stringify(meta, (key, value) => {
          // Handle circular references
          if (typeof value === 'object' && value !== null) {
            if (value.constructor && (value.constructor.name === 'TLSSocket' ||
                value.constructor.name === 'HTTPParser' ||
                value.constructor.name === 'ClientRequest' ||
                value.constructor.name === 'IncomingMessage')) {
              return '[Circular Reference]';
            }
          }
          return value;
        })}`;
      } catch (error) {
        log += ` [Logging Error: Circular Reference]`;
      }
    }
    return log;
  })
);

// Create logger - SOLO CONSOLA, NO ARCHIVOS
export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { service: 'ai-arriendo' },
  transports: [
    // ELIMINADO: File transports para no generar archivos .log
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Create specialized loggers for different components
export const scrapingLogger = logger.child({ component: 'scraping' });
export const apiLogger = logger.child({ component: 'api' });
export const dbLogger = logger.child({ component: 'database' });
export const queueLogger = logger.child({ component: 'queue' });

export default logger;
