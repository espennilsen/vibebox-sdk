# VibeBox Monitoring Infrastructure

Production-ready monitoring and observability setup using Prometheus and Grafana for the VibeBox platform.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Dashboards](#dashboards)
- [Metrics Reference](#metrics-reference)
- [Alert Rules](#alert-rules)
- [Health Check Endpoints](#health-check-endpoints)
- [Troubleshooting](#troubleshooting)
- [Production Deployment](#production-deployment)
- [Advanced Configuration](#advanced-configuration)

---

## Overview

This monitoring infrastructure provides:

- **Real-time metrics collection** via Prometheus
- **Visual dashboards** via Grafana
- **Production-ready alerting** with configurable thresholds
- **Health check endpoints** for Kubernetes/Docker health probes
- **Comprehensive observability** across API, environments, and infrastructure

### Key Metrics Tracked

- **API Performance**: Request rate, latency percentiles, error rates
- **Environments**: Environment count by status, Docker operations
- **Database**: Query duration, connection pool statistics
- **System Resources**: CPU, memory, event loop lag
- **WebSocket**: Active connection count
- **Authentication**: Login attempts and failure rates

---

## Architecture

```
┌─────────────────┐
│   VibeBox API   │────────┐
│  (Port 3000)    │        │
└─────────────────┘        │
                           │ /health/metrics
                           ▼
                    ┌──────────────┐
                    │  Prometheus  │
                    │ (Port 9090)  │
                    └──────────────┘
                           │
                           │ PromQL Queries
                           ▼
                    ┌──────────────┐
                    │   Grafana    │
                    │ (Port 3001)  │
                    └──────────────┘
```

### Components

1. **prom-client** - Node.js Prometheus client integrated into backend API
2. **Prometheus** - Metrics collection, storage, and alerting
3. **Grafana** - Visualization and dashboard management

---

## Quick Start

### 1. Start Monitoring Stack

```bash
# Start all services including monitoring
npm run docker:up

# Or start monitoring services only
docker-compose up prometheus grafana -d
```

### 2. Access Dashboards

- **Grafana**: http://localhost:3001
  - Default credentials: `admin` / `admin` (change on first login)
- **Prometheus**: http://localhost:9090
- **Metrics Endpoint**: http://localhost:3000/health/metrics

### 3. Pre-loaded Dashboards

Three dashboards are automatically provisioned:

1. **VibeBox - Overview** - System-wide health and performance
2. **VibeBox - API Performance** - Detailed API metrics and latency
3. **VibeBox - Environments** - Docker operations and environment status

---

## Dashboards

### 1. VibeBox Overview Dashboard

**Purpose**: High-level system health and performance monitoring

**Key Panels**:
- Service uptime status
- Total request rate
- Response time percentiles (p50, p90, p95, p99)
- Environment distribution by status
- CPU and memory usage
- Top 10 busiest routes

**Use Case**: Primary dashboard for operations team to monitor system health

**ASCII Visualization**:
```
┌───────────────────────────────────────────────────────────────┐
│ Service Status │ Uptime     │ Req Rate   │ Total Envs        │
│      UP        │  24h 15m   │   250/s    │      42           │
├───────────────────────────────────────────────────────────────┤
│                   Request Rate by Method                      │
│  GET  ████████████████████ 65%                               │
│  POST ████████████ 25%                                        │
│  PUT  ███ 7%                                                  │
│  DEL  ██ 3%                                                   │
├───────────────────────────────────────────────────────────────┤
│            Response Time Percentiles (seconds)                │
│  p50: 0.012s  p90: 0.045s  p95: 0.089s  p99: 0.156s        │
├───────────────────────────────────────────────────────────────┤
│              Environments by Status                           │
│  Running: 28  Stopped: 12  Starting: 1  Error: 1            │
└───────────────────────────────────────────────────────────────┘
```

### 2. API Performance Dashboard

**Purpose**: Detailed API performance analysis and debugging

**Key Panels**:
- Latency percentiles (p50, p95, p99) overall and by route
- Request rate by status code (2xx, 3xx, 4xx, 5xx)
- Error rate by type and route
- Top 10 slowest routes
- Active connections (HTTP + WebSocket)
- Database query performance
- Node.js event loop lag

**Use Case**: Performance tuning and identifying slow endpoints

### 3. Environments Dashboard

**Purpose**: Docker operations and environment lifecycle monitoring

**Key Panels**:
- Environment count by status (running, stopped, starting, error)
- Docker operation rate and duration
- Session count by type (VS Code, tmux, shell)
- Extension installation rate
- Log entry rate by stream (stdout, stderr)

**Use Case**: DevOps team monitoring container orchestration

---

## Metrics Reference

### HTTP Metrics

| Metric | Type | Description | Labels |
|--------|------|-------------|--------|
| `vibebox_http_requests_total` | Counter | Total HTTP requests | method, route, status_code |
| `vibebox_http_request_duration_seconds` | Histogram | Request duration | method, route, status_code |
| `vibebox_active_connections` | Gauge | Active HTTP connections | - |
| `vibebox_api_errors_total` | Counter | Total API errors | type, route, status_code |

### Environment Metrics

| Metric | Type | Description | Labels |
|--------|------|-------------|--------|
| `vibebox_environments_total` | Gauge | Environment count | status |
| `vibebox_docker_operations_total` | Counter | Docker operations | operation, status |
| `vibebox_docker_operation_duration_seconds` | Histogram | Docker op duration | operation |

### Database Metrics

| Metric | Type | Description | Labels |
|--------|------|-------------|--------|
| `vibebox_db_query_duration_seconds` | Histogram | Query duration | operation, model |
| `vibebox_db_connection_pool_size` | Gauge | Connection pool size | state |

### Session Metrics

| Metric | Type | Description | Labels |
|--------|------|-------------|--------|
| `vibebox_sessions_total` | Gauge | Session count | type, status |
| `vibebox_websocket_connections` | Gauge | WebSocket connections | - |

### Authentication Metrics

| Metric | Type | Description | Labels |
|--------|------|-------------|--------|
| `vibebox_auth_attempts_total` | Counter | Auth attempts | method, status |

### System Metrics (Default)

| Metric | Type | Description |
|--------|------|-------------|
| `vibebox_process_cpu_seconds_total` | Counter | CPU time consumed |
| `vibebox_process_resident_memory_bytes` | Gauge | Resident memory size |
| `vibebox_nodejs_heap_size_used_bytes` | Gauge | Heap memory used |
| `vibebox_nodejs_eventloop_lag_seconds` | Gauge | Event loop lag |

---

## Alert Rules

### Configured Alerts

All alerts are defined in `/monitoring/prometheus/alerts.yml`.

#### Critical Alerts

| Alert | Condition | Duration | Action |
|-------|-----------|----------|--------|
| ServiceDown | Backend unreachable | 1m | Page on-call engineer |
| VeryHighAPILatency | p95 > 5s | 2m | Investigate immediately |
| VeryHighAPIErrorRate | >50 errors/sec | 2m | Check logs and database |
| PossibleBruteForceAttack | >10 failed auth/sec | 2m | Block suspicious IPs |

#### Warning Alerts

| Alert | Condition | Duration | Action |
|-------|-----------|----------|--------|
| HighAPILatency | p95 > 1s | 5m | Monitor and optimize |
| HighAPIErrorRate | >10 errors/sec | 5m | Review error logs |
| HighCPUUsage | >80% CPU | 5m | Scale up resources |
| HighMemoryUsage | >90% memory | 5m | Investigate memory leaks |
| SlowDatabaseQueries | p95 > 1s | 5m | Optimize queries |
| HighDockerFailureRate | >10% failures | 5m | Check Docker daemon |

### Alert Configuration

Alerts send notifications to:
- **Alertmanager** (optional, configure separately)
- **Grafana Alerting** (built-in)
- **PagerDuty / Slack / Email** (via Alertmanager)

To configure alerting:

1. Set up Alertmanager (optional):
   ```yaml
   # Add to prometheus.yml
   alerting:
     alertmanagers:
       - static_configs:
           - targets:
             - alertmanager:9093
   ```

2. Or use Grafana alerting directly (recommended for simple setups)

---

## Health Check Endpoints

### GET /health

**Basic health check** - Returns 200 if server is running

```bash
curl http://localhost:3000/health
```

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-01T12:34:56.789Z",
  "uptime": 86400.5
}
```

**Use Case**: Simple uptime monitoring

---

### GET /health/ready

**Readiness probe** - Validates database and Docker connectivity

```bash
curl http://localhost:3000/health/ready
```

**Response (Healthy)**:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-01T12:34:56.789Z",
  "uptime": 86400.5,
  "checks": {
    "database": {
      "status": "up",
      "latency": 12
    },
    "docker": {
      "status": "up"
    }
  }
}
```

**Response (Unhealthy - 503)**:
```json
{
  "status": "unhealthy",
  "timestamp": "2025-10-01T12:34:56.789Z",
  "uptime": 86400.5,
  "checks": {
    "database": {
      "status": "down",
      "error": "Connection timeout"
    },
    "docker": {
      "status": "up"
    }
  }
}
```

**Use Case**: Kubernetes readiness probe, load balancer health checks

**Kubernetes Example**:
```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
```

---

### GET /health/live

**Liveness probe** - Verifies server process is responsive

```bash
curl http://localhost:3000/health/live
```

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-01T12:34:56.789Z",
  "uptime": 86400.5
}
```

**Use Case**: Kubernetes liveness probe (restart on failure)

**Kubernetes Example**:
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
```

---

### GET /health/metrics

**Prometheus metrics endpoint** - Exports all metrics in Prometheus format

```bash
curl http://localhost:3000/health/metrics
```

**Response (excerpt)**:
```
# HELP vibebox_http_requests_total Total number of HTTP requests
# TYPE vibebox_http_requests_total counter
vibebox_http_requests_total{method="GET",route="/api/v1/environments",status_code="200"} 1523

# HELP vibebox_http_request_duration_seconds Duration of HTTP requests in seconds
# TYPE vibebox_http_request_duration_seconds histogram
vibebox_http_request_duration_seconds_bucket{method="GET",route="/api/v1/environments",status_code="200",le="0.005"} 1200
vibebox_http_request_duration_seconds_bucket{method="GET",route="/api/v1/environments",status_code="200",le="0.01"} 1450
...
```

**Use Case**: Prometheus scraping target

---

## Troubleshooting

### Prometheus Not Scraping Metrics

**Symptom**: No data in Grafana dashboards

**Solutions**:

1. **Check Prometheus targets**:
   - Visit http://localhost:9090/targets
   - Ensure `vibebox-backend` target is UP

2. **Check backend metrics endpoint**:
   ```bash
   curl http://localhost:3000/health/metrics
   ```
   Should return metrics in Prometheus format

3. **Verify network connectivity**:
   ```bash
   docker exec vibebox-prometheus ping backend
   ```

4. **Check Prometheus logs**:
   ```bash
   docker logs vibebox-prometheus
   ```

---

### Grafana Dashboards Not Loading

**Symptom**: Empty dashboards or "No data" messages

**Solutions**:

1. **Verify datasource connection**:
   - Go to Configuration → Data Sources
   - Test Prometheus connection
   - Should show "Data source is working"

2. **Check dashboard time range**:
   - Ensure time range has data (default: Last 1 hour)
   - Try "Last 6 hours" if recently deployed

3. **Verify dashboard provisioning**:
   ```bash
   docker logs vibebox-grafana | grep -i dashboard
   ```

4. **Manually re-provision dashboards**:
   - Delete dashboard
   - Restart Grafana: `docker restart vibebox-grafana`

---

### High Memory Usage in Prometheus

**Symptom**: Prometheus container consuming excessive memory

**Solutions**:

1. **Reduce retention time**:
   ```yaml
   # In docker-compose.yml
   command:
     - '--storage.tsdb.retention.time=7d'  # Default: 30d
   ```

2. **Reduce scrape frequency**:
   ```yaml
   # In prometheus.yml
   global:
     scrape_interval: 30s  # Default: 15s
   ```

3. **Add memory limits**:
   ```yaml
   # In docker-compose.yml
   prometheus:
     deploy:
       resources:
         limits:
           memory: 2G
   ```

---

### Alerts Not Firing

**Symptom**: Expected alerts not triggering

**Solutions**:

1. **Check alert rules**:
   - Visit http://localhost:9090/alerts
   - Verify rules are loaded and active

2. **Test alert expressions**:
   - Go to Prometheus → Graph
   - Run alert query manually
   - Example: `up{job="vibebox-backend"} == 0`

3. **Verify alert evaluation**:
   ```bash
   docker logs vibebox-prometheus | grep -i alert
   ```

4. **Check Alertmanager integration** (if configured):
   - Visit http://localhost:9093 (if running)
   - Check Alertmanager logs

---

## Production Deployment

### Security Hardening

#### 1. Change Default Credentials

```bash
# In .env or docker-compose.yml
GRAFANA_ADMIN_USER=your-admin-user
GRAFANA_ADMIN_PASSWORD=strong-secure-password
```

#### 2. Enable HTTPS

```yaml
# Add nginx reverse proxy
nginx:
  image: nginx:alpine
  ports:
    - "443:443"
  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf:ro
    - ./ssl:/etc/nginx/ssl:ro
```

#### 3. Restrict Network Access

```yaml
# Only allow internal network access
prometheus:
  networks:
    - monitoring  # Separate from public network
  expose:
    - "9090"
  # Remove: ports: - "9090:9090"
```

#### 4. Enable Authentication on Metrics Endpoint

```typescript
// In health.routes.ts
fastify.get('/metrics', {
  preHandler: [fastify.authenticate],  // Require JWT
  // ... rest of handler
});
```

---

### Scaling Considerations

#### 1. Prometheus Federation

For multi-datacenter deployments:

```yaml
# Central Prometheus
scrape_configs:
  - job_name: 'federate'
    scrape_interval: 15s
    honor_labels: true
    metrics_path: '/federate'
    params:
      'match[]':
        - '{job="vibebox-backend"}'
    static_configs:
      - targets:
        - 'dc1-prometheus:9090'
        - 'dc2-prometheus:9090'
```

#### 2. Long-term Storage

Use Thanos or Cortex for long-term metric storage:

```yaml
# Thanos sidecar
thanos-sidecar:
  image: thanosio/thanos:v0.32.0
  command:
    - sidecar
    - --tsdb.path=/prometheus
    - --prometheus.url=http://prometheus:9090
    - --objstore.config-file=/etc/thanos/bucket.yml
```

#### 3. High Availability

Run multiple Prometheus instances with identical configuration:

```yaml
prometheus-1:
  image: prom/prometheus:v2.47.0
  # ... config

prometheus-2:
  image: prom/prometheus:v2.47.0
  # ... same config
```

---

### Backup and Disaster Recovery

#### 1. Backup Grafana Dashboards

```bash
# Export all dashboards
docker exec vibebox-grafana grafana-cli admin export-dashboard > dashboards-backup.json

# Or use API
curl -H "Authorization: Bearer $API_KEY" \
  http://localhost:3001/api/search?type=dash-db | \
  jq -r '.[].uid' | \
  xargs -I {} curl -H "Authorization: Bearer $API_KEY" \
    http://localhost:3001/api/dashboards/uid/{} > dashboard-{}.json
```

#### 2. Backup Prometheus Data

```bash
# Create snapshot
docker exec vibebox-prometheus promtool tsdb snapshot /prometheus

# Copy snapshot
docker cp vibebox-prometheus:/prometheus/snapshots/<snapshot-id> ./prometheus-backup
```

#### 3. Automated Backups

```bash
# Add to cron
0 2 * * * /opt/vibebox/scripts/backup-monitoring.sh
```

---

## Advanced Configuration

### Custom Metrics

Add custom metrics to your application:

```typescript
import { Counter } from 'prom-client';

const customMetric = new Counter({
  name: 'vibebox_custom_events_total',
  help: 'Total custom events',
  labelNames: ['event_type'],
  registers: [register],
});

// Track custom events
customMetric.inc({ event_type: 'user_signup' });
```

### Recording Rules

Pre-compute expensive queries:

```yaml
# In prometheus.yml
rule_files:
  - '/etc/prometheus/recording_rules.yml'

# recording_rules.yml
groups:
  - name: api_performance
    interval: 30s
    rules:
      - record: job:http_request_duration_seconds:p95
        expr: histogram_quantile(0.95, sum(rate(vibebox_http_request_duration_seconds_bucket[5m])) by (le, job))
```

### Grafana Annotations

Add deployment markers:

```bash
# On deployment
curl -X POST http://localhost:3001/api/annotations \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Deployed v1.2.3",
    "tags": ["deployment"],
    "time": '$(date +%s000)'
  }'
```

---

## Resources

### Documentation Links

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [prom-client (Node.js)](https://github.com/siimon/prom-client)
- [PromQL Cheat Sheet](https://promlabs.com/promql-cheat-sheet/)

### Example Queries

```promql
# Request rate by route
sum(rate(vibebox_http_requests_total[5m])) by (route)

# Error rate percentage
sum(rate(vibebox_api_errors_total[5m])) / sum(rate(vibebox_http_requests_total[5m])) * 100

# Average response time
rate(vibebox_http_request_duration_seconds_sum[5m]) / rate(vibebox_http_request_duration_seconds_count[5m])

# Environment uptime percentage
avg_over_time(vibebox_environments_total{status="running"}[24h]) / avg_over_time(sum(vibebox_environments_total)[24h]) * 100
```

---

## Support

For monitoring issues or questions:

1. Check [Troubleshooting](#troubleshooting) section
2. Review Prometheus logs: `docker logs vibebox-prometheus`
3. Review Grafana logs: `docker logs vibebox-grafana`
4. Open an issue in the VibeBox repository

---

**Last Updated**: 2025-10-01
**Version**: 1.0.0
