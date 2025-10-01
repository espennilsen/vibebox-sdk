# Performance Testing Quick Start

Get started with VibeBox performance testing in under 5 minutes.

## Prerequisites

Install k6:
```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

## 1. Start VibeBox

```bash
# From project root
npm run docker:up
npm run dev
```

Verify API is running:
```bash
curl http://localhost:3000/health
```

## 2. Run Smoke Test

Quick validation (5 minutes):

```bash
cd tests/performance
./scripts/run-all.sh smoke
```

Or run individual tests:

```bash
# API endpoints
npm run test:api

# Dashboard queries
npm run test:dashboard

# Environment lifecycle
npm run test:environment

# WebSocket streaming
npm run test:websocket
```

## 3. View Results

```bash
# Show latest report
npm run report

# Or manually
cat results/report_smoke_*.md
```

## Common Test Scenarios

### Smoke Test (5 min)
Verify everything works:
```bash
npm run test:smoke
```

### Load Test (35 min)
Normal load - 100 users:
```bash
npm run test:load
```

### Stress Test (30 min)
Find breaking point - 500 users:
```bash
npm run test:stress
```

### Spike Test (10 min)
Sudden traffic spike:
```bash
npm run test:spike
```

## What Gets Tested

✓ **API Performance**
- CRUD operations < 1s
- Authentication flows
- Error handling

✓ **Dashboard Queries**
- Load time < 200ms p95
- Project/environment lists
- User profile

✓ **Environment Lifecycle**
- Start < 2s p95
- Stop, restart, delete
- Concurrent operations

✓ **WebSocket Streaming**
- Connection stability
- Message latency < 100ms
- Log streaming
- Terminal access

## Expected Results

**Passing thresholds:**
- `http_req_duration p(95)` < 1000ms
- `dashboard_load_time p(95)` < 200ms
- `environment_start_time p(95)` < 2000ms
- `ws_message_latency p(95)` < 100ms
- `http_req_failed` < 1%
- `checks` > 95%

## Troubleshooting

### API not responding
```bash
# Check if services are running
docker ps
curl http://localhost:3000/health
```

### k6 not found
```bash
# Install k6 (see Prerequisites above)
k6 version
```

### Tests failing
```bash
# Run with verbose output
k6 run --verbose --env SCENARIO=smoke scenarios/api-load.test.js

# Check API logs
npm run logs

# Reduce load
BASE_URL=http://localhost:3000 TEST_USERS=5 ./scripts/run-all.sh smoke
```

## Custom Configuration

```bash
# Test against different environment
BASE_URL=https://staging.vibebox.com ./scripts/run-all.sh smoke

# More test users
TEST_USERS=20 ./scripts/run-all.sh load

# Adjust think time (user delay between actions)
THINK_TIME_MIN=2 THINK_TIME_MAX=10 ./scripts/run-all.sh load
```

## Next Steps

1. ✓ Run smoke test to verify setup
2. Review [README.md](./README.md) for detailed documentation
3. Check results in `results/` directory
4. Compare metrics with performance goals
5. Run load tests to establish baselines
6. Integrate into CI/CD pipeline

## Need Help?

- **Documentation:** [README.md](./README.md)
- **k6 Docs:** https://k6.io/docs/
- **API Reference:** [../../.claude/api_reference.md](../../.claude/api_reference.md)
- **Performance Goals:** [../../specs/001-develop-vibecode-a/plan.md](../../specs/001-develop-vibecode-a/plan.md)

---

**Time to first test:** < 5 minutes
**Time to full suite:** ~35 minutes (load test)
