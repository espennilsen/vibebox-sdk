/**
 * Logger Configuration - Task T011
 * Pino logger configuration for structured logging
 */
import type { LoggerOptions } from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

export const loggerConfig: LoggerOptions = {
  level: process.env.LOG_LEVEL || (isTest ? 'silent' : isDevelopment ? 'debug' : 'info'),
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  ...(isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  }),
  redact: {
    paths: ['req.headers.authorization', 'password', 'passwordHash', 'token'],
    remove: true,
  },
};
