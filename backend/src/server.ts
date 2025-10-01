/**
 * Fastify Server
 * Main server setup with plugins, routes, and error handling
 * Task: Phase 3.5 - API Layer
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import { config } from './lib/config';
import { logger } from './lib/logger';
import { errorHandler, notFoundHandler } from './api/middleware/errorHandler';
import { registerRoutes } from './api';

/**
 * Create and configure Fastify server instance
 *
 * @returns Configured Fastify instance
 */
export async function createServer() {
  // Create Fastify instance with logger
  const fastify = Fastify({
    logger: logger as never,
    requestIdLogLabel: 'requestId',
    disableRequestLogging: false,
    trustProxy: true,
  });

  // Register CORS plugin
  await fastify.register(cors, {
    origin: config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Register JWT plugin
  await fastify.register(jwt, {
    secret: config.jwt.secret,
    sign: {
      expiresIn: config.jwt.expiresIn,
    },
  });

  // Register refresh token JWT
  fastify.decorate('jwtRefresh', {
    secret: config.jwt.refreshSecret,
    sign: {
      expiresIn: config.jwt.refreshExpiresIn,
    },
  });

  // Register WebSocket plugin
  await fastify.register(websocket, {
    options: {
      maxPayload: 1048576, // 1MB
      clientTracking: true,
    },
  });

  // Register all routes
  await fastify.register(registerRoutes);

  // Register error handlers
  fastify.setErrorHandler(errorHandler);
  fastify.setNotFoundHandler(notFoundHandler);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    try {
      await fastify.close();
      logger.info('Server closed successfully');
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  return fastify;
}

/**
 * Start the server
 *
 * @param port - Port number to listen on
 * @param host - Host address to bind to
 */
export async function startServer(
  port: number = config.port,
  host: string = config.host
): Promise<void> {
  try {
    const fastify = await createServer();

    await fastify.listen({ port, host });

    logger.info(
      {
        port,
        host,
        nodeEnv: config.nodeEnv,
        routes: fastify.printRoutes(),
      },
      'Server started successfully'
    );

    // Log available routes
    logger.info('Available routes:');
    logger.info('  REST API: /api/v1/*');
    logger.info('  WebSocket: /api/v1/ws/*');
    logger.info('  Health: /health');
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// Start server if run directly
if (require.main === module) {
  void startServer();
}
