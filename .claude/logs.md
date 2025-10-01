# VibeBox Log Management Guide

> **Task T193**: Log retention, filtering, export, and best practices

## 📋 Overview

VibeBox provides comprehensive log management for development environments with real-time streaming, historical access, and automatic retention policies.

## 📊 Log Sources

Logs are captured from:
- **Container stdout**: Application output
- **Container stderr**: Error messages and warnings
- **Docker events**: Container lifecycle events
- **VibeBox system**: Environment management operations

## 🔴 Real-Time Log Streaming

### Via Web UI

1. Navigate to environment
2. Click "Logs" tab
3. Logs stream automatically when environment is running
4. Auto-scroll to latest (toggle with button)

### Via WebSocket

```javascript
const ws = new WebSocket('ws://localhost:3000/ws/environments/{environmentId}/logs?token={jwt}');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'log') {
    console.log(`[${message.data.stream}] ${message.data.message}`);
  }
};
```

**Message Format**:
```json
{
  "type": "log",
  "data": {
    "id": "log-uuid",
    "timestamp": "2025-10-01T12:00:00.123Z",
    "stream": "stdout",
    "message": "Server started on port 3000"
  }
}
```

## 📜 Historical Logs

### Via Web UI

**View Past Logs**:
1. Go to "Logs" tab (works even if environment stopped)
2. Scroll up to load earlier logs
3. Use date picker to jump to specific time

### Via API

```bash
# Get last 100 lines
curl http://localhost:3000/api/v1/environments/{environmentId}/logs?tail=100 \
  -H "Authorization: Bearer $TOKEN"

# Get logs from specific time range
curl "http://localhost:3000/api/v1/environments/{environmentId}/logs?since=2025-10-01T00:00:00Z&until=2025-10-01T23:59:59Z" \
  -H "Authorization: Bearer $TOKEN"

# Filter by stream
curl "http://localhost:3000/api/v1/environments/{environmentId}/logs?stream=stderr" \
  -H "Authorization: Bearer $TOKEN"
```

## 🔍 Filtering Logs

### By Stream

**stdout** (standard output):
- Application logs
- Info messages
- Normal operation

**stderr** (standard error):
- Error messages
- Warnings
- Stack traces

**UI Filters**:
- All streams (default)
- stdout only
- stderr only

### By Text Search

**In UI**:
- Search box filters displayed logs
- Regex support: `/error|warning/i`
- Case-sensitive toggle

**Via API**: Use client-side filtering on retrieved logs

### By Time Range

**Relative**:
- Last 5 minutes
- Last hour
- Last 24 hours
- Last 7 days

**Absolute**:
- Custom date/time range picker
- ISO 8601 format in API: `2025-10-01T12:00:00Z`

## 💾 Log Retention

### Retention Policy

**Default Settings**:
- **Duration**: 7 days
- **Size Limit**: 20MB per environment
- **Rotation**: FIFO (First In, First Out)

**Behavior**:
- Logs older than 7 days are automatically deleted
- When size limit reached, oldest logs deleted first
- Cleanup runs daily at midnight UTC

### Configuring Retention

**Per Environment** (coming soon):
```bash
# Set custom retention
curl -X PATCH http://localhost:3000/api/v1/environments/{environmentId} \
  -d '{"logRetentionDays": 14, "logSizeLimitMB": 50}'
```

**Global Settings**: Configure in backend environment variables

## 📤 Log Export

### Export Formats

**JSON**:
```json
[
  {
    "timestamp": "2025-10-01T12:00:00.123Z",
    "stream": "stdout",
    "message": "Server started"
  }
]
```

**Plain Text**:
```
2025-10-01T12:00:00.123Z [stdout] Server started
2025-10-01T12:00:01.456Z [stderr] Warning: deprecated API
```

**CSV**:
```csv
timestamp,stream,message
2025-10-01T12:00:00.123Z,stdout,Server started
2025-10-01T12:00:01.456Z,stderr,Warning: deprecated API
```

### Exporting Logs

**Via UI**:
1. Apply desired filters
2. Click "Export" button
3. Select format (JSON/TXT/CSV)
4. Download file

**Via API**:
```bash
# Get logs as JSON
curl "http://localhost:3000/api/v1/environments/{environmentId}/logs?since=2025-10-01T00:00:00Z" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" \
  > logs.json

# Process with jq
curl "..." | jq '.[] | select(.stream == "stderr")'
```

## 🎨 Log Formatting

### Color Coding

**In UI**:
- stdout: Gray/white text
- stderr: Red text
- Timestamps: Muted color
- ANSI colors preserved

### Log Levels

Parse common log level patterns:
- `ERROR`: Red, bold
- `WARN`/`WARNING`: Yellow
- `INFO`: Blue
- `DEBUG`: Gray

### Timestamps

**Formats**:
- ISO 8601: `2025-10-01T12:00:00.123Z`
- Relative: "2 minutes ago"
- Local timezone conversion

## ⚡ Performance Tips

### For High-Volume Logs

**Sampling**: View every Nth log line
**Aggregation**: Group similar messages
**Buffer**: Logs buffered (100ms) before display

### Optimize Logging in Code

```javascript
// ❌ Bad: Log every request
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// ✅ Good: Sample or aggregate
let requestCount = 0;
app.use((req, res, next) => {
  requestCount++;
  if (requestCount % 100 === 0) {
    console.log(`Processed ${requestCount} requests`);
  }
  next();
});
```

## 🐛 Troubleshooting

### Logs Not Appearing

**Possible Causes**:
- Application not writing to stdout/stderr
- Logs buffered (not flushed)
- Environment not running

**Solutions**:
1. Verify app is running: Check environment status
2. Force flush: Use unbuffered output
   ```python
   # Python
   print("message", flush=True)
   ```
   ```javascript
   // Node.js stdout is auto-flushed
   console.log("message");
   ```

### Logs Cut Off

**Cause**: Message exceeds max length (10,000 characters)

**Solution**: Split long messages or increase limit (backend config)

### Missing Historical Logs

**Causes**:
- Logs older than retention period (7 days)
- Logs exceeded size limit (20MB)
- Environment deleted and recreated

**Solution**: Export important logs regularly

## 💡 Best Practices

### Application Logging

**Use Structured Logging**:
```javascript
// ❌ Unstructured
console.log('User login: john@example.com success');

// ✅ Structured (JSON)
console.log(JSON.stringify({
  event: 'user_login',
  user: 'john@example.com',
  status: 'success',
  timestamp: new Date().toISOString()
}));
```

**Log Levels**:
```javascript
const logger = {
  debug: (msg) => process.env.DEBUG && console.log(`[DEBUG] ${msg}`),
  info: (msg) => console.log(`[INFO] ${msg}`),
  warn: (msg) => console.error(`[WARN] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`)
};
```

**Avoid Sensitive Data**:
```javascript
// ❌ Never log passwords, tokens, etc.
console.log(`User login: ${email} password: ${password}`);

// ✅ Log safely
console.log(`User login attempt: ${email}`);
```

### Log Management

1. **Regular Exports**: Export important logs weekly
2. **Monitor Size**: Check log size in environment details
3. **Clean Old Environments**: Delete unused environments and their logs
4. **Use External Logging**: For production, send logs to external service (Datadog, Splunk, etc.)

## 🔗 External Log Aggregation

### Forwarding to External Services

**Via Sidecar Container** (advanced):

```yaml
# docker-compose.yml
services:
  app:
    image: node:20
    logging:
      driver: "fluentd"
      options:
        fluentd-address: "localhost:24224"
        tag: "vibebox.{{.Name}}"
```

**Popular Services**:
- Datadog
- Splunk
- ELK Stack (Elasticsearch, Logstash, Kibana)
- CloudWatch (AWS)
- Stackdriver (GCP)

## 📚 Related Documentation

- **[Quick Start Guide](./quick_start.md)** - Environment setup
- **[API Reference](./api_reference.md)** - Log API endpoints
- **[WebSocket Spec](../specs/001-develop-vibecode-a/contracts/websocket-spec.md)** - Real-time streaming
- **[FAQ](./faq.md)** - Common questions

---

## Quick Reference

### API Endpoints

```bash
# Get logs (last 100 lines)
GET /api/v1/environments/{id}/logs?tail=100

# Get logs in time range
GET /api/v1/environments/{id}/logs?since=<ISO8601>&until=<ISO8601>

# Filter by stream
GET /api/v1/environments/{id}/logs?stream=stdout|stderr|all

# Combine filters
GET /api/v1/environments/{id}/logs?tail=500&stream=stderr&since=2025-10-01T00:00:00Z
```

### WebSocket

```
ws://localhost:3000/ws/environments/{id}/logs?token={jwt}

Messages:
- type: "log" - Log entry
- type: "status" - Connection status
- type: "error" - Error occurred
- type: "end" - Stream ended
```

### Retention

- **Default Duration**: 7 days
- **Default Size**: 20MB per environment
- **Cleanup**: Daily at midnight UTC
- **Policy**: FIFO (oldest deleted first)

---

**Log responsibly, debug efficiently!** 📝
