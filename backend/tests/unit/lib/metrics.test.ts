/**
 * Metrics Tests
 * Comprehensive tests for Prometheus metrics collection
 * Task: GitHub Issue #7 - Performance Monitoring
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import client from 'prom-client';
import {
  httpRequestDuration,
  httpRequestCounter,
  activeConnections,
  wsConnections,
  wsMessages,
  environmentCount,
  dockerOperations,
  dockerOperationDuration,
  dbQueryDuration,
  dbConnectionPoolSize,
  apiErrors,
  authAttempts,
  logEntries,
  sessionCount,
  extensionInstallations,
  getMetrics,
  getContentType,
  trackDockerOperation,
  trackDbQuery,
  updateEnvironmentMetrics,
  updateSessionMetrics,
  trackWebSocketConnection,
  trackWebSocketMessage,
  register,
} from '@/lib/metrics';

describe('Metrics', () => {
  beforeEach(() => {
    // Clear all metrics before each test
    register.resetMetrics();
  });

  afterEach(() => {
    // Clean up after each test
    register.resetMetrics();
  });

  describe('Metric Instances', () => {
    it('should create HTTP request duration histogram', () => {
      expect(httpRequestDuration).toBeInstanceOf(client.Histogram);
    });

    it('should create HTTP request counter', () => {
      expect(httpRequestCounter).toBeInstanceOf(client.Counter);
    });

    it('should create active connections gauge', () => {
      expect(activeConnections).toBeInstanceOf(client.Gauge);
    });

    it('should create WebSocket connections gauge', () => {
      expect(wsConnections).toBeInstanceOf(client.Gauge);
    });

    it('should create WebSocket messages counter', () => {
      expect(wsMessages).toBeInstanceOf(client.Counter);
    });

    it('should create environment count gauge', () => {
      expect(environmentCount).toBeInstanceOf(client.Gauge);
    });

    it('should create Docker operations counter', () => {
      expect(dockerOperations).toBeInstanceOf(client.Counter);
    });

    it('should create Docker operation duration histogram', () => {
      expect(dockerOperationDuration).toBeInstanceOf(client.Histogram);
    });

    it('should create database query duration histogram', () => {
      expect(dbQueryDuration).toBeInstanceOf(client.Histogram);
    });

    it('should create database connection pool gauge', () => {
      expect(dbConnectionPoolSize).toBeInstanceOf(client.Gauge);
    });

    it('should create API errors counter', () => {
      expect(apiErrors).toBeInstanceOf(client.Counter);
    });

    it('should create auth attempts counter', () => {
      expect(authAttempts).toBeInstanceOf(client.Counter);
    });

    it('should create log entries counter', () => {
      expect(logEntries).toBeInstanceOf(client.Counter);
    });

    it('should create session count gauge', () => {
      expect(sessionCount).toBeInstanceOf(client.Gauge);
    });

    it('should create extension installations counter', () => {
      expect(extensionInstallations).toBeInstanceOf(client.Counter);
    });
  });

  describe('HTTP Request Metrics', () => {
    it('should track HTTP request duration with correct labels', async () => {
      httpRequestDuration.observe(
        { method: 'GET', route: '/api/v1/users', status_code: '200' },
        0.5
      );

      const metrics = await getMetrics();
      expect(metrics).toContain('vibebox_http_request_duration_seconds');
      expect(metrics).toContain('method="GET"');
      expect(metrics).toContain('route="/api/v1/users"');
      expect(metrics).toContain('status_code="200"');
    });

    it('should use correct histogram buckets [0.1, 0.5, 1, 2, 5, 10]', async () => {
      httpRequestDuration.observe(
        { method: 'POST', route: '/api/v1/environments', status_code: '201' },
        0.3
      );

      const metrics = await getMetrics();
      expect(metrics).toContain('le="0.1"');
      expect(metrics).toContain('le="0.5"');
      expect(metrics).toContain('le="1"');
      expect(metrics).toContain('le="2"');
      expect(metrics).toContain('le="5"');
      expect(metrics).toContain('le="10"');
    });

    it('should increment HTTP request counter', async () => {
      httpRequestCounter.inc({ method: 'GET', route: '/api/v1/health', status_code: '200' });
      httpRequestCounter.inc({ method: 'GET', route: '/api/v1/health', status_code: '200' });

      const metrics = await getMetrics();
      expect(metrics).toContain('vibebox_http_requests_total');
      expect(metrics).toMatch(/vibebox_http_requests_total.*2/);
    });

    it('should track active connections', async () => {
      activeConnections.inc();
      activeConnections.inc();
      activeConnections.dec();

      const metrics = await getMetrics();
      expect(metrics).toContain('vibebox_active_connections');
      expect(metrics).toMatch(/vibebox_active_connections\s+1/);
    });
  });

  describe('WebSocket Metrics', () => {
    it('should track WebSocket connections', async () => {
      trackWebSocketConnection(1);
      trackWebSocketConnection(1);
      trackWebSocketConnection(-1);

      const metrics = await getMetrics();
      expect(metrics).toContain('vibebox_websocket_connections');
      // Should be 1 (incremented twice, decremented once)
      expect(metrics).toMatch(/vibebox_websocket_connections\s+1/);
    });

    it('should track WebSocket messages sent', async () => {
      trackWebSocketMessage('sent', 'log');
      trackWebSocketMessage('sent', 'terminal');

      const metrics = await getMetrics();
      expect(metrics).toContain('vibebox_websocket_messages_total');
      expect(metrics).toContain('direction="sent"');
      expect(metrics).toContain('type="log"');
      expect(metrics).toContain('type="terminal"');
    });

    it('should track WebSocket messages received', async () => {
      trackWebSocketMessage('received', 'command');

      const metrics = await getMetrics();
      expect(metrics).toContain('vibebox_websocket_messages_total');
      expect(metrics).toContain('direction="received"');
      expect(metrics).toContain('type="command"');
    });
  });

  describe('Docker Metrics', () => {
    it('should track Docker operations with status', async () => {
      trackDockerOperation('start', 'success', 2.5);

      const metrics = await getMetrics();
      expect(metrics).toContain('vibebox_docker_operations_total');
      expect(metrics).toContain('operation="start"');
      expect(metrics).toContain('status="success"');
    });

    it('should track Docker operation failures', async () => {
      trackDockerOperation('stop', 'failure', 1.0);

      const metrics = await getMetrics();
      expect(metrics).toContain('operation="stop"');
      expect(metrics).toContain('status="failure"');
    });

    it('should track Docker operation duration', async () => {
      trackDockerOperation('create', 'success', 3.2);

      const metrics = await getMetrics();
      expect(metrics).toContain('vibebox_docker_operation_duration_seconds');
      expect(metrics).toContain('operation="create"');
    });

    it('should handle Docker operations without duration', async () => {
      trackDockerOperation('inspect', 'success');

      const metrics = await getMetrics();
      expect(metrics).toContain('vibebox_docker_operations_total');
      expect(metrics).toContain('operation="inspect"');
    });
  });

  describe('Database Metrics', () => {
    it('should track database query duration', async () => {
      trackDbQuery('findMany', 'user', 0.05);

      const metrics = await getMetrics();
      expect(metrics).toContain('vibebox_db_query_duration_seconds');
      expect(metrics).toContain('operation="findMany"');
      expect(metrics).toContain('model="user"');
    });

    it('should track different database operations', async () => {
      trackDbQuery('create', 'environment', 0.1);
      trackDbQuery('update', 'project', 0.08);
      trackDbQuery('delete', 'session', 0.03);

      const metrics = await getMetrics();
      expect(metrics).toContain('operation="create"');
      expect(metrics).toContain('operation="update"');
      expect(metrics).toContain('operation="delete"');
    });
  });

  describe('Error Metrics', () => {
    it('should track API errors with route and status code', async () => {
      apiErrors.inc({ type: 'client_error', route: '/api/v1/users', status_code: '404' });

      const metrics = await getMetrics();
      expect(metrics).toContain('vibebox_api_errors_total');
      expect(metrics).toContain('type="client_error"');
      expect(metrics).toContain('status_code="404"');
    });

    it('should track server errors', async () => {
      apiErrors.inc({ type: 'server_error', route: '/api/v1/environments', status_code: '500' });

      const metrics = await getMetrics();
      expect(metrics).toContain('type="server_error"');
      expect(metrics).toContain('status_code="500"');
    });
  });

  describe('Environment Metrics', () => {
    it('should update environment counts by status', async () => {
      updateEnvironmentMetrics({
        running: 5,
        stopped: 3,
        error: 1,
      });

      const metrics = await getMetrics();
      expect(metrics).toContain('vibebox_environments_total');
      expect(metrics).toContain('status="running"');
      expect(metrics).toContain('status="stopped"');
      expect(metrics).toContain('status="error"');
    });

    it('should reset environment counts before updating', async () => {
      updateEnvironmentMetrics({ running: 5 });
      updateEnvironmentMetrics({ running: 3 });

      const metrics = await getMetrics();
      // Should have the new count, not cumulative
      expect(metrics).toMatch(/vibebox_environments_total\{status="running"\}\s+3/);
    });
  });

  describe('Session Metrics', () => {
    it('should update session counts by type and status', async () => {
      updateSessionMetrics({
        'vscode_server:active': 3,
        'tmux:active': 5,
        'shell:idle': 2,
      });

      const metrics = await getMetrics();
      expect(metrics).toContain('vibebox_sessions_total');
      expect(metrics).toContain('type="vscode_server"');
      expect(metrics).toContain('type="tmux"');
      expect(metrics).toContain('type="shell"');
    });
  });

  describe('Authentication Metrics', () => {
    it('should track authentication attempts', async () => {
      authAttempts.inc({ method: 'password', status: 'success' });
      authAttempts.inc({ method: 'oauth', status: 'failure' });

      const metrics = await getMetrics();
      expect(metrics).toContain('vibebox_auth_attempts_total');
      expect(metrics).toContain('method="password"');
      expect(metrics).toContain('method="oauth"');
      expect(metrics).toContain('status="success"');
      expect(metrics).toContain('status="failure"');
    });
  });

  describe('Log Metrics', () => {
    it('should track log entries by stream', async () => {
      logEntries.inc({ stream: 'stdout', environment_id: 'env-123' });
      logEntries.inc({ stream: 'stderr', environment_id: 'env-456' });

      const metrics = await getMetrics();
      expect(metrics).toContain('vibebox_log_entries_total');
      expect(metrics).toContain('stream="stdout"');
      expect(metrics).toContain('stream="stderr"');
    });
  });

  describe('Extension Metrics', () => {
    it('should track extension installations', async () => {
      extensionInstallations.inc({ extension_id: 'ms-python.python', status: 'success' });
      extensionInstallations.inc({ extension_id: 'dbaeumer.vscode-eslint', status: 'failure' });

      const metrics = await getMetrics();
      expect(metrics).toContain('vibebox_extension_installations_total');
      expect(metrics).toContain('extension_id="ms-python.python"');
      expect(metrics).toContain('status="success"');
      expect(metrics).toContain('status="failure"');
    });
  });

  describe('Metrics Export', () => {
    it('should export metrics in Prometheus format', async () => {
      httpRequestCounter.inc({ method: 'GET', route: '/test', status_code: '200' });

      const metrics = await getMetrics();
      expect(metrics).toBeTruthy();
      expect(typeof metrics).toBe('string');
      expect(metrics).toContain('# HELP');
      expect(metrics).toContain('# TYPE');
    });

    it('should return correct content type', () => {
      const contentType = getContentType();
      expect(contentType).toBe(register.contentType);
      expect(contentType).toContain('text/plain');
    });

    it('should include default metrics', async () => {
      const metrics = await getMetrics();
      expect(metrics).toContain('vibebox_nodejs_');
      expect(metrics).toContain('process_cpu_');
      expect(metrics).toContain('process_heap_');
    });
  });

  describe('Metric Labels', () => {
    it('should track metrics with multiple label combinations', async () => {
      httpRequestCounter.inc({ method: 'GET', route: '/api/v1/users', status_code: '200' });
      httpRequestCounter.inc({ method: 'POST', route: '/api/v1/users', status_code: '201' });
      httpRequestCounter.inc({ method: 'GET', route: '/api/v1/teams', status_code: '200' });

      const metrics = await getMetrics();
      expect(metrics).toContain('method="GET"');
      expect(metrics).toContain('method="POST"');
      expect(metrics).toContain('route="/api/v1/users"');
      expect(metrics).toContain('route="/api/v1/teams"');
      expect(metrics).toContain('status_code="200"');
      expect(metrics).toContain('status_code="201"');
    });
  });

  describe('Memory Usage', () => {
    it('should track connection pool size', async () => {
      dbConnectionPoolSize.set({ state: 'active' }, 10);
      dbConnectionPoolSize.set({ state: 'idle' }, 5);

      const metrics = await getMetrics();
      expect(metrics).toContain('vibebox_db_connection_pool_size');
      expect(metrics).toContain('state="active"');
      expect(metrics).toContain('state="idle"');
    });
  });
});
