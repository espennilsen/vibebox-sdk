# Database Entity Relationship Diagram

## Complete ERD - Mermaid Format

This diagram shows all 10 entities in the VibeBox database with their relationships, keys, and cardinality.

```mermaid
erDiagram
    User ||--o{ Project : "owns (XOR with Team)"
    User ||--o{ UserTeam : "member of"
    User ||--o{ Environment : "creates"

    Team ||--o{ UserTeam : "has members"
    Team ||--o{ Project : "owns (XOR with User)"

    Project ||--o{ Environment : "contains"

    Environment ||--o{ Session : "has"
    Environment ||--o{ EnvironmentPort : "exposes"
    Environment ||--o{ EnvironmentVariable : "configures"
    Environment ||--o{ EnvironmentExtension : "installs"
    Environment ||--o{ LogEntry : "produces"

    Extension ||--o{ EnvironmentExtension : "installed in"

    User {
        uuid id PK
        string email UK "Unique, valid email"
        string password_hash "Nullable for OAuth"
        string display_name "1-100 chars"
        string avatar_url "Nullable"
        string timezone "Default: UTC"
        string locale "Default: en-US"
        text ssh_public_key "Nullable"
        jsonb notification_settings "Default: {}"
        timestamp created_at
        timestamp updated_at
        timestamp last_login_at "Nullable"
    }

    Team {
        uuid id PK
        string name "1-100 chars"
        string slug UK "Unique, URL-friendly"
        text description "Nullable"
        string avatar_url "Nullable"
        timestamp created_at
        timestamp updated_at
    }

    UserTeam {
        uuid id PK
        uuid user_id FK
        uuid team_id FK
        enum role "admin, developer, viewer"
        timestamp joined_at
    }

    Project {
        uuid id PK
        string name
        string slug "Unique per owner"
        text description "Nullable"
        uuid owner_id FK "Nullable, XOR with team_id"
        uuid team_id FK "Nullable, XOR with owner_id"
        boolean is_archived "Default: false"
        timestamp created_at
        timestamp updated_at
    }

    Environment {
        uuid id PK
        string name
        string slug "Unique per project"
        text description "Nullable"
        uuid project_id FK
        uuid creator_id FK
        string base_image "Docker image"
        string container_id "Nullable, Docker ID"
        enum status "stopped, starting, running, stopping, error"
        text error_message "Nullable"
        decimal cpu_limit "Default: 2.0, 4.2 precision"
        integer memory_limit "Default: 4096 MB"
        integer storage_limit "Default: 20480 MB"
        timestamp created_at
        timestamp updated_at
        timestamp started_at "Nullable"
        timestamp stopped_at "Nullable"
    }

    EnvironmentPort {
        uuid id PK
        uuid environment_id FK
        integer container_port "1-65535"
        integer host_port "Nullable, 1024-65535 or auto"
        enum protocol "tcp, udp, Default: tcp"
        string description "Nullable"
    }

    EnvironmentVariable {
        uuid id PK
        uuid environment_id FK
        string key "Uppercase alphanumeric + underscore"
        text value "Encrypted if is_encrypted=true"
        boolean is_encrypted "Default: false"
        timestamp created_at
        timestamp updated_at
    }

    Session {
        uuid id PK
        uuid environment_id FK
        enum session_type "vscode_server, tmux, shell"
        string session_name
        enum status "starting, active, idle, terminated"
        string connection_url "Nullable"
        integer pid "Nullable, Process ID"
        timestamp created_at
        timestamp last_activity_at
        integer idle_timeout_minutes "Default: 30"
        timestamp terminated_at "Nullable"
    }

    Extension {
        uuid id PK
        string extension_id UK "publisher.name format"
        string name
        string version "Semver format"
        text description "Nullable"
        string publisher
        string icon_url "Nullable"
        boolean is_custom "Default: false"
        string download_url "Nullable, for custom ext"
        timestamp created_at
        timestamp updated_at
    }

    EnvironmentExtension {
        uuid id PK
        uuid environment_id FK
        uuid extension_id FK
        enum status "pending, installing, installed, failed, uninstalling"
        text error_message "Nullable"
        timestamp installed_at "Nullable"
        timestamp created_at
    }

    LogEntry {
        uuid id PK
        uuid environment_id FK
        timestamp timestamp "Log timestamp"
        enum stream "stdout, stderr"
        text message "Log content"
        timestamp created_at
    }
```

## Entity Relationships with Cardinality

```mermaid
graph TB
    subgraph "User & Team Management"
        User[User<br/>___<br/>id PK<br/>email UK<br/>password_hash<br/>display_name]

        Team[Team<br/>___<br/>id PK<br/>name<br/>slug UK]

        UserTeam[UserTeam<br/>___<br/>id PK<br/>user_id FK<br/>team_id FK<br/>role]
    end

    subgraph "Project Management"
        Project[Project<br/>___<br/>id PK<br/>name<br/>slug<br/>owner_id FK XOR team_id FK]
    end

    subgraph "Environment & Sessions"
        Environment[Environment<br/>___<br/>id PK<br/>name<br/>project_id FK<br/>base_image<br/>container_id<br/>status]

        Session[Session<br/>___<br/>id PK<br/>environment_id FK<br/>session_type<br/>status]
    end

    subgraph "Environment Configuration"
        EnvPort[EnvironmentPort<br/>___<br/>id PK<br/>environment_id FK<br/>container_port<br/>host_port]

        EnvVar[EnvironmentVariable<br/>___<br/>id PK<br/>environment_id FK<br/>key<br/>value<br/>is_encrypted]
    end

    subgraph "Extensions"
        Extension[Extension<br/>___<br/>id PK<br/>extension_id UK<br/>name<br/>version]

        EnvExt[EnvironmentExtension<br/>___<br/>id PK<br/>environment_id FK<br/>extension_id FK<br/>status]
    end

    subgraph "Logging"
        LogEntry[LogEntry<br/>___<br/>id PK<br/>environment_id FK<br/>timestamp<br/>stream<br/>message]
    end

    User -->|"1:N"| UserTeam
    Team -->|"1:N"| UserTeam

    User -->|"1:N (XOR)"| Project
    Team -->|"1:N (XOR)"| Project

    User -->|"1:N"| Environment
    Project -->|"1:N"| Environment

    Environment -->|"1:N"| Session
    Environment -->|"1:N"| EnvPort
    Environment -->|"1:N"| EnvVar
    Environment -->|"1:N"| EnvExt
    Environment -->|"1:N"| LogEntry

    Extension -->|"1:N"| EnvExt

    classDef userEntity fill:#61dafb,stroke:#333,stroke-width:2px,color:#000
    classDef projectEntity fill:#f39c12,stroke:#333,stroke-width:2px,color:#000
    classDef envEntity fill:#27ae60,stroke:#333,stroke-width:2px,color:#fff
    classDef configEntity fill:#3498db,stroke:#333,stroke-width:2px,color:#fff
    classDef extEntity fill:#9b59b6,stroke:#333,stroke-width:2px,color:#fff
    classDef logEntity fill:#95a5a6,stroke:#333,stroke-width:2px,color:#000

    class User,Team,UserTeam userEntity
    class Project projectEntity
    class Environment,Session envEntity
    class EnvPort,EnvVar configEntity
    class Extension,EnvExt extEntity
    class LogEntry logEntity
```

## Database Indexes

```mermaid
graph LR
    subgraph "Primary Keys (All Tables)"
        PK[UUID Primary Key<br/>Auto-generated<br/>Clustered Index]
    end

    subgraph "Unique Constraints"
        UK1[User.email]
        UK2[Team.slug]
        UK3[Extension.extension_id]
        UK4[Project: slug + owner_id]
        UK5[Project: slug + team_id]
        UK6[Environment: project_id + slug]
        UK7[UserTeam: user_id + team_id]
        UK8[EnvironmentPort: env_id + container_port]
        UK9[EnvironmentVariable: env_id + key]
        UK10[Session: env_id + type + name]
        UK11[EnvironmentExtension: env_id + ext_id]
    end

    subgraph "Foreign Key Indexes"
        FK1[UserTeam.team_id]
        FK2[Project.owner_id]
        FK3[Project.team_id]
        FK4[Environment.project_id]
        FK5[Environment.creator_id]
        FK6[All environment_id FKs]
    end

    subgraph "Query Optimization Indexes"
        IDX1[User.created_at<br/>Analytics queries]
        IDX2[Team.name<br/>Search queries]
        IDX3[Environment.status<br/>Dashboard filtering]
        IDX4[Environment.container_id<br/>Docker lookups]
        IDX5[Session.status<br/>Active session queries]
        IDX6[Session.last_activity_at<br/>Idle timeout cleanup]
        IDX7[LogEntry: env_id + timestamp DESC<br/>Log retrieval]
        IDX8[LogEntry.created_at<br/>Retention cleanup]
        IDX9[Extension.publisher<br/>Marketplace filtering]
        IDX10[EnvironmentExtension.status<br/>Installation tracking]
        IDX11[EnvironmentPort.host_port<br/>Port allocation]
    end

    PK --> UK1
    UK1 --> FK1
    FK1 --> IDX1
```

## XOR Constraint - Project Ownership

Projects must be owned by EXACTLY ONE of:
- A User (personal project)
- A Team (team project)

```mermaid
stateDiagram-v2
    [*] --> CheckOwnership

    CheckOwnership --> UserOwned : owner_id IS NOT NULL<br/>AND team_id IS NULL
    CheckOwnership --> TeamOwned : team_id IS NOT NULL<br/>AND owner_id IS NULL
    CheckOwnership --> Invalid : Both NULL<br/>OR Both NOT NULL

    UserOwned --> ValidProject
    TeamOwned --> ValidProject
    Invalid --> [*] : Reject with Error

    ValidProject --> [*]

    note right of CheckOwnership
        Application-level constraint
        Enforced in service layer
        Database allows nullable both
    end note
```

## Cascade Delete Behavior

```mermaid
graph TD
    User[User Deleted]
    Team[Team Deleted]
    Project[Project Deleted]
    Environment[Environment Deleted]

    User -->|CASCADE| UserTeam1[UserTeam<br/>membership removed]
    User -->|CASCADE| Project1[Personal Projects<br/>deleted]

    Team -->|CASCADE| UserTeam2[All UserTeam<br/>memberships removed]
    Team -->|CASCADE| Project2[Team Projects<br/>deleted]

    Project -->|CASCADE| Environment1[All Environments<br/>deleted]

    Environment -->|CASCADE| Session[Sessions terminated]
    Environment -->|CASCADE| EnvPort[Ports released]
    Environment -->|CASCADE| EnvVar[Variables removed]
    Environment -->|CASCADE| EnvExt[Extensions uninstalled]
    Environment -->|CASCADE| LogEntry[Logs deleted]

    Extension[Extension Deleted] -->|CASCADE| EnvExt2[EnvironmentExtension<br/>removed from all envs]

    classDef deleteAction fill:#e74c3c,stroke:#333,stroke-width:2px,color:#fff
    classDef cascadeAction fill:#f39c12,stroke:#333,stroke-width:2px,color:#000

    class User,Team,Project,Environment,Extension deleteAction
    class UserTeam1,UserTeam2,Project1,Project2,Environment1,Session,EnvPort,EnvVar,EnvExt,EnvExt2,LogEntry cascadeAction
```

## Data Retention Policies

```mermaid
gantt
    title Log Retention & Cleanup Schedule
    dateFormat YYYY-MM-DD
    axisFormat %d

    section LogEntry
    Keep Logs         :active, 2025-01-01, 7d
    Auto Delete       :crit, 2025-01-08, 1d

    section Per Environment
    First 20MB        :active, 2025-01-01, 7d
    FIFO Rotation     :2025-01-02, 6d

    section Cleanup Job
    Daily at 3 AM     :milestone, 2025-01-01, 0d
    Daily at 3 AM     :milestone, 2025-01-02, 0d
    Daily at 3 AM     :milestone, 2025-01-03, 0d
```

**Retention Rules**:
- LogEntry: 7 days OR 20MB per environment (whichever reached first)
- Deleted environments: All related data cascades immediately
- Archived projects: Data retained but environments stopped
- Soft delete: Not implemented (hard deletes with cascade)

## Enum Types

### UserTeamRole
- `admin`: Full team management permissions
- `developer`: Create/manage projects and environments
- `viewer`: Read-only access

### EnvironmentStatus
- `stopped`: Not running, can be started
- `starting`: Container creation in progress
- `running`: Container active and healthy
- `stopping`: Shutdown in progress
- `error`: Failed state, requires intervention

### SessionType
- `vscode_server`: VS Code Server instance
- `tmux`: tmux session for terminal multiplexing
- `shell`: Simple shell session

### SessionStatus
- `starting`: Initializing
- `active`: Currently used
- `idle`: No activity for idle_timeout_minutes
- `terminated`: Stopped

### EnvironmentExtensionStatus
- `pending`: Queued for installation
- `installing`: Installation in progress
- `installed`: Successfully installed
- `failed`: Installation failed
- `uninstalling`: Removal in progress

### Protocol
- `tcp`: TCP protocol (default)
- `udp`: UDP protocol

### LogStream
- `stdout`: Standard output
- `stderr`: Standard error

## Constraints Summary

| Table | Unique Constraints | Foreign Keys | Check Constraints |
|-------|-------------------|--------------|-------------------|
| User | email | - | email format, display_name length |
| Team | slug | - | slug format (lowercase, 3-50 chars) |
| UserTeam | user_id + team_id | user_id, team_id | - |
| Project | slug + owner_id, slug + team_id | owner_id, team_id | XOR (owner_id, team_id) |
| Environment | project_id + slug | project_id, creator_id | cpu_limit > 0, memory > 0 |
| EnvironmentPort | env_id + container_port | environment_id | port ranges |
| EnvironmentVariable | env_id + key | environment_id | key format (uppercase) |
| Session | env_id + type + name | environment_id | idle_timeout > 0 |
| Extension | extension_id | - | semver format, extension_id format |
| EnvironmentExtension | env_id + extension_id | environment_id, extension_id | - |
| LogEntry | - | environment_id | timestamp valid |
