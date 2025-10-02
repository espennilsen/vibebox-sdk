# WebSocket Guide

> Real-time communication with VibeBox environments via WebSocket

## Overview

VibeBox provides WebSocket endpoints for real-time streaming of logs, terminal sessions, and environment status updates. All WebSocket connections require authentication and follow a consistent message protocol.

### Key Features

- **Real-time Log Streaming**: Stream stdout/stderr logs from development environments
- **Interactive Terminal**: Full bidirectional terminal access with resize support
- **Status Updates**: Subscribe to environment state changes and resource metrics
- **Connection Management**: Automatic reconnection, health checks, and error handling
- **Multi-client Support**: Multiple clients can connect to the same resource simultaneously

### Protocol Overview

- **Transport**: WebSocket (RFC 6455)
- **Message Format**: JSON
- **Base URL**: `ws://localhost:3000/api/v1/ws` (development)
- **Production URL**: `wss://api.vibecode.dev/v1/ws`
- **Authentication**: JWT token via query parameter or header
- **Max Payload**: 1MB per message

---

## Authentication

All WebSocket connections require a valid JWT access token.

### Token-based Authentication

Pass the JWT token as a query parameter:

```javascript
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const ws = new WebSocket(`ws://localhost:3000/api/v1/ws/logs?token=${token}`);
```

### Alternative: Header-based Authentication

Some WebSocket clients support custom headers:

```javascript
const ws = new WebSocket('ws://localhost:3000/api/v1/ws/logs', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Authentication Errors

If authentication fails, the connection will close immediately:

```javascript
ws.on('close', (code, reason) => {
  if (code === 4401) {
    console.error('Authentication failed:', reason);
  }
});
```

**Close Codes**:
- `4401`: Unauthorized (invalid or missing token)
- `4403`: Forbidden (valid token but insufficient permissions)

---

## Message Format

All WebSocket messages follow a consistent JSON structure.

### Message Structure

```typescript
interface WebSocketMessage {
  type: string;           // Message type identifier
  payload: any;           // Message-specific data
  timestamp?: number;     // Unix timestamp (milliseconds)
}
```

### Message Types

#### Client → Server

| Type | Purpose | Endpoints |
|------|---------|-----------|
| `log_subscribe` | Subscribe to environment logs | logs |
| `log_unsubscribe` | Unsubscribe from logs | logs |
| `env_subscribe` | Subscribe to environment status | status |
| `env_unsubscribe` | Unsubscribe from status | status |
| `terminal_input` | Send input to terminal | terminal |
| `terminal_resize` | Resize terminal dimensions | terminal |
| `ping` | Connection health check | all |

#### Server → Client

| Type | Purpose | Endpoints |
|------|---------|-----------|
| `log` | Log entry from environment | logs |
| `env_status` | Environment status update | status |
| `terminal_output` | Terminal output data | terminal |
| `pong` | Response to ping | all |
| `error` | Error message | all |

---

## WebSocket Endpoints

### 1. Log Streaming

Stream real-time logs from development environments.

#### Endpoint

```
ws://localhost:3000/api/v1/ws/logs?token={token}
```

#### Connection Example

```javascript
const environmentId = '550e8400-e29b-41d4-a716-446655440000';
const token = localStorage.getItem('accessToken');

const ws = new WebSocket(`ws://localhost:3000/api/v1/ws/logs?token=${token}`);

ws.onopen = () => {
  console.log('Connected to log stream');

  // Subscribe to environment logs
  ws.send(JSON.stringify({
    type: 'log_subscribe',
    payload: {
      environmentId: environmentId,
      stream: 'stdout' // 'stdout', 'stderr', or 'all'
    }
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'log') {
    console.log(`[${message.payload.stream}] ${message.payload.message}`);
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = (event) => {
  console.log('Connection closed:', event.code, event.reason);
};
```

#### Subscribe Message

```json
{
  "type": "log_subscribe",
  "payload": {
    "environmentId": "550e8400-e29b-41d4-a716-446655440000",
    "stream": "stdout"
  }
}
```

**Payload Fields**:
- `environmentId` (required): UUID of the environment
- `stream` (optional): Filter by stream type (`stdout`, `stderr`, or `all`)

#### Log Message Format

```json
{
  "type": "log",
  "payload": {
    "environmentId": "550e8400-e29b-41d4-a716-446655440000",
    "stream": "stdout",
    "message": "Application started on port 3000",
    "timestamp": "2025-10-01T12:34:56.789Z"
  },
  "timestamp": 1696165496789
}
```

#### Unsubscribe Message

```json
{
  "type": "log_unsubscribe",
  "payload": {
    "environmentId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

### 2. Terminal Session

Interactive terminal access to development environments.

#### Endpoint

```
ws://localhost:3000/api/v1/ws/terminal?token={token}
```

#### Connection Example

```javascript
const sessionId = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const token = localStorage.getItem('accessToken');

const ws = new WebSocket(`ws://localhost:3000/api/v1/ws/terminal?token=${token}`);

ws.onopen = () => {
  console.log('Terminal session connected');

  // Send terminal input
  ws.send(JSON.stringify({
    type: 'terminal_input',
    payload: {
      sessionId: sessionId,
      data: 'ls -la\n'
    }
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'terminal_output') {
    // Display in terminal emulator (e.g., xterm.js)
    term.write(message.payload.data);
  }
};
```

#### Terminal Input Message

```json
{
  "type": "terminal_input",
  "payload": {
    "sessionId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "data": "ls -la\n"
  }
}
```

**Payload Fields**:
- `sessionId` (required): UUID of the terminal session
- `data` (required): Input data to send to terminal

#### Terminal Output Message

```json
{
  "type": "terminal_output",
  "payload": {
    "sessionId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "data": "total 48\ndrwxr-xr-x  12 user  staff   384 Oct  1 12:34 .\n"
  },
  "timestamp": 1696165496789
}
```

#### Terminal Resize Message

```json
{
  "type": "terminal_resize",
  "payload": {
    "sessionId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "rows": 40,
    "cols": 120
  }
}
```

**Payload Fields**:
- `sessionId` (required): UUID of the terminal session
- `rows` (required): Number of terminal rows
- `cols` (required): Number of terminal columns

#### Integration with xterm.js

```javascript
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';

const term = new Terminal({
  rows: 30,
  cols: 100,
  cursorBlink: true
});

term.open(document.getElementById('terminal'));

// Connect terminal to WebSocket
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'terminal_output') {
    term.write(message.payload.data);
  }
};

// Send terminal input
term.onData((data) => {
  ws.send(JSON.stringify({
    type: 'terminal_input',
    payload: {
      sessionId: sessionId,
      data: data
    }
  }));
});

// Handle terminal resize
term.onResize(({ rows, cols }) => {
  ws.send(JSON.stringify({
    type: 'terminal_resize',
    payload: {
      sessionId: sessionId,
      rows: rows,
      cols: cols
    }
  }));
});
```

---

### 3. Environment Status

Subscribe to real-time environment status and resource metrics.

#### Endpoint

```
ws://localhost:3000/api/v1/ws/status?token={token}
```

#### Connection Example

```javascript
const environmentId = '550e8400-e29b-41d4-a716-446655440000';
const token = localStorage.getItem('accessToken');

const ws = new WebSocket(`ws://localhost:3000/api/v1/ws/status?token=${token}`);

ws.onopen = () => {
  console.log('Connected to status updates');

  // Subscribe to environment status
  ws.send(JSON.stringify({
    type: 'env_subscribe',
    payload: {
      environmentId: environmentId
    }
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'env_status') {
    console.log('Environment status:', message.payload.status);
    console.log('CPU:', message.payload.cpuUsage, '%');
    console.log('Memory:', message.payload.memoryUsage, 'MB');
  }
};
```

#### Subscribe Message

```json
{
  "type": "env_subscribe",
  "payload": {
    "environmentId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### Status Update Message

```json
{
  "type": "env_status",
  "payload": {
    "environmentId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "running",
    "message": "Environment is healthy",
    "cpuUsage": 15.3,
    "memoryUsage": 512.5,
    "containerId": "abc123def456"
  },
  "timestamp": 1696165496789
}
```

**Payload Fields**:
- `environmentId` (required): UUID of the environment
- `status` (required): Environment state (`running`, `stopped`, `starting`, `stopping`, `error`)
- `message` (optional): Status description
- `cpuUsage` (optional): CPU usage percentage
- `memoryUsage` (optional): Memory usage in MB
- `containerId` (optional): Docker container ID

#### Unsubscribe Message

```json
{
  "type": "env_unsubscribe",
  "payload": {
    "environmentId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

## Error Handling

### Error Message Format

```json
{
  "type": "error",
  "payload": {
    "error": "Environment not found",
    "code": "ENV_NOT_FOUND",
    "details": {
      "environmentId": "550e8400-e29b-41d4-a716-446655440000"
    }
  },
  "timestamp": 1696165496789
}
```

### Common Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `UNAUTHORIZED` | Invalid or expired token | Re-authenticate |
| `FORBIDDEN` | Insufficient permissions | Check user access |
| `ENV_NOT_FOUND` | Environment doesn't exist | Verify environment ID |
| `SESSION_NOT_FOUND` | Terminal session doesn't exist | Create new session |
| `INVALID_MESSAGE` | Malformed message | Check message format |
| `RATE_LIMITED` | Too many messages | Slow down requests |

### Handling Errors in Client

```javascript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'error') {
    const { error, code } = message.payload;

    switch (code) {
      case 'UNAUTHORIZED':
        // Re-authenticate
        refreshToken().then(() => reconnect());
        break;

      case 'ENV_NOT_FOUND':
        // Redirect to environment list
        window.location.href = '/environments';
        break;

      default:
        console.error('WebSocket error:', error);
    }
  }
};
```

---

## Connection Management

### Health Checks (Ping/Pong)

Keep connections alive with periodic ping messages:

```javascript
// Send ping every 30 seconds
const pingInterval = setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'ping',
      payload: {},
      timestamp: Date.now()
    }));
  }
}, 30000);

// Handle pong response
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'pong') {
    console.log('Connection alive, latency:', Date.now() - message.timestamp, 'ms');
  }
};

// Clean up on close
ws.onclose = () => {
  clearInterval(pingInterval);
};
```

### Automatic Reconnection

Implement exponential backoff for reconnection:

```javascript
class WebSocketClient {
  constructor(url, token) {
    this.url = url;
    this.token = token;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000; // Start with 1 second
    this.maxReconnectDelay = 30000; // Max 30 seconds
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(`${this.url}?token=${this.token}`);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this.onConnectionOpen();
    };

    this.ws.onmessage = (event) => {
      this.onMessage(JSON.parse(event.data));
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);

      // Don't reconnect if closed intentionally
      if (event.code === 1000) {
        return;
      }

      this.reconnect();
    };
  }

  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;

    console.log(
      `Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);

    // Exponential backoff with jitter
    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2 + Math.random() * 1000,
      this.maxReconnectDelay
    );
  }

  send(message) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent');
    }
  }

  close() {
    this.ws.close(1000, 'Client closed connection');
  }

  onConnectionOpen() {
    // Override in subclass
  }

  onMessage(message) {
    // Override in subclass
  }
}

// Usage
class LogStreamClient extends WebSocketClient {
  constructor(token, environmentId) {
    super('ws://localhost:3000/api/v1/ws/logs', token);
    this.environmentId = environmentId;
  }

  onConnectionOpen() {
    this.send({
      type: 'log_subscribe',
      payload: {
        environmentId: this.environmentId,
        stream: 'all'
      }
    });
  }

  onMessage(message) {
    if (message.type === 'log') {
      console.log(`[${message.payload.stream}] ${message.payload.message}`);
    }
  }
}

const logClient = new LogStreamClient(token, environmentId);
```

### Connection States

```javascript
// WebSocket.CONNECTING (0)
// WebSocket.OPEN (1)
// WebSocket.CLOSING (2)
// WebSocket.CLOSED (3)

function getConnectionState(ws) {
  switch (ws.readyState) {
    case WebSocket.CONNECTING:
      return 'Connecting...';
    case WebSocket.OPEN:
      return 'Connected';
    case WebSocket.CLOSING:
      return 'Disconnecting...';
    case WebSocket.CLOSED:
      return 'Disconnected';
    default:
      return 'Unknown';
  }
}
```

---

## React Integration

### Custom Hook Example

```typescript
import { useEffect, useRef, useState } from 'react';

interface UseWebSocketOptions {
  url: string;
  token: string;
  onMessage?: (message: any) => void;
  onError?: (error: Event) => void;
  autoConnect?: boolean;
}

export function useWebSocket({
  url,
  token,
  onMessage,
  onError,
  autoConnect = true
}: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<number>(WebSocket.CLOSED);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!autoConnect) return;

    const ws = new WebSocket(`${url}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setConnectionState(WebSocket.OPEN);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      onMessage?.(message);
    };

    ws.onerror = (error) => {
      onError?.(error);
    };

    ws.onclose = () => {
      setIsConnected(false);
      setConnectionState(WebSocket.CLOSED);
    };

    return () => {
      ws.close(1000, 'Component unmounted');
    };
  }, [url, token, autoConnect, onMessage, onError]);

  const send = (message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  const close = () => {
    wsRef.current?.close(1000, 'Client closed connection');
  };

  return { isConnected, connectionState, send, close };
}

// Usage
function LogViewer({ environmentId }: { environmentId: string }) {
  const [logs, setLogs] = useState<string[]>([]);
  const token = localStorage.getItem('accessToken');

  const { isConnected, send } = useWebSocket({
    url: 'ws://localhost:3000/api/v1/ws/logs',
    token: token!,
    onMessage: (message) => {
      if (message.type === 'log') {
        setLogs(prev => [...prev, message.payload.message]);
      }
    }
  });

  useEffect(() => {
    if (isConnected) {
      send({
        type: 'log_subscribe',
        payload: { environmentId, stream: 'all' }
      });
    }
  }, [isConnected, environmentId]);

  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      <div>
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </div>
    </div>
  );
}
```

---

## Troubleshooting

### Connection Fails Immediately

**Symptoms**: WebSocket closes right after opening

**Possible Causes**:
- Invalid or expired JWT token
- Missing authentication token
- CORS issues (in browser)

**Solutions**:
```javascript
// Check token validity
const token = localStorage.getItem('accessToken');
if (!token) {
  console.error('No access token found');
  // Redirect to login
}

// Verify token hasn't expired
const payload = JSON.parse(atob(token.split('.')[1]));
if (payload.exp * 1000 < Date.now()) {
  console.error('Token has expired');
  // Refresh token
}
```

### Messages Not Received

**Symptoms**: Connection is open but no messages arrive

**Possible Causes**:
- Not subscribed to the correct resource
- Environment/session doesn't exist
- No activity on the resource

**Solutions**:
```javascript
// Verify subscription message was sent
ws.onopen = () => {
  console.log('Sending subscription...');
  ws.send(JSON.stringify({
    type: 'log_subscribe',
    payload: { environmentId: 'your-env-id' }
  }));
};

// Log all received messages
ws.onmessage = (event) => {
  console.log('Received:', event.data);
  const message = JSON.parse(event.data);
  // Process message
};
```

### Connection Drops Frequently

**Symptoms**: WebSocket disconnects after a short time

**Possible Causes**:
- Network issues
- Proxy/firewall timeouts
- Missing ping/pong

**Solutions**:
```javascript
// Implement ping/pong keep-alive
const pingInterval = setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ping', payload: {} }));
  }
}, 30000);

ws.onclose = () => {
  clearInterval(pingInterval);
};
```

### High Latency

**Symptoms**: Slow message delivery

**Possible Causes**:
- Network latency
- Server overload
- Too many subscriptions

**Solutions**:
```javascript
// Measure round-trip time
const pingTime = Date.now();
ws.send(JSON.stringify({
  type: 'ping',
  payload: {},
  timestamp: pingTime
}));

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'pong') {
    const latency = Date.now() - message.timestamp;
    console.log('Latency:', latency, 'ms');
  }
};
```

### Memory Leaks

**Symptoms**: Browser memory usage grows over time

**Possible Causes**:
- Not cleaning up event listeners
- Storing too many messages
- Not closing connections

**Solutions**:
```javascript
// Limit message buffer size
const MAX_LOGS = 1000;
const [logs, setLogs] = useState<string[]>([]);

useEffect(() => {
  // Trim logs if too many
  if (logs.length > MAX_LOGS) {
    setLogs(prev => prev.slice(-MAX_LOGS));
  }
}, [logs]);

// Clean up on unmount
useEffect(() => {
  return () => {
    ws.close(1000, 'Component unmounted');
  };
}, []);
```

---

## Best Practices

### Security

1. **Always use WSS in production**: Encrypt WebSocket traffic
   ```javascript
   const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
   const ws = new WebSocket(`${protocol}//api.vibecode.dev/v1/ws/logs`);
   ```

2. **Validate tokens before connecting**: Check expiry client-side
   ```javascript
   function isTokenValid(token: string): boolean {
     try {
       const payload = JSON.parse(atob(token.split('.')[1]));
       return payload.exp * 1000 > Date.now();
     } catch {
       return false;
     }
   }
   ```

3. **Handle token refresh**: Reconnect with new token
   ```javascript
   async function refreshConnection(ws: WebSocket) {
     const newToken = await refreshAccessToken();
     ws.close(1000, 'Token refreshed');
     connect(newToken);
   }
   ```

### Performance

1. **Throttle high-frequency messages**: Debounce terminal input
   ```javascript
   import { debounce } from 'lodash';

   const sendInput = debounce((data) => {
     ws.send(JSON.stringify({
       type: 'terminal_input',
       payload: { sessionId, data }
     }));
   }, 16); // ~60fps
   ```

2. **Use binary data for large payloads**: Convert to ArrayBuffer
   ```javascript
   // For very large terminal outputs
   ws.binaryType = 'arraybuffer';
   ```

3. **Unsubscribe when not needed**: Reduce server load
   ```javascript
   useEffect(() => {
     // Subscribe on mount
     send({ type: 'log_subscribe', payload: { environmentId } });

     // Unsubscribe on unmount
     return () => {
       send({ type: 'log_unsubscribe', payload: { environmentId } });
     };
   }, [environmentId]);
   ```

### Reliability

1. **Implement exponential backoff**: Avoid overwhelming server
2. **Handle all close codes**: Different reconnection strategies
3. **Buffer messages during reconnection**: Don't lose user input
4. **Show connection status to user**: Visual feedback

### Monitoring

1. **Log connection events**: Track reconnections
   ```javascript
   ws.onopen = () => {
     analytics.track('websocket_connected', { endpoint: url });
   };

   ws.onclose = (event) => {
     analytics.track('websocket_disconnected', {
       code: event.code,
       reason: event.reason
     });
   };
   ```

2. **Track message latency**: Monitor performance
3. **Alert on frequent disconnections**: Detect issues early

---

## Advanced Topics

### Multiplexing Multiple Subscriptions

Subscribe to multiple resources over a single connection:

```javascript
class MultiplexedWebSocketClient {
  constructor(url, token) {
    this.url = url;
    this.token = token;
    this.subscriptions = new Map();
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(`${this.url}?token=${this.token}`);

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      // Route message to appropriate handler
      const resourceId = this.getResourceId(message);
      const handler = this.subscriptions.get(resourceId);

      if (handler) {
        handler(message);
      }
    };
  }

  subscribe(resourceId, handler) {
    this.subscriptions.set(resourceId, handler);

    // Send subscription message
    this.ws.send(JSON.stringify({
      type: 'env_subscribe',
      payload: { environmentId: resourceId }
    }));
  }

  unsubscribe(resourceId) {
    this.subscriptions.delete(resourceId);

    this.ws.send(JSON.stringify({
      type: 'env_unsubscribe',
      payload: { environmentId: resourceId }
    }));
  }

  getResourceId(message) {
    // Extract resource ID from message
    return message.payload?.environmentId || message.payload?.sessionId;
  }
}
```

### Message Compression

For high-volume streams, consider compression:

```javascript
import pako from 'pako';

// Compress before sending (if server supports)
function sendCompressed(ws, message) {
  const json = JSON.stringify(message);
  const compressed = pako.deflate(json);
  ws.send(compressed);
}

// Decompress on receive
ws.binaryType = 'arraybuffer';
ws.onmessage = (event) => {
  if (event.data instanceof ArrayBuffer) {
    const decompressed = pako.inflate(event.data, { to: 'string' });
    const message = JSON.parse(decompressed);
    // Process message
  }
};
```

### Circuit Breaker Pattern

Prevent cascading failures:

```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  canAttempt() {
    if (this.state === 'CLOSED') {
      return true;
    }

    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailure > this.timeout) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }

    return true; // HALF_OPEN
  }

  recordSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  recordFailure() {
    this.failureCount++;
    this.lastFailure = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      console.warn('Circuit breaker opened');
    }
  }
}
```

---

## API Reference

### WebSocketService Methods

See `/workspace/backend/src/services/websocket.service.ts` for complete service implementation.

**Key Methods**:
- `registerClient(clientId, ws, userId)`: Register new connection
- `unregisterClient(clientId)`: Remove connection
- `subscribeToEnvironment(clientId, environmentId)`: Subscribe to environment
- `subscribeToSession(clientId, sessionId)`: Subscribe to terminal session
- `broadcastLog(payload)`: Send log to subscribers
- `broadcastEnvironmentStatus(payload)`: Send status update
- `sendTerminalOutput(payload)`: Send terminal data
- `pingAll()`: Health check all connections

---

## Additional Resources

- **xterm.js Documentation**: https://xtermjs.org/
- **WebSocket API (MDN)**: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- **RFC 6455 (WebSocket Protocol)**: https://tools.ietf.org/html/rfc6455
- **Socket.IO** (alternative library): https://socket.io/

---

## Support

For WebSocket-specific issues:

1. Check the [FAQ](./.claude/faq.md)
2. Review the [Logs Guide](./.claude/logs.md)
3. Open an issue on GitHub
4. Contact support@vibecode.dev
