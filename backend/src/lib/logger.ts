/**
 * Logger - Task T011
 * Centralized logger using Pino
 */
import pino from 'pino';
import { loggerConfig } from './logger.config';

export const logger = pino(loggerConfig);

/**
 * Create a child logger with additional context
 * @param context - Additional context to add to all log messages
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

export default logger;
