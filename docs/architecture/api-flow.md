# API Architecture Flow

## Complete API Request Flow

This diagram shows the complete flow of an API request through VibeBox's backend architecture.

```mermaid
sequenceDiagram
    autonumber
    participant Client as Client<br/>(Browser/CLI)
    participant Gateway as API Gateway<br/>(Fastify)
    participant CORS as CORS<br/>Middleware
    participant JWT as JWT Auth<br/>Middleware
    participant RateLimit as Rate Limiter<br/>Middleware
    participant Route as Route Handler
    participant Validate as Validation<br/>Middleware
    participant Authorize as Authorization<br/>Middleware
    participant Service as Service Layer
    participant Prisma as Prisma ORM
    participant Cache as Redis Cache
    participant DB as PostgreSQL

    Client->>Gateway: HTTP Request<br/>(with JWT token)

    Note over Gateway,CORS: Middleware Chain

    Gateway->>CORS: Check Origin
    CORS->>Gateway: ✓ CORS Headers Added

    Gateway->>JWT: Verify JWT Token
    JWT->>JWT: Decode & Validate
    alt Token Invalid/Expired
        JWT-->>Client: 401 Unauthorized
    else Token Valid
        JWT->>Gateway: ✓ User Authenticated
    end

    Gateway->>RateLimit: Check Rate Limit
    RateLimit->>Cache: Get Request Count
    Cache-->>RateLimit: Count
    alt Rate Limit Exceeded
        RateLimit-->>Client: 429 Too Many Requests
    else Within Limit
        RateLimit->>Cache: Increment Count
        RateLimit->>Gateway: ✓ Rate Limit OK
    end

    Gateway->>Route: Route to Handler

    Note over Route,Service: Request Processing

    Route->>Validate: Validate Request Body
    alt Validation Failed
        Validate-->>Client: 400 Bad Request
    else Validation Passed
        Validate->>Route: ✓ Valid Request
    end

    Route->>Authorize: Check Permissions
    Authorize->>Service: Get User Permissions
    Service->>Prisma: Query User + Team Roles
    Prisma->>DB: SELECT permissions
    DB-->>Prisma: Permissions Data
    Prisma-->>Service: User Context
    Service-->>Authorize: User Roles
    alt Permission Denied
        Authorize-->>Client: 403 Forbidden
    else Permission Granted
        Authorize->>Route: ✓ Authorized
    end

    Route->>Service: Execute Business Logic

    Note over Service,DB: Data Layer

    Service->>Service: Business Rules

    opt Check Cache
        Service->>Cache: Get Cached Data
        alt Cache Hit
            Cache-->>Service: Cached Result
            Service-->>Route: Response Data
        else Cache Miss
            Cache-->>Service: Not Found
        end
    end

    Service->>Prisma: Query/Mutation
    Prisma->>DB: SQL Query
    DB-->>Prisma: Result Set
    Prisma-->>Service: Typed Data

    opt Update Cache
        Service->>Cache: Set Cache
    end

    Service-->>Route: Response Data

    Route->>Route: Format Response
    Route-->>Gateway: JSON Response
    Gateway-->>Client: HTTP 200 OK + Data

    Note over Client,DB: Success Response
```

## Error Handling Flow

```mermaid
graph TD
    Request[Incoming Request]
    Request --> TryCatch{Try/Catch<br/>Wrapper}

    TryCatch -->|Exception| ErrorType{Error Type?}

    ErrorType -->|ValidationError| E1[400 Bad Request]
    ErrorType -->|UnauthorizedError| E2[401 Unauthorized]
    ErrorType -->|ForbiddenError| E3[403 Forbidden]
    ErrorType -->|NotFoundError| E4[404 Not Found]
    ErrorType -->|ConflictError| E5[409 Conflict]
    ErrorType -->|RateLimitError| E6[429 Too Many Requests]
    ErrorType -->|DatabaseError| E7[500 Internal Server Error]
    ErrorType -->|UnknownError| E8[500 Internal Server Error]

    E1 --> Logger[Log Error<br/>Pino Logger]
    E2 --> Logger
    E3 --> Logger
    E4 --> Logger
    E5 --> Logger
    E6 --> Logger
    E7 --> Logger
    E8 --> Logger

    Logger --> Response[Format Error Response]
    Response --> Client[Return to Client]

    TryCatch -->|Success| Success[Format Success Response]
    Success --> Client

    classDef error fill:#e74c3c,stroke:#333,stroke-width:2px,color:#fff
    classDef success fill:#27ae60,stroke:#333,stroke-width:2px,color:#fff
    classDef process fill:#3498db,stroke:#333,stroke-width:2px,color:#fff

    class E1,E2,E3,E4,E5,E6,E7,E8 error
    class Success success
    class TryCatch,ErrorType,Logger,Response process
```

## Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant AuthMiddleware
    participant JWTService
    participant AuthzMiddleware
    participant Service
    participant DB

    Client->>Gateway: Request with Authorization Header
    Gateway->>AuthMiddleware: Extract Token

    alt No Token
        AuthMiddleware-->>Client: 401 Unauthorized
    end

    AuthMiddleware->>JWTService: Verify Token
    JWTService->>JWTService: Decode & Validate Signature

    alt Token Expired
        JWTService-->>Client: 401 Token Expired
    end

    alt Token Invalid
        JWTService-->>Client: 401 Invalid Token
    end

    JWTService-->>AuthMiddleware: Decoded Payload {userId, email}

    AuthMiddleware->>AuthMiddleware: Attach user to request.user
    AuthMiddleware->>Gateway: ✓ Authenticated

    Gateway->>AuthzMiddleware: Check Authorization

    AuthzMiddleware->>Service: Get User Context
    Service->>DB: SELECT user, user_teams, roles
    DB-->>Service: User + Roles

    AuthzMiddleware->>AuthzMiddleware: Check Resource Permissions

    alt User owns resource
        AuthzMiddleware->>Gateway: ✓ Authorized (Owner)
    else User in team with access
        AuthzMiddleware->>Gateway: ✓ Authorized (Team Member)
    else User is admin
        AuthzMiddleware->>Gateway: ✓ Authorized (Admin)
    else No access
        AuthzMiddleware-->>Client: 403 Forbidden
    end

    Gateway->>Service: Execute Request
    Service-->>Client: 200 OK + Data
```

## RBAC (Role-Based Access Control)

```mermaid
graph TB
    User[User Request]
    User --> CheckOwner{Resource<br/>Owner?}

    CheckOwner -->|Yes| AllowOwner[✓ Full Access]
    CheckOwner -->|No| CheckTeam{Team<br/>Member?}

    CheckTeam -->|Yes| CheckRole{User Role?}
    CheckTeam -->|No| Deny[✗ 403 Forbidden]

    CheckRole -->|admin| AllowAdmin[✓ Full Access<br/>+ Team Management]
    CheckRole -->|developer| AllowDev[✓ Create/Manage<br/>Environments]
    CheckRole -->|viewer| AllowViewer[✓ Read-Only<br/>Access]

    AllowOwner --> Success[Allow Request]
    AllowAdmin --> Success
    AllowDev --> Success
    AllowViewer --> Success
    Deny --> Reject[Reject Request]

    classDef allow fill:#27ae60,stroke:#333,stroke-width:2px,color:#fff
    classDef deny fill:#e74c3c,stroke:#333,stroke-width:2px,color:#fff
    classDef check fill:#3498db,stroke:#333,stroke-width:2px,color:#fff

    class AllowOwner,AllowAdmin,AllowDev,AllowViewer,Success allow
    class Deny,Reject deny
    class CheckOwner,CheckTeam,CheckRole check
```

## Service Layer Architecture

```mermaid
graph TB
    subgraph "Controller Layer"
        Routes[Route Handlers<br/>HTTP/WS Endpoints]
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
    end

    subgraph "Data Access Layer"
        Prisma[Prisma ORM]
        Cache[Redis Cache]
    end

    subgraph "External APIs"
        Docker[Docker Engine]
        OAuth[OAuth Providers]
    end

    Routes --> AuthService
    Routes --> UserService
    Routes --> TeamService
    Routes --> ProjectService
    Routes --> EnvService
    Routes --> SessionService
    Routes --> ExtService
    Routes --> LogService

    AuthService --> Prisma
    AuthService --> Cache
    AuthService --> OAuth

    UserService --> Prisma
    UserService --> Cache

    TeamService --> Prisma

    ProjectService --> Prisma

    EnvService --> Prisma
    EnvService --> DockerService
    EnvService --> Cache

    SessionService --> Prisma
    SessionService --> DockerService

    ExtService --> Prisma
    ExtService --> DockerService

    LogService --> Prisma
    LogService --> DockerService

    DockerService --> Docker

    classDef controller fill:#61dafb,stroke:#333,stroke-width:2px,color:#000
    classDef service fill:#f39c12,stroke:#333,stroke-width:2px,color:#000
    classDef data fill:#336791,stroke:#333,stroke-width:2px,color:#fff
    classDef external fill:#e74c3c,stroke:#333,stroke-width:2px,color:#fff

    class Routes controller
    class AuthService,UserService,TeamService,ProjectService,EnvService,SessionService,ExtService,LogService,DockerService service
    class Prisma,Cache data
    class Docker,OAuth external
```

## Middleware Chain

```mermaid
graph LR
    Request[Incoming<br/>Request]

    Request --> M1[1. CORS<br/>Cross-Origin]
    M1 --> M2[2. Logging<br/>Request Logger]
    M2 --> M3[3. JWT Auth<br/>Verify Token]
    M3 --> M4[4. Rate Limit<br/>Throttle]
    M4 --> M5[5. Body Parser<br/>JSON/Form]
    M5 --> M6[6. Validation<br/>Schema Check]
    M6 --> M7[7. Authorization<br/>Permission Check]
    M7 --> Handler[Route<br/>Handler]

    Handler --> Response[Response]

    classDef middleware fill:#3498db,stroke:#333,stroke-width:2px,color:#fff
    classDef endpoint fill:#27ae60,stroke:#333,stroke-width:2px,color:#fff

    class M1,M2,M3,M4,M5,M6,M7 middleware
    class Request,Handler,Response endpoint
```

## Caching Strategy

```mermaid
graph TD
    Request[API Request]
    Request --> CheckCache{Cache<br/>Enabled?}

    CheckCache -->|Yes| TryCache[Try Redis Cache]
    CheckCache -->|No| QueryDB[Query Database]

    TryCache --> CacheHit{Cache<br/>Hit?}

    CacheHit -->|Yes| Return1[Return Cached Data]
    CacheHit -->|No| QueryDB

    QueryDB --> DBResult[Database Result]
    DBResult --> SetCache[Set Cache<br/>TTL: 5-60 min]
    SetCache --> Return2[Return Fresh Data]

    Return1 --> Response[Response to Client]
    Return2 --> Response

    Note1[Cached Entities:<br/>• User sessions<br/>• User permissions<br/>• Environment state<br/>• Team memberships]

    classDef cache fill:#e67e22,stroke:#333,stroke-width:2px,color:#fff
    classDef db fill:#336791,stroke:#333,stroke-width:2px,color:#fff
    classDef process fill:#3498db,stroke:#333,stroke-width:2px,color:#fff

    class TryCache,CacheHit,SetCache cache
    class QueryDB,DBResult db
    class Request,CheckCache,Return1,Return2,Response process
```

## Database Transaction Flow

```mermaid
sequenceDiagram
    participant Service
    participant Prisma
    participant DB

    Note over Service,DB: Complex Multi-Step Operation

    Service->>Prisma: Begin Transaction
    Prisma->>DB: START TRANSACTION

    Service->>Prisma: Step 1: Create Project
    Prisma->>DB: INSERT INTO projects
    DB-->>Prisma: Project ID

    Service->>Prisma: Step 2: Create Environment
    Prisma->>DB: INSERT INTO environments
    DB-->>Prisma: Environment ID

    Service->>Prisma: Step 3: Create Default Ports
    Prisma->>DB: INSERT INTO environment_ports
    DB-->>Prisma: Port IDs

    alt All Steps Successful
        Service->>Prisma: Commit Transaction
        Prisma->>DB: COMMIT
        DB-->>Service: ✓ All Changes Persisted
    else Any Step Failed
        Service->>Prisma: Rollback Transaction
        Prisma->>DB: ROLLBACK
        DB-->>Service: ✗ All Changes Reverted
    end
```

## API Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "example",
    ...
  },
  "meta": {
    "timestamp": "2025-10-01T12:00:00Z",
    "requestId": "req-123"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "name",
        "issue": "Name is required"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-10-01T12:00:00Z",
    "requestId": "req-123"
  }
}
```

## Performance Optimizations

```mermaid
mindmap
  root((API Performance))
    Caching
      Redis Session Store
      User Permission Cache
      Environment State Cache
      TTL: 5-60 minutes
    Database
      Connection Pooling
      Prepared Statements
      Composite Indexes
      Query Optimization
    Middleware
      Early Return
      Short-Circuit Evaluation
      Async Processing
    Rate Limiting
      Per-User Limits
      Per-IP Limits
      Burst Allowance
    Monitoring
      Prometheus Metrics
      Response Time Tracking
      Error Rate Monitoring
```

## Common API Patterns

### Pagination
```mermaid
sequenceDiagram
    Client->>API: GET /environments?page=2&limit=20
    API->>Service: Get Paginated Data
    Service->>Prisma: skip: 20, take: 20
    Prisma->>DB: SELECT ... LIMIT 20 OFFSET 20
    DB-->>Prisma: 20 rows
    Service->>Prisma: Count Total
    Prisma->>DB: SELECT COUNT(*)
    DB-->>Prisma: total: 150
    API-->>Client: {data: [...], total: 150, page: 2, pages: 8}
```

### Filtering & Sorting
```mermaid
sequenceDiagram
    Client->>API: GET /environments?status=running&sort=-createdAt
    API->>Service: Parse Query Params
    Service->>Service: Build Prisma Query
    Service->>Prisma: where: {status: 'running'}<br/>orderBy: {createdAt: 'desc'}
    Prisma->>DB: SELECT ... WHERE status='running'<br/>ORDER BY created_at DESC
    DB-->>API: Filtered & Sorted Results
    API-->>Client: JSON Response
```

## Security Layers in API

1. **Network Layer**: TLS 1.3, HTTPS only
2. **Gateway Layer**: CORS, Rate Limiting
3. **Authentication**: JWT token verification
4. **Authorization**: RBAC + Resource ownership
5. **Input Validation**: Schema validation (Zod)
6. **SQL Injection**: Prisma ORM (parameterized queries)
7. **XSS Protection**: Output sanitization
8. **CSRF Protection**: SameSite cookies
9. **Audit Logging**: All mutations logged
10. **Error Handling**: No sensitive data in errors
