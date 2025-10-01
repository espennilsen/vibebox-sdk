# WebSocket Architecture & Flow

## WebSocket Connection Lifecycle

```mermaid
sequenceDiagram
    autonumber
    participant Client as Client<br/>(Browser)
    participant WSServer as WebSocket<br/>Server
    participant Auth as JWT<br/>Verification
    participant WSService as WebSocket<br/>Service
    participant Docker as Docker<br/>Service
    participant Container as Docker<br/>Container

    Note over Client,Container: Connection Establishment

    Client->>WSServer: WS Upgrade Request<br/>wss://api/ws/environments/{id}/logs?token=jwt
    WSServer->>Auth: Verify JWT Token

    alt Token Invalid
        Auth-->>Client: Close Connection<br/>Code: 4401 Unauthorized
    end

    Auth-->>WSServer: ✓ Token Valid

    WSServer->>WSService: Authenticate Connection
    WSService->>WSService: Check Environment Access

    alt No Access to Environment
        WSService-->>Client: Close Connection<br/>Code: 4403 Forbidden
    end

    WSService->>Docker: Attach to Container Logs
    Docker->>Container: docker logs --follow

    Note over Client,Container: Initial Data

    Container-->>Docker: Historical Logs (last 100 lines)
    Docker-->>WSService: Log Stream
    WSService->>WSServer: Format Messages
    WSServer->>Client: WS Message (batch)

    Note over Client,Container: Continuous Streaming

    loop Real-time Logs
        Container-->>Docker: New Log Line
        Docker-->>WSService: Stream Data
        WSService->>WSServer: Format Message
        WSServer->>Client: WS Message
    end

    Note over Client,Container: Client Control

    Client->>WSServer: Control Message: {action: "pause"}
    WSServer->>WSService: Pause Stream
    WSService->>Docker: Detach Stream

    Client->>WSServer: Control Message: {action: "resume"}
    WSServer->>WSService: Resume Stream
    WSService->>Docker: Reattach Stream

    Note over Client,Container: Disconnection

    Client->>WSServer: Close Connection
    WSServer->>WSService: Cleanup
    WSService->>Docker: Detach from Container
    Docker->>Container: Stop Following Logs
```

## WebSocket Endpoint Types

```mermaid
graph TB
    WSBase[WebSocket Base<br/>/api/v1/ws]

    WSBase --> Logs[Log Streaming<br/>/environments/:id/logs]
    WSBase --> Terminal[Terminal PTY<br/>/environments/:id/terminal]
    WSBase --> Status[Status Updates<br/>/environments/:id/status]

    Logs --> LogsAuth[JWT Auth]
    Terminal --> TermAuth[JWT Auth]
    Status --> StatusAuth[JWT Auth]

    LogsAuth --> LogsOps[Operations:<br/>• connect<br/>• pause<br/>• resume<br/>• filter<br/>• disconnect]

    TermAuth --> TermOps[Operations:<br/>• connect<br/>• input<br/>• resize<br/>• attach<br/>• detach<br/>• disconnect]

    StatusAuth --> StatusOps[Operations:<br/>• connect<br/>• subscribe<br/>• unsubscribe<br/>• disconnect]

    classDef base fill:#3498db,stroke:#333,stroke-width:2px,color:#fff
    classDef endpoint fill:#f39c12,stroke:#333,stroke-width:2px,color:#000
    classDef auth fill:#e74c3c,stroke:#333,stroke-width:2px,color:#fff
    classDef ops fill:#27ae60,stroke:#333,stroke-width:2px,color:#fff

    class WSBase base
    class Logs,Terminal,Status endpoint
    class LogsAuth,TermAuth,StatusAuth auth
    class LogsOps,TermOps,StatusOps ops
```

## Log Streaming Flow

```mermaid
sequenceDiagram
    participant Client
    participant WSServer
    participant WSService
    participant Docker
    participant Container
    participant DB

    Client->>WSServer: Connect /ws/environments/123/logs?stream=all

    WSServer->>WSService: Initialize Stream

    Note over WSService,DB: Load Historical Logs

    WSService->>DB: SELECT logs WHERE environment_id=123<br/>ORDER BY timestamp DESC LIMIT 100
    DB-->>WSService: Historical Logs
    WSService->>Client: Batch: 100 historical messages

    Note over WSService,Container: Attach to Live Stream

    WSService->>Docker: docker.getContainer(id).logs({follow: true})
    Docker->>Container: Attach to stdout/stderr

    loop Real-time Streaming
        Container->>Docker: Log Line
        Docker->>WSService: {stream: 'stdout', data: '...'}

        WSService->>WSService: Format Message
        WSService->>DB: INSERT log_entry (async)
        WSService->>Client: WS Message: {<br/>  type: 'log',<br/>  timestamp: '...',<br/>  stream: 'stdout',<br/>  message: '...'<br/>}
    end

    Client->>WSServer: {action: 'filter', stream: 'stderr'}
    WSServer->>WSService: Update Filter
    Note over WSService: Only send stderr logs

    Client->>WSServer: Close Connection
    WSServer->>WSService: Cleanup
    WSService->>Docker: Detach from Container
```

## Terminal (PTY) Flow

```mermaid
sequenceDiagram
    participant Client
    participant Terminal as xterm.js
    participant WSServer
    participant WSService
    participant Docker
    participant Container
    participant Shell as Bash Shell

    Client->>Terminal: User Opens Terminal
    Terminal->>WSServer: Connect /ws/environments/123/terminal

    WSServer->>WSService: Initialize PTY Session
    WSService->>Docker: docker.exec({Cmd: ['/bin/bash'], Tty: true})
    Docker->>Container: Create PTY
    Container->>Shell: Start Interactive Shell
    Shell-->>Container: Ready
    Container-->>WSService: PTY Ready
    WSService-->>Terminal: {type: 'ready'}

    Note over Client,Shell: Bidirectional Communication

    Terminal->>WSServer: {type: 'input', data: 'ls -la\r'}
    WSServer->>WSService: Forward Input
    WSService->>Docker: Write to PTY stdin
    Docker->>Container: stdin
    Container->>Shell: Execute Command

    Shell->>Container: stdout (ANSI codes + output)
    Container->>Docker: PTY output
    Docker->>WSService: Stream Output
    WSService->>Terminal: {type: 'output', data: '...'}
    Terminal->>Client: Render in Terminal

    Note over Client,Shell: Terminal Resize

    Client->>Terminal: Window Resized
    Terminal->>WSServer: {type: 'resize', cols: 120, rows: 30}
    WSServer->>WSService: Resize PTY
    WSService->>Docker: Resize PTY
    Docker->>Container: Update Terminal Size

    Note over Client,Shell: Cleanup

    Client->>Terminal: Close Terminal
    Terminal->>WSServer: Close Connection
    WSServer->>WSService: Terminate Session
    WSService->>Docker: Kill PTY Process
    Docker->>Container: SIGTERM
    Container->>Shell: Exit
```

## Status Updates Flow

```mermaid
sequenceDiagram
    participant Client
    participant WSServer
    participant WSService
    participant EventBus
    participant EnvService as Environment<br/>Service
    participant Docker

    Client->>WSServer: Connect /ws/environments/123/status

    WSServer->>WSService: Subscribe to Environment 123
    WSService->>EventBus: Subscribe('env:123:*')

    Note over WSService,EventBus: Initial State

    WSService->>EnvService: Get Environment Status
    EnvService-->>WSService: {status: 'running', cpu: 45%, mem: 60%}
    WSService->>Client: {type: 'status', data: {...}}

    Note over Docker,EnvService: Status Change

    EnvService->>Docker: Stop Environment
    Docker-->>EnvService: Container Stopped
    EnvService->>EventBus: Emit('env:123:status', {status: 'stopped'})

    EventBus->>WSService: Event Received
    WSService->>Client: {<br/>  type: 'status',<br/>  status: 'stopped',<br/>  timestamp: '...'<br/>}

    Note over Docker,EnvService: Resource Metrics (every 5s)

    loop Every 5 seconds
        EnvService->>Docker: Get Container Stats
        Docker-->>EnvService: {cpu: 52%, memory: 65%, network: {...}}
        EnvService->>EventBus: Emit('env:123:metrics', {...})
        EventBus->>WSService: Event Received
        WSService->>Client: {type: 'metrics', data: {...}}
    end

    Client->>WSServer: Close Connection
    WSServer->>WSService: Unsubscribe
    WSService->>EventBus: Unsubscribe('env:123:*')
```

## WebSocket Message Types

### Log Streaming Messages

```mermaid
classDiagram
    class LogMessage {
        +string type = "log"
        +string timestamp
        +string stream ("stdout"|"stderr")
        +string message
        +object meta
    }

    class LogControl {
        +string action
        +string stream?
        +boolean paused?
    }

    class LogBatch {
        +string type = "batch"
        +LogMessage[] logs
        +int count
    }

    LogMessage --> LogBatch : contains
```

**Client → Server (Control)**:
```json
{
  "action": "pause"
}
```

```json
{
  "action": "filter",
  "stream": "stderr"
}
```

**Server → Client (Data)**:
```json
{
  "type": "log",
  "timestamp": "2025-10-01T12:00:00.123Z",
  "stream": "stdout",
  "message": "Application started on port 3000"
}
```

### Terminal Messages

**Client → Server (Input)**:
```json
{
  "type": "input",
  "data": "ls -la\r"
}
```

```json
{
  "type": "resize",
  "cols": 120,
  "rows": 30
}
```

**Server → Client (Output)**:
```json
{
  "type": "output",
  "data": "\u001b[32mfile.txt\u001b[0m"
}
```

```json
{
  "type": "ready"
}
```

### Status Update Messages

**Server → Client**:
```json
{
  "type": "status",
  "status": "running",
  "timestamp": "2025-10-01T12:00:00Z"
}
```

```json
{
  "type": "metrics",
  "cpu": 45.2,
  "memory": 2048,
  "memoryLimit": 4096,
  "network": {
    "rx": 1024000,
    "tx": 512000
  },
  "timestamp": "2025-10-01T12:00:00Z"
}
```

## Connection Management

```mermaid
stateDiagram-v2
    [*] --> Connecting: Client Connects

    Connecting --> Authenticating: WS Upgrade
    Authenticating --> Connected: JWT Valid
    Authenticating --> Closed: Auth Failed

    Connected --> Subscribed: Subscribe to Events
    Subscribed --> Streaming: Start Data Flow

    Streaming --> Paused: Client Pause
    Paused --> Streaming: Client Resume

    Streaming --> Disconnecting: Client Close
    Streaming --> Disconnecting: Server Close
    Streaming --> Error: Connection Error

    Error --> Reconnecting: Retry
    Reconnecting --> Connecting: Backoff Delay
    Reconnecting --> Closed: Max Retries

    Disconnecting --> Cleanup: Unsubscribe
    Cleanup --> Closed: Resources Released
    Closed --> [*]

    note right of Streaming
        Active data streaming
        Heartbeat: 30s
        Timeout: 60s
    end note

    note right of Reconnecting
        Exponential backoff
        Max retries: 5
        Delay: 1s, 2s, 4s, 8s, 16s
    end note
```

## Heartbeat & Keepalive

```mermaid
sequenceDiagram
    participant Client
    participant WSServer

    Note over Client,WSServer: Connection Active

    loop Every 30 seconds
        WSServer->>Client: Ping Frame
        Client->>WSServer: Pong Frame
    end

    Note over Client,WSServer: No Response

    WSServer->>WSServer: Wait 60s for Pong

    alt Pong Received
        Note over WSServer: Connection Healthy
    else Timeout (60s)
        WSServer->>WSServer: Mark Connection Stale
        WSServer->>Client: Close Connection<br/>Code: 1000 Normal
        WSServer->>WSService: Cleanup Resources
    end

    Note over Client: Client Reconnects

    Client->>WSServer: New WS Connection
    WSServer->>Client: Resume from Last Position
```

## Scalability & Load Balancing

```mermaid
graph TB
    subgraph "Clients"
        C1[Client 1]
        C2[Client 2]
        C3[Client 3]
    end

    subgraph "Load Balancer"
        LB[Sticky Session<br/>Load Balancer]
    end

    subgraph "Backend Pods"
        B1[Backend Pod 1<br/>WS Server]
        B2[Backend Pod 2<br/>WS Server]
        B3[Backend Pod 3<br/>WS Server]
    end

    subgraph "Message Broker"
        Redis[Redis Pub/Sub<br/>Cross-Pod Communication]
    end

    subgraph "Docker Hosts"
        D1[Docker Host 1]
        D2[Docker Host 2]
    end

    C1 --> LB
    C2 --> LB
    C3 --> LB

    LB --> B1
    LB --> B2
    LB --> B3

    B1 <--> Redis
    B2 <--> Redis
    B3 <--> Redis

    B1 --> D1
    B2 --> D2
    B3 --> D1

    Note1[Sticky Sessions:<br/>Session affinity based on environment ID<br/>Ensures client stays on same pod]

    Note2[Redis Pub/Sub:<br/>Broadcasts events to all pods<br/>Enables horizontal scaling]

    classDef client fill:#61dafb,stroke:#333,stroke-width:2px,color:#000
    classDef lb fill:#f39c12,stroke:#333,stroke-width:2px,color:#000
    classDef backend fill:#27ae60,stroke:#333,stroke-width:2px,color:#fff
    classDef broker fill:#e74c3c,stroke:#333,stroke-width:2px,color:#fff
    classDef docker fill:#2496ed,stroke:#333,stroke-width:2px,color:#fff

    class C1,C2,C3 client
    class LB lb
    class B1,B2,B3 backend
    class Redis broker
    class D1,D2 docker
```

## Error Handling

```mermaid
graph TD
    Error{WebSocket Error}

    Error -->|4401| Auth[Authentication Failed<br/>Invalid JWT]
    Error -->|4403| Authz[Authorization Failed<br/>No Access to Resource]
    Error -->|4404| NotFound[Environment Not Found]
    Error -->|4429| RateLimit[Rate Limit Exceeded]
    Error -->|1000| Normal[Normal Closure<br/>Client Disconnect]
    Error -->|1001| GoingAway[Server Shutdown<br/>Graceful Close]
    Error -->|1008| Policy[Policy Violation<br/>Bad Message Format]
    Error -->|1011| ServerError[Internal Server Error<br/>Unexpected Condition]

    Auth --> ClientRetry{Client<br/>Action}
    Authz --> ClientRetry
    NotFound --> ClientRetry
    RateLimit --> ClientRetry
    ServerError --> ClientRetry

    ClientRetry -->|Retry| Reconnect[Reconnect with<br/>Exponential Backoff]
    ClientRetry -->|Give Up| End[Show Error to User]

    Normal --> End
    GoingAway --> Reconnect

    classDef error fill:#e74c3c,stroke:#333,stroke-width:2px,color:#fff
    classDef action fill:#f39c12,stroke:#333,stroke-width:2px,color:#000
    classDef endpoint fill:#27ae60,stroke:#333,stroke-width:2px,color:#fff

    class Error,Auth,Authz,NotFound,RateLimit,ServerError,GoingAway,Policy error
    class ClientRetry action
    class Normal,Reconnect,End endpoint
```

## Performance Optimization

### Batching Strategy
```mermaid
sequenceDiagram
    participant Container
    participant WSService
    participant Client

    Note over WSService: Buffer window: 100ms

    Container->>WSService: Log line 1
    Container->>WSService: Log line 2
    Container->>WSService: Log line 3
    Container->>WSService: Log line 4

    WSService->>WSService: Batch 4 messages

    Note over WSService: 100ms elapsed OR buffer full (100 msgs)

    WSService->>Client: Batch Message {<br/>  type: 'batch',<br/>  logs: [line1, line2, line3, line4],<br/>  count: 4<br/>}

    Note over Client,WSService: Reduces WS overhead by ~75%
```

### Connection Limits
- Max connections per user: **50**
- Max connections per environment: **10**
- Max message size: **1 MB**
- Max batch size: **100 messages**
- Heartbeat interval: **30 seconds**
- Connection timeout: **60 seconds**
- Reconnect max retries: **5**

### Monitoring Metrics
- Active connections per endpoint
- Messages sent/received per second
- Average message latency
- Connection duration histogram
- Error rate by error code
- Reconnection success rate
