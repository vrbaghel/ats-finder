import winston from 'winston';

/**
 * Winston logger configuration.
 * 
 * - level: 'info' (logs everything from info level upwards)
 * - format: Timestamps and custom string format
 * - transports: 
 *   - logs/error.log: Only errors for quick debugging
 *   - logs/combined.log: All logs (info, warn, error)
 *   - console: For real-time monitoring in terminal
 */
export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}]: ${message}`)
  ),
  transports: [
    // Error only log file
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // Combined log file
    new winston.transports.File({ filename: 'logs/combined.log' }),
    // Console output
    new winston.transports.Console()
  ],
});
