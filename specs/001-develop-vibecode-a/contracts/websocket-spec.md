# WebSocket API Specification

**Feature**: VibeCode Real-time Communication
**Protocol**: WebSocket
**Base URL**: `ws://localhost:3000` (dev), `wss://api.vibecode.dev` (prod)

## Authentication

All WebSocket connections require authentication via JWT token passed as query parameter:

```
ws://localhost:3000/ws?token=<JWT_ACCESS_TOKEN>
```

Connection will be rejected with 401 if token is invalid or expired.

---

## Log Streaming

### Endpoint
```
/ws/environments/{environmentId}/logs
```

### Connection Flow
1. Client connects with authentication token
2. Server sends historical logs (last 100 lines) as initial load
3. Server streams new logs in real-time as they are emitted
4. Client can send control messages to filter or pause stream

### Server → Client Messages

#### Log Entry Message
```json
{
  "type": "log",
  "data": {
    "id": "uuid",
    "timestamp": "2025-09-30T12:34:56.789Z",
    "stream": "stdout" | "stderr",
    "message": "log line content"
  }
}
```

#### Status Message
```json
{
  "type": "status",
  "data": {
    "connected": true,
    "environmentStatus": "running" | "stopped" | "error",
    "streamingFrom": "2025-09-30T12:00:00.000Z"
  }
}
```

#### Error Message
```json
{
  "type": "error",
  "data": {
    "code": "ENVIRONMENT_STOPPED" | "PERMISSION_DENIED" | "RATE_LIMIT",
    "message": "Human-readable error message"
  }
}
```

#### End of Stream Message
```json
{
  "type": "end",
  "data": {
    "reason": "environment_stopped" | "client_disconnect" | "error",
    "finalTimestamp": "2025-09-30T13:00:00.000Z"
  }
}
```

### Client → Server Messages

#### Control Messages
```json
{
  "type": "control",
  "action": "pause" | "resume" | "filter",
  "params": {
    "stream": "stdout" | "stderr" | "all"
  }
}
```

#### Acknowledgment Message
```json
{
  "type": "ack",
  "lastLogId": "uuid"
}
```

### Error Codes
- `ENVIRONMENT_NOT_FOUND`: Environment ID does not exist
- `ENVIRONMENT_STOPPED`: Cannot stream logs from stopped environment
- `PERMISSION_DENIED`: User lacks permission to view logs
- `RATE_LIMIT`: Too many connections or messages
- `INVALID_MESSAGE`: Malformed client message

### Connection Limits
- Max concurrent connections per environment: 50
- Max concurrent connections per user: 100
- Message rate limit: 1000 messages/second per connection
- Idle timeout: 5 minutes (ping/pong keepalive)

---

## Terminal (PTY) Connection

### Endpoint
```
/ws/environments/{environmentId}/terminal
```

### Connection Flow
1. Client connects with authentication token
2. Server creates or attaches to shell session in container
3. Bidirectional raw terminal data stream (xterm.js compatible)
4. Connection persists until client disconnects or environment stops

### Server → Client Messages

#### Terminal Data
```json
{
  "type": "data",
  "data": "\u001b[32muser@container:~$\u001b[0m "
}
```
*Note: Data contains raw ANSI escape sequences*

#### Session Info
```json
{
  "type": "session",
  "data": {
    "sessionId": "uuid",
    "sessionName": "shell-1",
    "cols": 80,
    "rows": 24,
    "pid": 1234
  }
}
```

#### Error Message
```json
{
  "type": "error",
  "data": {
    "code": "SESSION_TERMINATED" | "CONTAINER_ERROR",
    "message": "Error details"
  }
}
```

### Client → Server Messages

#### Terminal Input
```json
{
  "type": "input",
  "data": "ls -la\n"
}
```

#### Resize Terminal
```json
{
  "type": "resize",
  "cols": 120,
  "rows": 40
}
```

### Connection Limits
- Max concurrent terminals per environment: 10
- Max concurrent terminals per user: 20
- Idle timeout: 30 minutes (configurable)

---

## Environment Status Updates

### Endpoint
```
/ws/environments/{environmentId}/status
```

### Connection Flow
1. Client connects with authentication token
2. Server sends current environment status immediately
3. Server pushes status updates when environment state changes
4. Lightweight connection for dashboard real-time status

### Server → Client Messages

#### Status Update
```json
{
  "type": "status",
  "data": {
    "environmentId": "uuid",
    "status": "running" | "stopped" | "starting" | "stopping" | "error",
    "containerId": "docker_container_id",
    "cpuUsage": 25.5,
    "memoryUsage": 1024,
    "timestamp": "2025-09-30T12:34:56.789Z"
  }
}
```

#### Metrics Update (Optional - Future)
```json
{
  "type": "metrics",
  "data": {
    "cpuPercent": 25.5,
    "memoryUsed": 1024,
    "memoryLimit": 4096,
    "networkRx": 12345,
    "networkTx": 67890,
    "timestamp": "2025-09-30T12:34:56.789Z"
  }
}
```

### Update Frequency
- Status changes: Immediate
- Metrics updates: Every 5 seconds (if subscribed)

---

## Reconnection Strategy

### Client-Side Recommendations
1. **Exponential Backoff**: Start with 1s delay, double on each failure (max 30s)
2. **Connection State**: Track last received message timestamp
3. **Resume from Last**: Send `lastLogId` or `lastTimestamp` on reconnect
4. **User Notification**: Show "Reconnecting..." indicator after 3 failed attempts

### Server-Side Behavior
- Store last 100 log entries per environment in memory for replay
- Accept `since` parameter on reconnect to avoid duplicates
- Drop connection if authentication fails on reconnect

---

## Rate Limiting

### Per-Connection Limits
- Log streaming: 10,000 log lines/second
- Terminal input: 1,000 characters/second
- Control messages: 10/second

### Global Limits
- Total WebSocket connections: 10,000 (configurable)
- Connections per user: 100
- Connections per environment: 50

### Exceeded Limit Response
Server sends error message and closes connection:
```json
{
  "type": "error",
  "data": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many messages. Connection will close.",
    "retryAfter": 60
  }
}
```

---

## Security Considerations

### Authorization
- Verify user has permission to access environment on connection
- Re-verify permission periodically (every 5 minutes)
- Terminate connection if permissions revoked

### Data Protection
- All WebSocket traffic uses WSS (TLS) in production
- No sensitive data (passwords, tokens) logged in messages
- Terminal input/output not persisted beyond log retention policy

### Attack Mitigation
- Connection rate limiting per IP
- Message size limits (max 64KB per message)
- Automatic connection cleanup on suspicious activity

---

## Testing Recommendations

### Contract Tests
1. Verify message schemas match this specification
2. Test authentication rejection for invalid tokens
3. Test reconnection with `since` parameter
4. Test rate limit enforcement

### Integration Tests
1. Full log streaming flow (connect → receive historical → receive real-time → disconnect)
2. Terminal interaction (connect → send commands → receive output → resize → disconnect)
3. Multiple simultaneous connections to same environment
4. Connection behavior when environment starts/stops

### E2E Tests
1. Dashboard real-time status updates
2. Log viewer scrolling and filtering
3. Terminal copy/paste and keybindings
4. Reconnection on network interruption

---

## Implementation Notes

### Server-Side Libraries
- **Fastify WebSocket**: `@fastify/websocket` plugin
- **Stream Management**: Custom pub/sub for fan-out pattern
- **Terminal**: dockerode exec with `attach` (stdin/stdout/stderr streams)

### Client-Side Libraries
- **Log Viewer**: Custom React component with virtual scrolling
- **Terminal**: xterm.js with WebSocket addon
- **WebSocket Client**: Native WebSocket API (browser)

### Performance Optimizations
1. **Batching**: Group multiple log entries in single message (max 100ms delay)
2. **Compression**: Enable WebSocket per-message deflate
3. **Fan-out**: Single Docker log stream → N WebSocket clients (server-side multiplexing)
4. **Backpressure**: Pause Docker stream if all clients are slow consumers

---

## Versioning

**Current Version**: `v1`
**Path Format**: `/ws/v1/...`

Future versions will maintain backward compatibility or provide migration path.
