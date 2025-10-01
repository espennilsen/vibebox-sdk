# Environment Lifecycle State Diagram

## Complete Environment State Machine

```mermaid
stateDiagram-v2
    [*] --> stopped: Environment Created

    stopped --> starting: User Starts Environment
    starting --> running: Container Started Successfully
    starting --> error: Start Failed

    running --> stopping: User Stops Environment
    running --> error: Container Crashed

    stopping --> stopped: Container Stopped Successfully
    stopping --> error: Stop Failed

    error --> starting: User Retries Start
    error --> stopped: User Acknowledges Error

    running --> running: Health Check OK
    stopped --> [*]: Environment Deleted

    note right of stopped
        Container does not exist
        Resources: 0 CPU, 0 Memory
        Can be started
    end note

    note right of starting
        Creating/starting container
        Pulling image if needed
        Setting up volumes
        Timeout: 120s
    end note

    note right of running
        Container is active
        Resources allocated
        Sessions can connect
        Logs streaming
    end note

    note right of stopping
        Gracefully shutting down
        Sessions terminated
        SIGTERM → wait 30s → SIGKILL
    end note

    note right of error
        Failed state
        Error message logged
        Manual intervention may be needed
        Can retry or delete
    end note
```

## Environment Creation Flow

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant API
    participant EnvService as Environment<br/>Service
    participant DB as PostgreSQL
    participant Docker as Docker<br/>Service
    participant Container

    User->>API: POST /environments<br/>{name, projectId, baseImage}

    API->>API: Validate Request
    API->>API: Check Authorization

    API->>EnvService: Create Environment

    EnvService->>DB: BEGIN TRANSACTION

    EnvService->>DB: INSERT INTO environments<br/>status = 'stopped'
    DB-->>EnvService: Environment Record Created

    EnvService->>DB: INSERT INTO environment_ports<br/>(default ports)
    EnvService->>DB: INSERT INTO environment_variables<br/>(default env vars)

    EnvService->>DB: COMMIT TRANSACTION

    EnvService-->>API: Environment Created
    API-->>User: 201 Created {environment}

    Note over User,Container: Environment is created but NOT started
```

## Environment Start Flow

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant API
    participant EnvService
    participant DB
    participant Docker
    participant Registry as Docker<br/>Registry
    participant Container
    participant EventBus

    User->>API: POST /environments/{id}/start

    API->>EnvService: Start Environment

    EnvService->>DB: UPDATE environment<br/>SET status = 'starting'
    DB-->>EnvService: Updated

    EnvService->>EventBus: Emit('env:starting', {id})

    Note over EnvService,Container: Docker Container Creation

    EnvService->>Docker: Check if image exists
    Docker->>Docker: docker images | grep baseImage

    alt Image not found
        Docker->>Registry: Pull image
        Registry-->>Docker: Image layers
        Docker->>Docker: Extract & store
    end

    EnvService->>Docker: Create container config
    Docker->>Docker: Configure:<br/>• CPU limit<br/>• Memory limit<br/>• Volume mounts<br/>• Port mappings<br/>• Environment variables<br/>• Network

    EnvService->>Docker: docker.createContainer(config)
    Docker-->>EnvService: Container ID

    EnvService->>DB: UPDATE environment<br/>SET container_id = '{id}'

    EnvService->>Docker: docker.start(containerId)
    Docker->>Container: Start container

    alt Container starts successfully
        Container-->>Docker: Running
        Docker-->>EnvService: Started

        EnvService->>DB: UPDATE environment<br/>SET status = 'running',<br/>started_at = NOW()

        EnvService->>EventBus: Emit('env:running', {id})

        EnvService-->>API: Environment Running
        API-->>User: 200 OK {status: 'running'}

    else Container fails to start
        Docker-->>EnvService: Error

        EnvService->>DB: UPDATE environment<br/>SET status = 'error',<br/>error_message = '...'

        EnvService->>EventBus: Emit('env:error', {id, error})

        EnvService-->>API: Start Failed
        API-->>User: 500 Error {error}
    end
```

## Environment Stop Flow

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant API
    participant EnvService
    participant SessionService
    participant DB
    participant Docker
    participant Container
    participant EventBus

    User->>API: POST /environments/{id}/stop

    API->>EnvService: Stop Environment

    EnvService->>DB: UPDATE environment<br/>SET status = 'stopping'
    DB-->>EnvService: Updated

    EnvService->>EventBus: Emit('env:stopping', {id})

    Note over EnvService,Container: Graceful Shutdown

    EnvService->>SessionService: Terminate all sessions
    SessionService->>DB: UPDATE sessions<br/>SET status = 'terminated'
    SessionService->>Docker: Kill session processes

    EnvService->>Docker: docker.stop(containerId, {t: 30})
    Docker->>Container: Send SIGTERM

    Container->>Container: Graceful shutdown (30s)

    alt Container stops within 30s
        Container-->>Docker: Stopped
        Docker-->>EnvService: Stopped

        EnvService->>Docker: docker.remove(containerId)
        Docker-->>EnvService: Container removed

        EnvService->>DB: UPDATE environment<br/>SET status = 'stopped',<br/>stopped_at = NOW(),<br/>container_id = NULL

        EnvService->>EventBus: Emit('env:stopped', {id})

        EnvService-->>API: Environment Stopped
        API-->>User: 200 OK {status: 'stopped'}

    else Container doesn't stop
        Docker->>Container: Send SIGKILL
        Container-->>Docker: Killed

        EnvService->>DB: UPDATE environment<br/>SET status = 'stopped'

        EnvService-->>API: Environment Force Stopped
        API-->>User: 200 OK {status: 'stopped'}
    end
```

## Environment Health Monitoring

```mermaid
sequenceDiagram
    participant Monitor as Health<br/>Monitor
    participant EnvService
    participant Docker
    participant Container
    participant DB
    participant EventBus

    Note over Monitor,EventBus: Periodic Health Check (every 30s)

    loop Every 30 seconds
        Monitor->>EnvService: Check Running Environments

        EnvService->>DB: SELECT * FROM environments<br/>WHERE status = 'running'
        DB-->>EnvService: Running Environments

        loop For each environment
            EnvService->>Docker: docker.inspect(containerId)

            alt Container is running
                Docker-->>EnvService: {State: {Running: true}}
                Note over EnvService: Health check passed

            else Container is not running
                Docker-->>EnvService: {State: {Running: false, ExitCode: 137}}

                EnvService->>DB: UPDATE environment<br/>SET status = 'error',<br/>error_message = 'Container crashed'

                EnvService->>EventBus: Emit('env:error', {<br/>  id,<br/>  error: 'Container crashed',<br/>  exitCode: 137<br/>})

                Note over EnvService: Send alert to user
            end

            EnvService->>Docker: Get container stats
            Docker-->>EnvService: {cpu, memory, network}

            EnvService->>EventBus: Emit('env:metrics', {<br/>  id,<br/>  metrics: {...}<br/>})
        end
    end
```

## Resource Limit Enforcement

```mermaid
graph TB
    Start[Environment Starting]

    Start --> CheckLimits{Check<br/>Limits}

    CheckLimits --> ValidateCPU[Validate CPU Limit<br/>0.5 - 8.0 cores]
    ValidateCPU --> ValidateMem[Validate Memory<br/>512MB - 16GB]
    ValidateMem --> ValidateStorage[Validate Storage<br/>1GB - 100GB]

    ValidateStorage --> CreateConfig[Create Docker Config]

    CreateConfig --> SetCPU[Set CPU Limit<br/>--cpus={cpuLimit}]
    SetCPU --> SetMem[Set Memory Limit<br/>--memory={memoryLimit}m]
    SetMem --> SetStorage[Set Storage Limit<br/>--storage-opt size={storageLimit}m]

    SetStorage --> CreateContainer[Create Container]

    CreateContainer --> Monitor{Continuous<br/>Monitoring}

    Monitor -->|CPU > Limit| Throttle[CPU Throttling<br/>Container slowed]
    Monitor -->|Memory > Limit| OOM[OOM Kill<br/>Container terminated]
    Monitor -->|Storage > Limit| WriteError[Write Error<br/>No space left]

    Throttle --> Monitor
    OOM --> ErrorState[Environment<br/>status = error]
    WriteError --> Monitor

    classDef validate fill:#3498db,stroke:#333,stroke-width:2px,color:#fff
    classDef config fill:#f39c12,stroke:#333,stroke-width:2px,color:#000
    classDef limit fill:#e74c3c,stroke:#333,stroke-width:2px,color:#fff

    class CheckLimits,ValidateCPU,ValidateMem,ValidateStorage validate
    class CreateConfig,SetCPU,SetMem,SetStorage,CreateContainer config
    class Throttle,OOM,WriteError,ErrorState limit
```

## Auto-Stop Idle Environments

```mermaid
sequenceDiagram
    participant Scheduler
    participant EnvService
    participant DB
    participant Docker
    participant EventBus

    Note over Scheduler,EventBus: Hourly Idle Check

    Scheduler->>EnvService: Check Idle Environments

    EnvService->>DB: SELECT environments e<br/>JOIN sessions s ON e.id = s.environment_id<br/>WHERE e.status = 'running'<br/>AND s.last_activity_at < NOW() - INTERVAL '1 hour'
    DB-->>EnvService: Idle Environments

    loop For each idle environment
        EnvService->>EnvService: Check idle timeout setting

        alt Auto-stop enabled
            EnvService->>Docker: Stop Container
            Docker-->>EnvService: Stopped

            EnvService->>DB: UPDATE environment<br/>SET status = 'stopped',<br/>stopped_at = NOW()

            EnvService->>EventBus: Emit('env:auto-stopped', {<br/>  id,<br/>  reason: 'idle_timeout'<br/>})

            Note over EnvService: Send notification to user

        else Auto-stop disabled
            Note over EnvService: Log idle warning only
        end
    end
```

## Environment Deletion Flow

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant API
    participant EnvService
    participant Docker
    participant DB
    participant Storage

    User->>API: DELETE /environments/{id}

    API->>EnvService: Delete Environment

    EnvService->>DB: SELECT environment<br/>WHERE id = {id}
    DB-->>EnvService: Environment

    alt Environment is running
        EnvService->>EnvService: Stop environment first
        EnvService->>Docker: Stop & Remove Container
        Docker-->>EnvService: Container removed
    end

    Note over EnvService,Storage: Cascade Delete

    EnvService->>DB: BEGIN TRANSACTION

    EnvService->>DB: DELETE FROM log_entries<br/>WHERE environment_id = {id}
    EnvService->>DB: DELETE FROM sessions<br/>WHERE environment_id = {id}
    EnvService->>DB: DELETE FROM environment_extensions<br/>WHERE environment_id = {id}
    EnvService->>DB: DELETE FROM environment_variables<br/>WHERE environment_id = {id}
    EnvService->>DB: DELETE FROM environment_ports<br/>WHERE environment_id = {id}
    EnvService->>DB: DELETE FROM environments<br/>WHERE id = {id}

    EnvService->>DB: COMMIT TRANSACTION

    EnvService->>Storage: Delete environment volumes
    Storage-->>EnvService: Volumes deleted

    EnvService-->>API: Environment Deleted
    API-->>User: 204 No Content
```

## State Transition Matrix

| From State | To State | Trigger | Pre-conditions | Post-actions |
|-----------|---------|---------|----------------|--------------|
| stopped | starting | User start | Environment exists | Pull image, create container |
| starting | running | Container started | Image pulled, resources available | Update DB, emit event |
| starting | error | Start failed | Insufficient resources, image not found | Log error, notify user |
| running | stopping | User stop | Environment running | Terminate sessions |
| running | error | Container crashed | Container exited unexpectedly | Log error, notify user |
| stopping | stopped | Container stopped | Graceful shutdown complete | Update DB, clean up resources |
| stopping | error | Stop failed | Container unresponsive | Force kill container |
| error | starting | User retry | Error acknowledged | Retry with same config |
| error | stopped | User acknowledge | Error noted | Clean up partial resources |
| * | deleted | User delete | User has permission | Cascade delete all related data |

## Error Recovery Strategies

```mermaid
graph TD
    Error[Environment Error]

    Error --> ErrorType{Error Type?}

    ErrorType -->|Image Not Found| PullImage[Pull Image Again<br/>Retry start]
    ErrorType -->|Insufficient Resources| WaitResources[Wait for Resources<br/>Queue start request]
    ErrorType -->|Container Crashed| Inspect[Inspect Logs<br/>Notify user]
    ErrorType -->|Network Error| RetryNetwork[Retry with<br/>Exponential Backoff]
    ErrorType -->|Unknown Error| Manual[Manual Intervention<br/>Admin alert]

    PullImage --> Retry{Retry<br/>Count?}
    WaitResources --> Retry
    RetryNetwork --> Retry

    Retry -->|< 3 Retries| Starting[Attempt Start]
    Retry -->|>= 3 Retries| GiveUp[Give Up<br/>Status = error]

    Starting -->|Success| Running[Status = running]
    Starting -->|Failure| Error

    Inspect --> StayStopped[Status = error<br/>User can inspect logs]
    Manual --> StayStopped

    classDef errorState fill:#e74c3c,stroke:#333,stroke-width:2px,color:#fff
    classDef recovery fill:#f39c12,stroke:#333,stroke-width:2px,color:#000
    classDef success fill:#27ae60,stroke:#333,stroke-width:2px,color:#fff

    class Error,GiveUp,StayStopped errorState
    class ErrorType,PullImage,WaitResources,Inspect,RetryNetwork,Manual,Retry recovery
    class Starting,Running success
```

## Metrics & Observability

**State Duration Metrics**:
- Time in `starting` state (should be < 2 minutes)
- Time in `running` state (uptime)
- Time in `stopping` state (should be < 30 seconds)
- Time in `error` state (before recovery)

**State Transition Counters**:
- `stopped` → `starting` (start attempts)
- `starting` → `running` (successful starts)
- `starting` → `error` (failed starts)
- `running` → `stopping` (stop requests)
- `running` → `error` (crashes)

**Alerts**:
- Environment stuck in `starting` for > 5 minutes
- Environment stuck in `stopping` for > 2 minutes
- More than 3 consecutive start failures
- Container crash rate > 10% per hour
