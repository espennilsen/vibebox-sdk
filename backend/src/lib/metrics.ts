/**
 * Prometheus Metrics
 * Comprehensive metrics collection for production monitoring
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import client from 'prom-client';

// Create a custom registry to avoid conflicts
const register = new client.Registry();

// Add default metrics (CPU, memory, event loop lag, etc.)
client.collectDefaultMetrics({
  register,
  prefix: 'vibebox_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

/**
 * HTTP Request Duration Histogram
 * Tracks response time distribution for all HTTP requests
 */
export const httpRequestDuration = new client.Histogram({
  name: 'vibebox_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

/**
 * HTTP Request Counter
 * Counts total number of HTTP requests by method and status code
 */
export const httpRequestCounter = new client.Counter({
  name: 'vibebox_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

/**
 * Active HTTP Connections Gauge
 * Tracks the current number of active HTTP connections
 */
export const activeConnections = new client.Gauge({
  name: 'vibebox_active_connections',
  help: 'Number of active HTTP connections',
  registers: [register],
});

/**
 * WebSocket Connections Gauge
 * Tracks the current number of active WebSocket connections
 */
export const wsConnections = new client.Gauge({
  name: 'vibebox_websocket_connections',
  help: 'Number of active WebSocket connections',
  registers: [register],
});

/**
 * WebSocket Messages Counter
 * Tracks the total number of WebSocket messages sent and received
 */
export const wsMessages = new client.Counter({
  name: 'vibebox_websocket_messages_total',
  help: 'Total number of WebSocket messages',
  labelNames: ['direction', 'type'],
  registers: [register],
});

/**
 * Environment Count Gauge by Status
 * Tracks the number of environments in each status
 */
export const environmentCount = new client.Gauge({
  name: 'vibebox_environments_total',
  help: 'Total number of environments by status',
  labelNames: ['status'],
  registers: [register],
});

/**
 * Docker Operations Counter
 * Tracks Docker container operations (start, stop, create, remove)
 */
export const dockerOperations = new client.Counter({
  name: 'vibebox_docker_operations_total',
  help: 'Total number of Docker operations',
  labelNames: ['operation', 'status'],
  registers: [register],
});

/**
 * Docker Operation Duration Histogram
 * Tracks how long Docker operations take
 */
export const dockerOperationDuration = new client.Histogram({
  name: 'vibebox_docker_operation_duration_seconds',
  help: 'Duration of Docker operations in seconds',
  labelNames: ['operation'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [register],
});

/**
 * Database Query Duration Histogram
 * Tracks database query performance
 */
export const dbQueryDuration = new client.Histogram({
  name: 'vibebox_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'model'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

/**
 * Database Connection Pool Gauge
 * Tracks database connection pool statistics
 */
export const dbConnectionPoolSize = new client.Gauge({
  name: 'vibebox_db_connection_pool_size',
  help: 'Number of connections in the database pool',
  labelNames: ['state'],
  registers: [register],
});

/**
 * API Error Counter
 * Tracks API errors by type and route
 */
export const apiErrors = new client.Counter({
  name: 'vibebox_api_errors_total',
  help: 'Total number of API errors',
  labelNames: ['type', 'route', 'status_code'],
  registers: [register],
});

/**
 * Authentication Attempts Counter
 * Tracks authentication attempts (success/failure)
 */
export const authAttempts = new client.Counter({
  name: 'vibebox_auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['method', 'status'],
  registers: [register],
});

/**
 * Log Entry Counter
 * Tracks log entries by stream and environment
 */
export const logEntries = new client.Counter({
  name: 'vibebox_log_entries_total',
  help: 'Total number of log entries',
  labelNames: ['stream', 'environment_id'],
  registers: [register],
});

/**
 * Session Count Gauge by Type
 * Tracks the number of active sessions by type
 */
export const sessionCount = new client.Gauge({
  name: 'vibebox_sessions_total',
  help: 'Total number of sessions by type',
  labelNames: ['type', 'status'],
  registers: [register],
});

/**
 * Extension Installation Counter
 * Tracks VS Code extension installations
 */
export const extensionInstallations = new client.Counter({
  name: 'vibebox_extension_installations_total',
  help: 'Total number of extension installations',
  labelNames: ['extension_id', 'status'],
  registers: [register],
});

/**
 * Get all metrics in Prometheus format
 *
 * @returns Prometheus metrics string
 *
 * @example
 * ```typescript
 * const metrics = await getMetrics();
 * reply.type('text/plain').send(metrics);
 * ```
 */
export async function getMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Get metrics registry content type
 *
 * @returns Content-Type header value for Prometheus metrics
 */
export function getContentType(): string {
  return register.contentType;
}

/**
 * Fastify plugin to track HTTP metrics
 * Automatically tracks request duration and count for all routes
 *
 * @param fastify - Fastify instance
 *
 * @example
 * ```typescript
 * import { metricsPlugin } from './lib/metrics';
 * await fastify.register(metricsPlugin);
 * ```
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function metricsPlugin(fastify: FastifyInstance): Promise<void> {
  // Store request start times using WeakMap to avoid memory leaks
  const requestTimings = new WeakMap<FastifyRequest, bigint>();

  // Track active connections
  fastify.addHook('onRequest', async (request: FastifyRequest, _reply: FastifyReply) => {
    activeConnections.inc();

    // Store start time for duration calculation
    const startTime = process.hrtime.bigint();
    requestTimings.set(request, startTime);
  });

  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    activeConnections.dec();

    // Calculate request duration
    const startTime = requestTimings.get(request);
    if (startTime) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1e9;

      // Normalize route for better metric grouping
      const route = request.routeOptions?.url || request.url || 'unknown';
      const method = request.method;
      const statusCode = reply.statusCode.toString();

      // Record metrics
      httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
      httpRequestCounter.inc({ method, route, status_code: statusCode });

      // Track errors
      if (reply.statusCode >= 400) {
        const errorType = reply.statusCode >= 500 ? 'server_error' : 'client_error';
        apiErrors.inc({ type: errorType, route, status_code: statusCode });
      }

      // Clean up timing data
      requestTimings.delete(request);
    }
  });
}

/**
 * Track Docker operation metrics
 * Call this function before and after Docker operations
 *
 * @param operation - Docker operation name (start, stop, create, remove)
 * @param status - Operation status (success, failure)
 * @param duration - Operation duration in seconds
 *
 * @example
 * ```typescript
 * const start = Date.now();
 * try {
 *   await container.start();
 *   trackDockerOperation('start', 'success', (Date.now() - start) / 1000);
 * } catch (error) {
 *   trackDockerOperation('start', 'failure', (Date.now() - start) / 1000);
 * }
 * ```
 */
export function trackDockerOperation(
  operation: 'start' | 'stop' | 'create' | 'remove' | 'inspect',
  status: 'success' | 'failure',
  duration?: number
): void {
  dockerOperations.inc({ operation, status });
  if (duration !== undefined) {
    dockerOperationDuration.observe({ operation }, duration);
  }
}

/**
 * Track database query metrics
 * Call this function after database queries
 *
 * @param operation - Database operation (findMany, findUnique, create, update, delete)
 * @param model - Prisma model name
 * @param duration - Query duration in seconds
 *
 * @example
 * ```typescript
 * const start = Date.now();
 * const users = await prisma.user.findMany();
 * trackDbQuery('findMany', 'user', (Date.now() - start) / 1000);
 * ```
 */
export function trackDbQuery(operation: string, model: string, duration: number): void {
  dbQueryDuration.observe({ operation, model }, duration);
}

/**
 * Update environment count metrics
 * Call this function periodically or after environment status changes
 *
 * @param statusCounts - Map of status to count
 *
 * @example
 * ```typescript
 * updateEnvironmentMetrics({
 *   running: 5,
 *   stopped: 3,
 *   error: 1
 * });
 * ```
 */
export function updateEnvironmentMetrics(statusCounts: Record<string, number>): void {
  // Reset all status counts to 0 first
  ['stopped', 'starting', 'running', 'stopping', 'error'].forEach((status) => {
    environmentCount.set({ status }, 0);
  });

  // Update with actual counts
  Object.entries(statusCounts).forEach(([status, count]) => {
    environmentCount.set({ status }, count);
  });
}

/**
 * Update session count metrics
 * Call this function periodically or after session changes
 *
 * @param sessionCounts - Map of type+status to count
 *
 * @example
 * ```typescript
 * updateSessionMetrics({
 *   'vscode_server:active': 3,
 *   'tmux:active': 5,
 *   'shell:idle': 2
 * });
 * ```
 */
export function updateSessionMetrics(sessionCounts: Record<string, number>): void {
  // Parse type:status format and update metrics
  Object.entries(sessionCounts).forEach(([key, count]) => {
    const [type, status] = key.split(':');
    sessionCount.set({ type, status }, count);
  });
}

/**
 * Track WebSocket connection changes
 *
 * @param change - Connection change (+1 for connect, -1 for disconnect)
 *
 * @example
 * ```typescript
 * trackWebSocketConnection(1);  // New connection
 * trackWebSocketConnection(-1); // Connection closed
 * ```
 */
export function trackWebSocketConnection(change: 1 | -1): void {
  if (change === 1) {
    wsConnections.inc();
  } else {
    wsConnections.dec();
  }
}

/**
 * Track WebSocket message metrics
 *
 * @param direction - Message direction ('sent' or 'received')
 * @param type - Message type (e.g., 'log', 'terminal', 'status')
 *
 * @example
 * ```typescript
 * trackWebSocketMessage('sent', 'log');
 * trackWebSocketMessage('received', 'terminal');
 * ```
 */
export function trackWebSocketMessage(direction: 'sent' | 'received', type: string): void {
  wsMessages.inc({ direction, type });
}

// Export the registry for testing
export { register };
