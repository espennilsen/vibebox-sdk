# Data Model

**Feature**: VibeCode - Dev Environment Management Tool
**Date**: 2025-09-30
**Status**: Phase 1 Design

## Entity Relationship Diagram

```
User ──< UserTeam >── Team
 │                      │
 └──< Project >─────────┘
       │
       └──< Environment
              │
              ├──< Session
              ├──< EnvironmentExtension >── Extension
              ├──< EnvironmentPort
              ├──< EnvironmentVariable
              └──< LogEntry
```

## Core Entities

### User

Represents a developer using VibeCode.

**Fields**:
- `id` (UUID, PK): Unique user identifier
- `email` (String, Unique, Required): User email address
- `password_hash` (String, Nullable): Hashed password (null for OAuth-only users)
- `display_name` (String, Required): User's display name
- `avatar_url` (String, Nullable): Profile picture URL
- `timezone` (String, Default: UTC): User's timezone
- `locale` (String, Default: en-US): User's locale
- `ssh_public_key` (Text, Nullable): SSH public key for environment access
- `notification_settings` (JSONB, Default: {}): Notification preferences
- `created_at` (Timestamp): Account creation time
- `updated_at` (Timestamp): Last profile update
- `last_login_at` (Timestamp, Nullable): Last successful login

**Relationships**:
- Has many Projects (owner)
- Has many UserTeams (team memberships)
- Has many Environments (creator)

**Validation Rules**:
- Email must be valid format
- Display name: 1-100 characters
- SSH key must be valid public key format if provided

**Indexes**:
- Unique index on `email`
- Index on `created_at` for analytics

---

### Team

Represents an organization or team that can share resources.

**Fields**:
- `id` (UUID, PK): Unique team identifier
- `name` (String, Required): Team name
- `slug` (String, Unique, Required): URL-friendly team identifier
- `description` (Text, Nullable): Team description
- `avatar_url` (String, Nullable): Team logo/avatar
- `created_at` (Timestamp): Team creation time
- `updated_at` (Timestamp): Last team update

**Relationships**:
- Has many UserTeams (members)
- Has many Projects

**Validation Rules**:
- Name: 1-100 characters
- Slug: lowercase alphanumeric and hyphens only, 3-50 characters

**Indexes**:
- Unique index on `slug`
- Index on `name` for search

---

### UserTeam

Junction table for User-Team many-to-many relationship with roles.

**Fields**:
- `id` (UUID, PK): Unique membership identifier
- `user_id` (UUID, FK → User, Required): User reference
- `team_id` (UUID, FK → Team, Required): Team reference
- `role` (Enum, Required): Member role [admin, developer, viewer]
- `joined_at` (Timestamp): Membership start time

**Relationships**:
- Belongs to User
- Belongs to Team

**Validation Rules**:
- Unique constraint on (user_id, team_id)
- Role must be one of: admin, developer, viewer

**Indexes**:
- Unique index on `(user_id, team_id)`
- Index on `team_id` for team member queries

---

### Project

Organizational unit grouping related environments.

**Fields**:
- `id` (UUID, PK): Unique project identifier
- `name` (String, Required): Project name
- `slug` (String, Required): URL-friendly project identifier
- `description` (Text, Nullable): Project description
- `owner_id` (UUID, FK → User, Nullable): Individual owner (if not team-owned)
- `team_id` (UUID, FK → Team, Nullable): Team owner (if team-owned)
- `is_archived` (Boolean, Default: false): Archive status
- `created_at` (Timestamp): Project creation time
- `updated_at` (Timestamp): Last project update

**Relationships**:
- Belongs to User (owner) XOR Team (owner)
- Has many Environments

**Validation Rules**:
- Name: 1-100 characters
- Slug: lowercase alphanumeric and hyphens only, 3-50 characters
- Exactly one of owner_id or team_id must be set (not both, not neither)
- Unique constraint on (slug, owner_id) or (slug, team_id)

**Indexes**:
- Index on `owner_id`
- Index on `team_id`
- Composite unique index on `(slug, owner_id)`
- Composite unique index on `(slug, team_id)`

---

### Environment

Docker-based development environment.

**Fields**:
- `id` (UUID, PK): Unique environment identifier
- `name` (String, Required): Environment name
- `slug` (String, Required): URL-friendly environment identifier
- `description` (Text, Nullable): Environment description
- `project_id` (UUID, FK → Project, Required): Project reference
- `creator_id` (UUID, FK → User, Required): User who created this environment
- `base_image` (String, Required): Docker base image (e.g., "node:20")
- `container_id` (String, Nullable): Docker container ID (null if not created)
- `status` (Enum, Required): Environment status [stopped, starting, running, stopping, error]
- `error_message` (Text, Nullable): Error details if status=error
- `cpu_limit` (Decimal, Default: 2.0): CPU cores limit
- `memory_limit` (Integer, Default: 4096): Memory limit in MB
- `storage_limit` (Integer, Default: 20480): Storage limit in MB
- `created_at` (Timestamp): Environment creation time
- `updated_at` (Timestamp): Last environment update
- `started_at` (Timestamp, Nullable): Last successful start time
- `stopped_at` (Timestamp, Nullable): Last stop time

**Relationships**:
- Belongs to Project
- Belongs to User (creator)
- Has many Sessions
- Has many EnvironmentExtensions
- Has many EnvironmentPorts
- Has many EnvironmentVariables
- Has many LogEntries

**Validation Rules**:
- Name: 1-100 characters
- Slug: lowercase alphanumeric and hyphens only, 3-50 characters
- Unique constraint on (project_id, slug)
- Base image must follow Docker image format
- CPU limit: 0.1 to 8.0
- Memory limit: 512 to 16384 MB
- Storage limit: 1024 to 102400 MB
- Status must be one of: stopped, starting, running, stopping, error

**State Transitions**:
```
stopped → starting → running
running → stopping → stopped
any → error (on failure)
error → starting (on retry)
```

**Indexes**:
- Index on `project_id`
- Index on `creator_id`
- Index on `status` for filtering
- Composite unique index on `(project_id, slug)`
- Index on `container_id` for Docker operations

---

### EnvironmentPort

Port mappings for environment network access.

**Fields**:
- `id` (UUID, PK): Unique port mapping identifier
- `environment_id` (UUID, FK → Environment, Required): Environment reference
- `container_port` (Integer, Required): Port inside container
- `host_port` (Integer, Nullable): Port on host (null = auto-assign)
- `protocol` (Enum, Default: tcp): Protocol [tcp, udp]
- `description` (String, Nullable): Port purpose description

**Relationships**:
- Belongs to Environment

**Validation Rules**:
- Container port: 1-65535
- Host port: 1024-65535 or null
- Protocol must be: tcp or udp
- Unique constraint on (environment_id, container_port)
- Unique constraint on host_port (if not null)

**Indexes**:
- Index on `environment_id`
- Unique index on `host_port` (partial: where host_port IS NOT NULL)

---

### EnvironmentVariable

Environment variables for container runtime.

**Fields**:
- `id` (UUID, PK): Unique variable identifier
- `environment_id` (UUID, FK → Environment, Required): Environment reference
- `key` (String, Required): Variable name
- `value` (Text, Required): Variable value (encrypted if sensitive)
- `is_encrypted` (Boolean, Default: false): Encryption status
- `created_at` (Timestamp): Variable creation time
- `updated_at` (Timestamp): Last update time

**Relationships**:
- Belongs to Environment

**Validation Rules**:
- Key: uppercase alphanumeric and underscore only, 1-255 characters
- Value: max 4096 characters
- Unique constraint on (environment_id, key)

**Security**:
- Values with is_encrypted=true are AES-256 encrypted at rest
- Common secret patterns (API_KEY, SECRET, PASSWORD) automatically encrypted

**Indexes**:
- Composite unique index on `(environment_id, key)`

---

### Session

Active processes running inside an environment.

**Fields**:
- `id` (UUID, PK): Unique session identifier
- `environment_id` (UUID, FK → Environment, Required): Environment reference
- `session_type` (Enum, Required): Session type [vscode_server, tmux, shell]
- `session_name` (String, Required): Session identifier (e.g., tmux session name)
- `status` (Enum, Required): Session status [starting, active, idle, terminated]
- `connection_url` (String, Nullable): Connection endpoint (for VS Code Server)
- `pid` (Integer, Nullable): Process ID in container
- `created_at` (Timestamp): Session start time
- `last_activity_at` (Timestamp): Last detected activity
- `idle_timeout_minutes` (Integer, Default: 30): Idle timeout for cleanup
- `terminated_at` (Timestamp, Nullable): Session termination time

**Relationships**:
- Belongs to Environment

**Validation Rules**:
- Session type must be: vscode_server, tmux, shell
- Session name: 1-100 characters
- Status must be: starting, active, idle, terminated
- Idle timeout: 5-1440 minutes (5 min to 24 hours)
- Unique constraint on (environment_id, session_type, session_name)

**Lifecycle**:
- Automatically created when environment starts
- Marked idle after idle_timeout_minutes of inactivity
- Terminated when environment stops or idle cleanup runs

**Indexes**:
- Index on `environment_id`
- Index on `status` for cleanup queries
- Index on `last_activity_at` for idle detection
- Composite unique index on `(environment_id, session_type, session_name)`

---

### Extension

VS Code extension metadata (catalog).

**Fields**:
- `id` (UUID, PK): Unique extension identifier
- `extension_id` (String, Unique, Required): VS Code marketplace ID (e.g., "ms-python.python")
- `name` (String, Required): Display name
- `version` (String, Required): Extension version
- `description` (Text, Nullable): Extension description
- `publisher` (String, Required): Publisher name
- `icon_url` (String, Nullable): Extension icon URL
- `is_custom` (Boolean, Default: false): Custom (non-marketplace) extension
- `download_url` (String, Nullable): Custom extension download URL
- `created_at` (Timestamp): Catalog entry creation
- `updated_at` (Timestamp): Last update

**Relationships**:
- Has many EnvironmentExtensions

**Validation Rules**:
- Extension ID format: publisher.name
- Version follows semver format
- Custom extensions must have download_url

**Indexes**:
- Unique index on `extension_id`
- Index on `publisher` for filtering
- Index on `is_custom` for catalog separation

---

### EnvironmentExtension

Junction table for Environment-Extension relationship with installation status.

**Fields**:
- `id` (UUID, PK): Unique installation identifier
- `environment_id` (UUID, FK → Environment, Required): Environment reference
- `extension_id` (UUID, FK → Extension, Required): Extension reference
- `status` (Enum, Required): Installation status [pending, installing, installed, failed, uninstalling]
- `error_message` (Text, Nullable): Error details if status=failed
- `installed_at` (Timestamp, Nullable): Successful installation time
- `created_at` (Timestamp): Installation request time

**Relationships**:
- Belongs to Environment
- Belongs to Extension

**Validation Rules**:
- Status must be: pending, installing, installed, failed, uninstalling
- Unique constraint on (environment_id, extension_id)

**State Transitions**:
```
pending → installing → installed
installing → failed (on error)
installed → uninstalling → (deleted)
```

**Indexes**:
- Composite unique index on `(environment_id, extension_id)`
- Index on `status` for filtering

---

### LogEntry

Persistent log storage for environments.

**Fields**:
- `id` (UUID, PK): Unique log entry identifier
- `environment_id` (UUID, FK → Environment, Required): Environment reference
- `timestamp` (Timestamp, Required): Log timestamp
- `stream` (Enum, Required): Log stream [stdout, stderr]
- `message` (Text, Required): Log message content
- `created_at` (Timestamp): Entry creation time (for partitioning)

**Relationships**:
- Belongs to Environment

**Validation Rules**:
- Stream must be: stdout or stderr
- Message max length: 10,000 characters (long lines truncated)

**Retention Policy**:
- Logs older than 7 days automatically deleted (configurable)
- Per-environment log size limited to 20MB (FIFO rotation)

**Indexes**:
- Composite index on `(environment_id, timestamp DESC)` for log queries
- Index on `created_at` for retention cleanup

**Partitioning**:
- Consider partitioning by created_at (daily or weekly) for large-scale deployments

---

## Audit & Metadata

### AuditLog (Optional - Future Phase)

**Fields**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → User)
- `action` (String): Action type (e.g., "environment.start", "project.delete")
- `resource_type` (String): Entity type
- `resource_id` (UUID): Entity ID
- `metadata` (JSONB): Additional context
- `ip_address` (String): User IP
- `user_agent` (String): User agent string
- `created_at` (Timestamp)

**Purpose**: Track security-relevant actions for compliance and debugging.

---

## Database Indexes Summary

**High-Priority Indexes** (P0 - required for performance):
1. User(email) - Unique
2. Environment(project_id, status)
3. Environment(container_id)
4. LogEntry(environment_id, timestamp DESC)
5. Session(environment_id, status)
6. UserTeam(user_id, team_id) - Unique
7. Project(team_id), Project(owner_id)

**Medium-Priority Indexes** (P1 - improve common queries):
1. EnvironmentPort(host_port) - Partial unique
2. Extension(extension_id) - Unique
3. EnvironmentExtension(environment_id, extension_id) - Unique
4. Team(slug) - Unique

---

## Schema Migration Strategy

**Initial Setup**:
1. Create tables in dependency order (User → Team → UserTeam → Project → Environment → ...)
2. Add indexes after initial data load
3. Enable row-level security policies for multi-tenancy

**Version Control**:
- Use migration tool (Prisma Migrate, TypeORM migrations, or similar)
- All schema changes require migration file
- Never modify production schema manually

**Rollback Plan**:
- Each migration includes up and down scripts
- Test rollback in staging before production deployment

---

## Data Model Validation Checklist

- [x] All entities from spec.md included
- [x] Primary keys defined for all tables
- [x] Foreign key relationships established
- [x] Validation rules specified
- [x] Indexes planned for performance
- [x] State transitions documented for stateful entities
- [x] Security considerations addressed (encryption, isolation)
- [x] Retention policies defined where applicable
- [x] Audit trail considerations documented

**Status**: ✅ Data model complete and ready for contract generation
