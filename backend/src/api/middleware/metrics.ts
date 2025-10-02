/**
 * Metrics Middleware
 * Automatic metrics collection for HTTP requests and errors
 * Task: GitHub Issue #7 - Performance Monitoring
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import {
  httpRequestDuration,
  httpRequestCounter,
  activeConnections,
  apiErrors,
} from '../../lib/metrics';

/**
 * Request timing storage
 * Uses WeakMap to avoid memory leaks by automatically cleaning up
 * when request objects are garbage collected
 */
const requestTimings = new WeakMap<FastifyRequest, bigint>();

/**
 * Metrics collection middleware for request start
 * Tracks active connections and stores request start time
 *
 * @param request - Fastify request object
 * @param _reply - Fastify reply object
 *
 * @example
 * ```typescript
 * fastify.addHook('onRequest', metricsOnRequest);
 * ```
 */
export function metricsOnRequest(request: FastifyRequest, _reply: FastifyReply): void {
  // Increment active connections counter
  activeConnections.inc();

  // Store request start time for duration calculation
  const startTime = process.hrtime.bigint();
  requestTimings.set(request, startTime);
}

/**
 * Metrics collection middleware for request completion
 * Tracks request duration, counts, and errors
 *
 * @param request - Fastify request object
 * @param reply - Fastify reply object
 *
 * @example
 * ```typescript
 * fastify.addHook('onResponse', metricsOnResponse);
 * ```
 */
export function metricsOnResponse(request: FastifyRequest, reply: FastifyReply): void {
  // Decrement active connections counter
  activeConnections.dec();

  // Calculate request duration
  const startTime = requestTimings.get(request);
  if (!startTime) {
    return; // No start time recorded, skip metrics
  }

  const duration = Number(process.hrtime.bigint() - startTime) / 1e9; // Convert to seconds

  // Normalize route for better metric grouping
  // Use routeOptions.url for registered routes, fallback to request.url
  const route = request.routeOptions?.url || request.url || 'unknown';
  const method = request.method;
  const statusCode = reply.statusCode.toString();

  // Record request duration histogram
  httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);

  // Increment request counter
  httpRequestCounter.inc({ method, route, status_code: statusCode });

  // Track errors (4xx and 5xx responses)
  if (reply.statusCode >= 400) {
    const errorType = reply.statusCode >= 500 ? 'server_error' : 'client_error';
    apiErrors.inc({ type: errorType, route, status_code: statusCode });
  }

  // Clean up timing data to prevent memory leaks
  requestTimings.delete(request);
}

/**
 * Metrics collection middleware for request errors
 * Tracks unhandled errors that occur during request processing
 *
 * @param request - Fastify request object
 * @param _reply - Fastify reply object
 * @param error - Error that occurred
 *
 * @example
 * ```typescript
 * fastify.addHook('onError', metricsOnError);
 * ```
 */
export function metricsOnError(request: FastifyRequest, _reply: FastifyReply, error: Error): void {
  // Track error metrics
  const route = request.routeOptions?.url || request.url || 'unknown';
  const statusCode = 'statusCode' in error ? String(error.statusCode) : '500';

  apiErrors.inc({ type: 'unhandled_error', route, status_code: statusCode });

  // Clean up timing data
  requestTimings.delete(request);
}
