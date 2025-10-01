# VibeBox Monitoring - Quick Reference Card

## Access URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Grafana | http://localhost:3001 | admin / admin |
| Prometheus | http://localhost:9090 | None |
| Backend Metrics | http://localhost:3000/health/metrics | None |
| Health Check | http://localhost:3000/health | None |
| Readiness Probe | http://localhost:3000/health/ready | None |
| Liveness Probe | http://localhost:3000/health/live | None |

---

## Docker Commands

```bash
# Start all services
npm run docker:up

# Start monitoring only
docker-compose up prometheus grafana -d

# Stop services
docker-compose down

# View logs
docker logs vibebox-prometheus
docker logs vibebox-grafana

# Restart monitoring
docker restart vibebox-prometheus vibebox-grafana

# Reset data (removes volumes)
docker-compose down -v
```

---

## Dashboards

1. **VibeBox - Overview**
   - System health, request rates, latency, environments

2. **VibeBox - API Performance**
   - Detailed API metrics, errors, database performance

3. **VibeBox - Environments**
   - Docker operations, sessions, logs

---

## Key Metrics

```promql
# Request rate
sum(rate(vibebox_http_requests_total[5m]))

# P95 latency
histogram_quantile(0.95, rate(vibebox_http_request_duration_seconds_bucket[5m]))

# Error rate
sum(rate(vibebox_api_errors_total[5m]))

# Running environments
vibebox_environments_total{status="running"}

# Active connections
vibebox_active_connections

# DB query duration (p95)
histogram_quantile(0.95, rate(vibebox_db_query_duration_seconds_bucket[5m]))
```

---

## Critical Alerts

| Alert | Threshold | Duration |
|-------|-----------|----------|
| ServiceDown | Backend unreachable | 1m |
| VeryHighAPILatency | p95 > 5s | 2m |
| VeryHighAPIErrorRate | >50 errors/sec | 2m |
| VerySlowDatabaseQueries | p95 > 5s | 2m |
| PossibleBruteForceAttack | >10 failed auth/sec | 2m |

---

## Health Check Examples

```bash
# Basic health
curl http://localhost:3000/health

# Readiness (checks DB + Docker)
curl http://localhost:3000/health/ready

# Liveness
curl http://localhost:3000/health/live

# Metrics
curl http://localhost:3000/health/metrics
```

---

## Kubernetes Integration

```yaml
# Readiness probe
readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5

# Liveness probe
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
```

---

## Troubleshooting

| Issue | Check | Solution |
|-------|-------|----------|
| No metrics in Grafana | Prometheus targets | http://localhost:9090/targets |
| Backend not scraped | Metrics endpoint | curl http://localhost:3000/health/metrics |
| High memory | Retention time | Reduce to 7d in docker-compose.yml |
| Alerts not firing | Alert rules | http://localhost:9090/alerts |

---

## File Locations

| Component | Path |
|-----------|------|
| Metrics library | `/workspace/backend/src/lib/metrics.ts` |
| Health routes | `/workspace/backend/src/api/routes/health.routes.ts` |
| Prometheus config | `/workspace/monitoring/prometheus/prometheus.yml` |
| Alert rules | `/workspace/monitoring/prometheus/alerts.yml` |
| Grafana dashboards | `/workspace/monitoring/grafana/dashboards/` |
| Full documentation | `/workspace/monitoring/README.md` |

---

## Using Metrics in Code

```typescript
// Import metrics
import {
  trackDockerOperation,
  updateEnvironmentMetrics,
  trackDbQuery,
  authAttempts
} from '@/lib/metrics';

// Track Docker operation
const start = Date.now();
try {
  await container.start();
  trackDockerOperation('start', 'success', (Date.now() - start) / 1000);
} catch (error) {
  trackDockerOperation('start', 'failure', (Date.now() - start) / 1000);
}

// Update environment metrics
updateEnvironmentMetrics({
  running: 5,
  stopped: 3,
  error: 1
});

// Track database query
const dbStart = Date.now();
const users = await prisma.user.findMany();
trackDbQuery('findMany', 'user', (Date.now() - dbStart) / 1000);

// Track auth attempts
authAttempts.inc({ method: 'password', status: 'success' });
```

---

## Production Checklist

- [ ] Change Grafana default password
- [ ] Enable HTTPS via reverse proxy
- [ ] Restrict network access to monitoring services
- [ ] Configure Alertmanager for notifications
- [ ] Set up backup schedule
- [ ] Test alert rules
- [ ] Review retention policies
- [ ] Enable authentication on metrics endpoint
- [ ] Monitor disk usage
- [ ] Document runbooks for alerts

---

## Support

- Full docs: `/workspace/monitoring/README.md`
- Implementation summary: `/workspace/monitoring/IMPLEMENTATION_SUMMARY.md`
- Prometheus logs: `docker logs vibebox-prometheus`
- Grafana logs: `docker logs vibebox-grafana`
