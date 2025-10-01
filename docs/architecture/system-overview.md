# System Architecture Overview - Mermaid Format

## High-Level System Architecture

This diagram shows the complete system architecture of VibeBox, including all major components and their interactions.

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser]
        CLI[CLI Tool]
    end

    subgraph "Frontend Application"
        React[React App<br/>TypeScript + Vite]
        ReactRouter[React Router]
        MUI[Material-UI]
        XTerm[xterm.js Terminal]
        WSClient[WebSocket Client]
    end

    subgraph "API Layer"
        Gateway[API Gateway<br/>Fastify]
        CORS[CORS Middleware]
        JWT[JWT Auth]
        RateLimit[Rate Limiter]
        Routes[REST Routes]
        WSServer[WebSocket Server]
    end

    subgraph "Service Layer"
        AuthService[Auth Service]
        UserService[User Service]
        TeamService[Team Service]
        ProjectService[Project Service]
        EnvService[Environment Service]
        SessionService[Session Service]
        ExtService[Extension Service]
        LogService[Log Service]
        DockerService[Docker Service]
        WSService[WebSocket Service]
    end

    subgraph "Data Layer"
        Prisma[Prisma ORM]
        PostgreSQL[(PostgreSQL<br/>Database)]
        RedisCache[(Redis Cache)]
    end

    subgraph "External Services"
        Docker[Docker Engine<br/>Container Runtime]
        VSCode[VS Code Server]
        Tmux[tmux Sessions]
        OAuth[OAuth Providers<br/>GitHub, Google]
    end

    subgraph "Infrastructure"
        K8s[Kubernetes Cluster]
        Ingress[Ingress Controller]
        PV[Persistent Volumes]
        Secrets[Secret Manager]
    end

    %% Client to Frontend
    Browser --> React
    CLI --> Routes

    %% Frontend Internal
    React --> ReactRouter
    React --> MUI
    React --> XTerm
    React --> WSClient

    %% Frontend to API
    ReactRouter --> Gateway
    WSClient --> WSServer

    %% API Gateway Flow
    Gateway --> CORS
    CORS --> JWT
    JWT --> RateLimit
    RateLimit --> Routes
    RateLimit --> WSServer

    %% Routes to Services
    Routes --> AuthService
    Routes --> UserService
    Routes --> TeamService
    Routes --> ProjectService
    Routes --> EnvService
    Routes --> SessionService
    Routes --> ExtService
    Routes --> LogService

    %% WebSocket to Services
    WSServer --> WSService
    WSService --> LogService
    WSService --> EnvService
    WSService --> DockerService

    %% Services to Data
    AuthService --> Prisma
    UserService --> Prisma
    TeamService --> Prisma
    ProjectService --> Prisma
    EnvService --> Prisma
    SessionService --> Prisma
    ExtService --> Prisma
    LogService --> Prisma

    %% Prisma to Database
    Prisma --> PostgreSQL

    %% Cache Integration
    AuthService -.-> RedisCache
    EnvService -.-> RedisCache
    SessionService -.-> RedisCache

    %% External Service Integration
    AuthService --> OAuth
    EnvService --> DockerService
    DockerService --> Docker
    SessionService --> Docker
    Docker --> VSCode
    Docker --> Tmux

    %% Infrastructure
    K8s --> Gateway
    K8s --> PostgreSQL
    K8s --> Docker
    Ingress --> K8s
    PV --> PostgreSQL
    Secrets --> Gateway

    %% Styling
    classDef frontend fill:#61dafb,stroke:#333,stroke-width:2px,color:#000
    classDef api fill:#68a063,stroke:#333,stroke-width:2px,color:#fff
    classDef service fill:#f39c12,stroke:#333,stroke-width:2px,color:#000
    classDef data fill:#336791,stroke:#333,stroke-width:2px,color:#fff
    classDef external fill:#e74c3c,stroke:#333,stroke-width:2px,color:#fff
    classDef infra fill:#9b59b6,stroke:#333,stroke-width:2px,color:#fff

    class Browser,CLI,React,ReactRouter,MUI,XTerm,WSClient frontend
    class Gateway,CORS,JWT,RateLimit,Routes,WSServer api
    class AuthService,UserService,TeamService,ProjectService,EnvService,SessionService,ExtService,LogService,DockerService,WSService service
    class Prisma,PostgreSQL,RedisCache data
    class Docker,VSCode,Tmux,OAuth external
    class K8s,Ingress,PV,Secrets infra
```

## Request/Response Flow

### REST API Request Flow

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant Auth as JWT Auth
    participant RateLimit
    participant Route
    participant Service
    participant Prisma
    participant DB as PostgreSQL

    Client->>Gateway: HTTP Request
    Gateway->>Auth: Verify JWT Token
    Auth->>Gateway: Token Valid
    Gateway->>RateLimit: Check Rate Limit
    RateLimit->>Gateway: Within Limit
    Gateway->>Route: Route Request
    Route->>Service: Business Logic
    Service->>Prisma: Query Data
    Prisma->>DB: SQL Query
    DB-->>Prisma: Result
    Prisma-->>Service: Data
    Service-->>Route: Response
    Route-->>Gateway: JSON Response
    Gateway-->>Client: HTTP 200 OK
```

### WebSocket Connection Flow

```mermaid
sequenceDiagram
    participant Client
    participant WSServer as WebSocket Server
    participant WSService
    participant Docker
    participant Container

    Client->>WSServer: WS Connect + JWT
    WSServer->>WSServer: Authenticate
    WSServer->>WSService: Subscribe to Events
    WSService->>Docker: Attach to Container
    Docker->>Container: Stream Logs
    Container-->>Docker: Log Data
    Docker-->>WSService: Stream
    WSService-->>WSServer: Emit Event
    WSServer-->>Client: WS Message

    Note over Client,Container: Continuous Streaming

    Container-->>Docker: More Logs
    Docker-->>WSService: Stream
    WSService-->>WSServer: Emit Event
    WSServer-->>Client: WS Message
```

## Component Communication

```mermaid
graph LR
    subgraph "Synchronous"
        REST[REST API<br/>HTTP/HTTPS]
        RPC[Internal RPC<br/>Function Calls]
    end

    subgraph "Asynchronous"
        WS[WebSocket<br/>Bidirectional]
        Events[Event Bus<br/>Node EventEmitter]
    end

    subgraph "Data Access"
        ORM[Prisma ORM<br/>Type-Safe Queries]
        Cache[Redis<br/>Session Store]
    end

    REST --> RPC
    WS --> Events
    RPC --> ORM
    Events --> ORM
    ORM --> Cache

    classDef sync fill:#3498db,stroke:#333,stroke-width:2px,color:#fff
    classDef async fill:#e67e22,stroke:#333,stroke-width:2px,color:#fff
    classDef data fill:#27ae60,stroke:#333,stroke-width:2px,color:#fff

    class REST,RPC sync
    class WS,Events async
    class ORM,Cache data
```

## Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TypeScript 5.x, Material-UI, Vite, xterm.js |
| **API** | Fastify, JWT, CORS, WebSocket, Rate Limiting |
| **Services** | Node.js 20, TypeScript, dockerode, Passport.js |
| **Data** | PostgreSQL 16, Prisma ORM, Redis |
| **Infrastructure** | Docker, Kubernetes, Nginx Ingress |
| **External** | GitHub OAuth, Google OAuth, VS Code Server |

## Deployment Architecture

```mermaid
graph TB
    subgraph "Edge Layer"
        CDN[CDN<br/>Static Assets]
        LB[Load Balancer<br/>SSL Termination]
    end

    subgraph "Kubernetes Cluster"
        direction TB
        Ingress[Ingress Controller]

        subgraph "Frontend Pods"
            Frontend1[Frontend Pod 1]
            Frontend2[Frontend Pod 2]
        end

        subgraph "Backend Pods"
            Backend1[Backend Pod 1]
            Backend2[Backend Pod 2]
            Backend3[Backend Pod 3]
        end

        subgraph "Data Tier"
            PG[PostgreSQL<br/>StatefulSet]
            Redis[Redis<br/>StatefulSet]
        end

        subgraph "Docker Hosts"
            Docker1[Docker Host 1]
            Docker2[Docker Host 2]
        end
    end

    subgraph "External"
        PV[Persistent Volumes]
        Secrets[Secret Manager]
    end

    CDN --> LB
    LB --> Ingress
    Ingress --> Frontend1
    Ingress --> Frontend2
    Ingress --> Backend1
    Ingress --> Backend2
    Ingress --> Backend3

    Backend1 --> PG
    Backend2 --> PG
    Backend3 --> PG
    Backend1 --> Redis
    Backend2 --> Redis
    Backend3 --> Redis
    Backend1 --> Docker1
    Backend2 --> Docker2
    Backend3 --> Docker1

    PG --> PV
    Redis --> PV
    Backend1 --> Secrets
    Backend2 --> Secrets
    Backend3 --> Secrets

    classDef edge fill:#e74c3c,stroke:#333,stroke-width:2px,color:#fff
    classDef app fill:#3498db,stroke:#333,stroke-width:2px,color:#fff
    classDef data fill:#27ae60,stroke:#333,stroke-width:2px,color:#fff
    classDef external fill:#95a5a6,stroke:#333,stroke-width:2px,color:#fff

    class CDN,LB edge
    class Ingress,Frontend1,Frontend2,Backend1,Backend2,Backend3 app
    class PG,Redis,Docker1,Docker2 data
    class PV,Secrets external
```

## Security Layers

```mermaid
graph TD
    Internet[Internet]

    subgraph "Security Layers"
        WAF[Web Application Firewall]
        TLS[TLS 1.3 Encryption]
        RateLimit[Rate Limiting]
        JWT[JWT Authentication]
        RBAC[RBAC Authorization]
        InputVal[Input Validation]
        SQLInj[SQL Injection Prevention<br/>Prisma ORM]
        Encryption[Data Encryption at Rest]
    end

    Internet --> WAF
    WAF --> TLS
    TLS --> RateLimit
    RateLimit --> JWT
    JWT --> RBAC
    RBAC --> InputVal
    InputVal --> SQLInj
    SQLInj --> Encryption

    classDef security fill:#e74c3c,stroke:#333,stroke-width:3px,color:#fff
    class WAF,TLS,RateLimit,JWT,RBAC,InputVal,SQLInj,Encryption security
```

## Performance Optimization

- **Caching**: Redis for sessions, JWT blacklist, environment state
- **Connection Pooling**: PostgreSQL connection pool (max 20 connections)
- **Horizontal Scaling**: Multiple backend pods with load balancing
- **Resource Limits**: CPU/Memory limits on Docker containers
- **Database Indexes**: Optimized queries with composite indexes
- **WebSocket**: Efficient real-time updates without polling
- **CDN**: Static asset delivery at edge locations

## Monitoring & Observability

```mermaid
graph LR
    subgraph "Application"
        App[VibeBox]
    end

    subgraph "Monitoring"
        Logs[Structured Logging<br/>Pino]
        Metrics[Prometheus Metrics]
        Traces[Distributed Tracing<br/>OpenTelemetry]
    end

    subgraph "Aggregation"
        Grafana[Grafana<br/>Dashboards]
        AlertManager[Alert Manager]
    end

    App --> Logs
    App --> Metrics
    App --> Traces
    Logs --> Grafana
    Metrics --> Grafana
    Traces --> Grafana
    Grafana --> AlertManager

    classDef app fill:#3498db,stroke:#333,stroke-width:2px,color:#fff
    classDef monitor fill:#f39c12,stroke:#333,stroke-width:2px,color:#000
    classDef agg fill:#27ae60,stroke:#333,stroke-width:2px,color:#fff

    class App app
    class Logs,Metrics,Traces monitor
    class Grafana,AlertManager agg
```
