/**
 * Fastify Server
 * Main server setup with plugins, routes, and error handling
 * Task: Phase 3.5 - API Layer
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from './lib/config';
import { logger } from './lib/logger';
import { loggerConfig } from './lib/logger.config';
import { errorHandler, notFoundHandler } from './api/middleware/errorHandler';
import { registerRoutes } from './api';
import { getScheduler } from './lib/scheduler';
import { LogCleanupService } from './services/log-cleanup.service';
import { securityHeaders, getAllowedOrigins } from './api/middleware/security';
import { rateLimits } from './api/middleware/rateLimit';

/**
 * Create and configure Fastify server instance
 *
 * @returns Configured Fastify instance
 */
export async function createServer() {
  // Create Fastify instance with logger
  const fastify = Fastify({
    logger: loggerConfig,
    requestIdLogLabel: 'requestId',
    disableRequestLogging: false,
    trustProxy: true,
  });

  // Register CORS plugin with enhanced security
  const allowedOrigins = getAllowedOrigins();
  await fastify.register(cors, {
    origin:
      allowedOrigins.length > 0
        ? (origin, callback) => {
            // Allow requests with no origin (same-origin, mobile apps, etc.)
            if (!origin) {
              callback(null, true);
              return;
            }

            // Check if origin is in the allowed list
            if (allowedOrigins.includes(origin)) {
              callback(null, true);
            } else {
              callback(new Error('Not allowed by CORS'), false);
            }
          }
        : config.frontendUrl, // Fallback to simple origin in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
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

  // Register Swagger for API documentation
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'VibeBox API',
        description: 'Docker-based development environment management API with real-time collaboration, VS Code integration, and comprehensive tooling.',
        version: '1.0.0',
        contact: {
          name: 'VibeBox',
          url: 'https://github.com/yourusername/vibebox',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      servers: [
        {
          url: `http://localhost:${config.port}`,
          description: 'Development server',
        },
      ],
      tags: [
        { name: 'auth', description: 'Authentication endpoints' },
        { name: 'users', description: 'User management' },
        { name: 'teams', description: 'Team management' },
        { name: 'projects', description: 'Project management' },
        { name: 'environments', description: 'Environment management' },
        { name: 'extensions', description: 'VS Code extension management' },
        { name: 'sessions', description: 'Session management' },
        { name: 'logs', description: 'Log management' },
        { name: 'metrics', description: 'Metrics and monitoring' },
        { name: 'api-keys', description: 'API key management' },
        { name: 'git', description: 'Git operations' },
        { name: 'files', description: 'File operations' },
        { name: 'execution', description: 'Code execution' },
        { name: 'health', description: 'Health check endpoints' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token obtained from /api/v1/auth/login or /api/v1/auth/register',
          },
          apiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
            description: 'API key for service-to-service authentication',
          },
        },
      },
    },
  });

  // Register Swagger UI
  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayRequestDuration: true,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  // Apply security headers to all requests
  if (config.security.enableSecurityHeaders) {
    const securityConfig = config.security.cspDirective
      ? { contentSecurityPolicy: config.security.cspDirective }
      : undefined;

    fastify.addHook('onRequest', securityHeaders(securityConfig));
    logger.info('Security headers enabled');
  }

  // Apply global rate limiting per IP
  fastify.addHook('onRequest', rateLimits.perIP);
  logger.info('Global rate limiting enabled: 100 req/min per IP');

  // Register all routes
  await fastify.register(registerRoutes);

  // Register error handlers
  fastify.setErrorHandler(errorHandler);
  fastify.setNotFoundHandler(notFoundHandler);

  // Initialize log cleanup scheduler
  const scheduler = getScheduler();
  const logCleanupService = new LogCleanupService();

  // Make registration idempotent - unregister existing task if present
  if (scheduler.has('log-cleanup')) {
    scheduler.unregister('log-cleanup');
  }

  scheduler.register({
    name: 'log-cleanup',
    schedule: '0 0 * * *', // Daily at midnight
    handler: async () => {
      logger.info('[LogCleanup] Starting scheduled log cleanup...');
      try {
        const stats = await logCleanupService.runCleanup();
        logger.info(
          {
            deletedByAge: stats.deletedByAge,
            deletedBySize: stats.deletedBySize,
            spaceFreedMB: stats.spaceFreedMB,
            durationMs: stats.durationMs,
          },
          '[LogCleanup] Cleanup completed successfully'
        );
      } catch (error) {
        logger.error({ error }, '[LogCleanup] Cleanup failed');
      }
    },
  });

  // Start scheduler
  scheduler.start();
  logger.info('[Scheduler] Log cleanup job scheduled (daily at midnight)');

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    try {
      // Stop scheduler and await completion of all tasks
      await scheduler.stop();
      logger.info('[Scheduler] Stopped all scheduled tasks');

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
    logger.info(`  API Docs: http://${host}:${port}/docs`);
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// Start server if run directly
if (require.main === module) {
  void startServer();
}
