# VibeBox Performance Testing Suite

Comprehensive performance and load testing suite for VibeBox using k6.

## Overview

This test suite validates that VibeBox meets its performance requirements under various load conditions. It includes tests for API endpoints, environment lifecycle operations, dashboard queries, and WebSocket streaming.

### Performance Goals

Based on the project requirements from `plan.md`:

| Metric | Target | Test Coverage |
|--------|--------|---------------|
| API CRUD operations | <1s response time | ✓ API Load Test |
| Environment startup | <2s (excluding Docker) | ✓ Environment Lifecycle Test |
| Dashboard queries | <200ms p95 | ✓ Dashboard Query Test |
| WebSocket latency | <100ms | ✓ WebSocket Streaming Test |
| Concurrent environments | 10 per user | ✓ Environment Lifecycle Test |
| Total environments | 1,000+ support | ✓ Stress Tests |

## Prerequisites

### Required

- **k6** - Load testing tool
  - macOS: `brew install k6`
  - Linux: See [k6 installation docs](https://k6.io/docs/getting-started/installation/)
  - Windows: `choco install k6`

- **VibeBox API** - Running instance
  - Default: `http://localhost:3000`
  - Set via `BASE_URL` environment variable

### Optional

- **jq** - JSON processor (for enhanced reporting)
  - macOS: `brew install jq`
  - Linux: `apt install jq` or `yum install jq`

## Quick Start

### 1. Start VibeBox

```bash
# From project root
npm run docker:up
npm run dev
```

Ensure the API is running at `http://localhost:3000`.

### 2. Run Smoke Test

Quick validation that all tests work:

```bash
./tests/performance/scripts/run-all.sh smoke
```

### 3. View Results

```bash
cat tests/performance/results/report_smoke_*.md
```

## Test Scenarios

### Smoke Test
**Purpose:** Verify all endpoints work with minimal load
**Duration:** 2-5 minutes
**Load:** 1 user, minimal iterations
**Use Case:** Pre-deployment validation, CI/CD pipeline

```bash
./tests/performance/scripts/run-all.sh smoke
```

### Load Test
**Purpose:** Validate performance under normal conditions
**Duration:** 30-35 minutes
**Load:** Ramp up to 100 users over 5 minutes, sustain for 10 minutes
**Use Case:** Regular performance validation, baseline metrics

```bash
./tests/performance/scripts/run-all.sh load
```

### Stress Test
**Purpose:** Identify breaking point and maximum capacity
**Duration:** 25-30 minutes
**Load:** Ramp up to 500 users, find system limits
**Use Case:** Capacity planning, bottleneck identification

```bash
./tests/performance/scripts/run-all.sh stress
```

### Spike Test
**Purpose:** Test system elasticity under sudden load spikes
**Duration:** 5-10 minutes
**Load:** Sudden spike from 10 to 200 users
**Use Case:** Validate auto-scaling, cache performance

```bash
./tests/performance/scripts/run-all.sh spike
```

### Soak Test
**Purpose:** Identify memory leaks and stability issues
**Duration:** 1 hour
**Load:** Sustained 50 users
**Use Case:** Pre-production validation, stability testing

```bash
./tests/performance/scripts/run-all.sh soak
```

## Individual Tests

### API Load Test

Tests general API performance across all endpoints.

**File:** `scenarios/api-load.test.js`

**What it tests:**
- User authentication (register, login, refresh token)
- Project CRUD operations
- Environment CRUD operations
- Port and variable management
- Complete user journey simulation

**Run individually:**
```bash
k6 run --env SCENARIO=smoke tests/performance/scenarios/api-load.test.js
k6 run --env SCENARIO=load tests/performance/scenarios/api-load.test.js
```

**Custom metrics:**
- `login_success_rate` - Authentication success rate
- `project_creation_time` - Time to create projects
- `api_error_rate` - Overall API error rate
- `auth_failures` - Authentication failures
- `validation_errors` - Input validation errors

### Dashboard Query Test

Tests dashboard-related queries and data retrieval.

**File:** `scenarios/dashboard-query.test.js`

**What it tests:**
- User profile loading
- Project list retrieval
- Environment list retrieval
- Dashboard refresh operations
- Navigation between views

**Performance target:** <200ms p95 (project requirement)

**Run individually:**
```bash
k6 run --env SCENARIO=smoke tests/performance/scenarios/dashboard-query.test.js
```

**Custom metrics:**
- `dashboard_load_time` - Complete dashboard load time
- `project_list_time` - Time to list projects
- `environment_list_time` - Time to list environments
- `user_profile_time` - Time to load user profile
- `cache_hit_rate` - Estimated cache hit rate
- `slow_queries` - Queries exceeding 500ms

### Environment Lifecycle Test

Tests the complete lifecycle of environments: create → start → stop → restart → delete.

**File:** `scenarios/environment-lifecycle.test.js`

**What it tests:**
- Environment creation
- Environment start (with status polling)
- Environment stop
- Environment restart
- Environment deletion
- Concurrent environment management

**Performance target:** <2s environment startup p95

**Run individually:**
```bash
k6 run --env SCENARIO=smoke tests/performance/scenarios/environment-lifecycle.test.js
```

**Custom metrics:**
- `environment_start_time` - Time to start environment
- `environment_stop_time` - Time to stop environment
- `environment_restart_time` - Time to restart environment
- `environment_creation_time` - Time to create environment
- `environment_delete_time` - Time to delete environment
- `environment_start_success_rate` - Start operation success rate
- `concurrent_environments_per_user` - Number of concurrent environments

### WebSocket Streaming Test

Tests WebSocket connections for real-time log streaming and terminal access.

**File:** `scenarios/websocket-streaming.test.js`

**What it tests:**
- WebSocket connection establishment
- Log streaming (real-time)
- Terminal connections
- Message latency
- Connection stability under load
- Ping/pong latency

**Performance target:** <100ms message latency p95

**Run individually:**
```bash
k6 run --env SCENARIO=smoke tests/performance/scenarios/websocket-streaming.test.js
```

**Custom metrics:**
- `ws_connection_time` - WebSocket connection establishment time
- `ws_message_latency` - First message latency
- `ws_message_rate` - Messages per second
- `ws_ping_latency` - Ping/pong round-trip time
- `ws_connection_success_rate` - Connection success rate
- `ws_messages_received` - Total messages received
- `ws_errors` - WebSocket errors

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BASE_URL` | API base URL | `http://localhost:3000` |
| `SCENARIO` | Test scenario | `smoke` |
| `TEST_USERS` | Number of test users | `10` |
| `THINK_TIME_MIN` | Min think time (seconds) | `1` |
| `THINK_TIME_MAX` | Max think time (seconds) | `5` |

### Example with Custom Configuration

```bash
# Run load test against staging environment
BASE_URL=https://staging.vibebox.com \
TEST_USERS=20 \
THINK_TIME_MIN=2 \
THINK_TIME_MAX=10 \
./tests/performance/scripts/run-all.sh load
```

## Understanding Results

### Key Metrics

**HTTP Request Duration:**
- `p(95)` - 95th percentile (95% of requests complete within this time)
- `p(99)` - 99th percentile
- `max` - Maximum duration observed
- `avg` - Average duration

**Success Rates:**
- `http_req_failed` - Percentage of failed HTTP requests (target: <1%)
- `checks` - Percentage of assertion checks that passed (target: >95%)

**Custom Metrics:**
- See individual test sections above for test-specific metrics

### Thresholds

Tests will FAIL if any threshold is violated:

```javascript
// Example thresholds from k6.config.js
'http_req_duration': ['p(95)<1000', 'p(99)<2000'],
'dashboard_load_time': ['p(95)<200'],
'environment_start_time': ['p(95)<2000'],
'ws_message_latency': ['p(95)<100'],
```

### Reading Reports

Generated reports include:

1. **Summary** - Test execution overview
2. **Performance Targets** - Goal vs. actual comparison
3. **Test Details** - Individual test results and metrics
4. **Files Generated** - Locations of detailed results

Reports are saved to: `tests/performance/results/report_*.md`

## Results Directory Structure

```
tests/performance/results/
├── report_smoke_20251001_120000.md      # Human-readable report
├── api-load-summary.json                # Test-specific summary
├── dashboard-query-summary.json
├── environment-lifecycle-summary.json
├── websocket-streaming-summary.json
└── API_Load_Test_20251001_120000.json   # Raw k6 output
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Performance Tests

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Start VibeBox
        run: |
          npm run docker:up
          npm run dev &
          sleep 30  # Wait for services to be ready

      - name: Run Performance Tests
        run: ./tests/performance/scripts/run-all.sh smoke

      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: tests/performance/results/
```

## Troubleshooting

### Common Issues

**1. Connection Refused**

```
ERRO[0000] failed to connect to API
```

**Solution:** Ensure VibeBox is running:
```bash
curl http://localhost:3000/health
```

**2. k6 Not Found**

```
bash: k6: command not found
```

**Solution:** Install k6 (see Prerequisites section)

**3. Test Timeout**

```
WARN[0120] Test exceeded maximum duration
```

**Solution:** Increase timeout or reduce test duration in scenario configuration

**4. High Error Rate**

```
✗ http_req_failed: rate=0.15 (threshold: rate<0.01)
```

**Solution:**
- Check API logs for errors
- Verify database connectivity
- Check resource limits (CPU, memory)
- Reduce load (lower VU count)

**5. WebSocket Connection Failures**

```
✗ WebSocket connection failed
```

**Solution:**
- Verify WebSocket endpoint is accessible
- Check firewall/proxy settings
- Ensure environment is running before WebSocket test

### Debug Mode

Run individual tests with verbose output:

```bash
k6 run --verbose --env SCENARIO=smoke tests/performance/scenarios/api-load.test.js
```

## Best Practices

### Before Testing

1. **Ensure Clean State** - Reset database if needed
2. **Verify API Health** - Check all services are running
3. **Check Resources** - Ensure adequate CPU/memory available
4. **Baseline Metrics** - Run smoke test first

### During Testing

1. **Monitor Resources** - Watch CPU, memory, disk I/O
2. **Check Logs** - Monitor API logs for errors
3. **Network Activity** - Verify network isn't saturated
4. **Database Performance** - Monitor query performance

### After Testing

1. **Review Thresholds** - Check which thresholds passed/failed
2. **Compare Runs** - Compare with previous test results
3. **Identify Bottlenecks** - Find slow endpoints
4. **Document Findings** - Record insights and action items
5. **Cleanup** - Remove test data if needed

## Performance Optimization Tips

### If Dashboard Queries Are Slow

- Add database indexes on frequently queried fields
- Implement query result caching
- Optimize N+1 query patterns
- Consider pagination for large lists

### If Environment Operations Are Slow

- Use smaller base images (alpine)
- Pre-pull common Docker images
- Optimize container startup scripts
- Consider container pooling

### If WebSocket Latency Is High

- Check network latency between client and server
- Optimize message serialization
- Reduce message size
- Consider message batching

### If API Throughput Is Low

- Enable HTTP/2
- Implement connection pooling
- Add rate limiting with proper quotas
- Scale horizontally (load balancer + multiple instances)

## Advanced Usage

### Custom Test Scenarios

Create custom scenarios in `k6.config.js`:

```javascript
export const scenarios = {
  custom: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 50 },
      { duration: '10m', target: 50 },
      { duration: '1m', target: 0 },
    ],
  },
};
```

### Custom Thresholds

Modify thresholds for specific requirements:

```javascript
export const thresholds = {
  'http_req_duration{endpoint:critical}': ['p(95)<100'],
  'http_req_duration{endpoint:standard}': ['p(95)<500'],
};
```

### Cloud Execution

Run tests from k6 Cloud:

```bash
k6 cloud tests/performance/scenarios/api-load.test.js
```

## Contributing

### Adding New Tests

1. Create test file in `scenarios/`
2. Follow existing test structure
3. Add custom metrics for domain-specific measurements
4. Document in this README
5. Add to `run-all.sh` script

### Test File Template

```javascript
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import testConfig from '../k6.config.js';

export const options = {
  scenarios: {
    smoke: testConfig.scenarios.smoke,
  },
  thresholds: testConfig.thresholds,
};

export function setup() {
  // Setup test data
}

export default function (data) {
  // Main test logic
}

export function teardown(data) {
  // Cleanup
}
```

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Examples](https://k6.io/docs/examples/)
- [Performance Testing Best Practices](https://k6.io/docs/testing-guides/)
- [VibeBox API Reference](../../.claude/api_reference.md)
- [VibeBox Performance Requirements](../../specs/001-develop-vibecode-a/plan.md)

## Support

For issues or questions:

1. Check this README
2. Review k6 documentation
3. Check VibeBox API logs
4. Create an issue in the repository

---

**Version:** 1.0.0
**Last Updated:** 2025-10-01
**Maintainer:** VibeBox Team
