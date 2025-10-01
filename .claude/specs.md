# VibeBox Spec Kit Contracts & Resource Models

> **Task T188**: Spec Kit contracts, resource models, and data architecture documentation

## 📋 Overview

VibeBox follows a **contract-first development** approach using Spec Kit. This document provides a comprehensive overview of our data models, API contracts, and architectural decisions.

## 🏗️ Architecture Philosophy

VibeBox was designed using [Spec Kit](https://github.com/anthropics/spec-kit) principles:

1. **Specification First**: All features start with spec.md
2. **Contract-Driven**: OpenAPI contracts define API before implementation
3. **Data Model Clarity**: Entities and relationships documented before coding
4. **Test-Driven**: Contract tests validate API compliance
5. **Documentation**: Design artifacts remain as living documentation

## 📊 Data Model Overview

VibeBox's data model supports multi-tenant development environment management with the following core entities:

### Entity Relationship Diagram

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

### Design Documents

All design artifacts are located in `/workspace/specs/001-develop-vibecode-a/`:

- **[plan.md](../specs/001-develop-vibecode-a/plan.md)** - Implementation plan and technical context
- **[data-model.md](../specs/001-develop-vibecode-a/data-model.md)** - Complete entity definitions
- **[research.md](../specs/001-develop-vibecode-a/research.md)** - Technology decisions and rationale
- **[quickstart.md](../specs/001-develop-vibecode-a/quickstart.md)** - Validation scenarios
- **[contracts/openapi.yaml](../specs/001-develop-vibecode-a/contracts/openapi.yaml)** - REST API specification
- **[contracts/websocket-spec.md](../specs/001-develop-vibecode-a/contracts/websocket-spec.md)** - WebSocket protocol

### Visual Architecture Diagrams

Comprehensive visual documentation is available in `/workspace/docs/architecture/`:

- **[System Architecture Overview](../docs/architecture/system-overview.md)** - Complete system diagram (Mermaid, PlantUML, ASCII)
- **[Database ERD](../docs/architecture/database-erd.md)** - Entity relationship diagram (Mermaid, DBML, ASCII)
- **[API Architecture Flow](../docs/architecture/api-flow.md)** - Request processing and middleware chain
- **[WebSocket Flow](../docs/architecture/websocket-flow.md)** - Real-time communication architecture
- **[Deployment Architecture](../docs/architecture/deployment.md)** - Kubernetes cluster and infrastructure
- **[Environment Lifecycle](../docs/architecture/environment-lifecycle.md)** - State machine and flows
- **[Authentication Flow](../docs/architecture/auth-flow.md)** - Auth/authz with JWT and OAuth
- **[Architecture Index](../docs/architecture/README.md)** - Complete diagram catalog and viewing guide

## 🗃️ Core Entities

### 1. User

**Purpose**: Represents a developer using VibeBox

**Key Fields**:
- `id` (UUID) - Unique identifier
- `email` (String, unique) - User email
- `password_hash` (String, nullable) - Hashed password (null for OAuth)
- `display_name` (String) - User's display name
- `ssh_public_key` (Text, nullable) - SSH key for environment access
- `notification_settings` (JSONB) - User preferences

**Relationships**:
- Has many Projects (as owner)
- Has many UserTeams (team memberships)
- Has many Environments (as creator)

**Validation**:
- Email must be valid format
- Display name: 1-100 characters
- SSH key must be valid public key format if provided

**Indexes**:
- Unique index on `email`
- Index on `created_at` for analytics

---

### 2. Team

**Purpose**: Organization or team that can share resources

**Key Fields**:
- `id` (UUID) - Unique identifier
- `name` (String) - Team name
- `slug` (String, unique) - URL-friendly identifier
- `description` (Text, nullable) - Team description

**Relationships**:
- Has many UserTeams (members)
- Has many Projects (team-owned)

**Validation**:
- Name: 1-100 characters
- Slug: lowercase alphanumeric and hyphens, 3-50 characters

**Indexes**:
- Unique index on `slug`
- Index on `name` for search

---

### 3. UserTeam (Junction)

**Purpose**: Many-to-many relationship between Users and Teams with roles

**Key Fields**:
- `user_id` (UUID, FK → User)
- `team_id` (UUID, FK → Team)
- `role` (Enum: admin, developer, viewer)
- `joined_at` (Timestamp)

**Roles**:
- **admin**: Full team management, can add/remove members
- **developer**: Create/manage projects and environments
- **viewer**: Read-only access to team resources

**Constraints**:
- Unique constraint on (user_id, team_id)

---

### 4. Project

**Purpose**: Organizational unit grouping related environments

**Key Fields**:
- `id` (UUID) - Unique identifier
- `name` (String) - Project name
- `slug` (String) - URL-friendly identifier
- `owner_id` (UUID, FK → User, nullable) - Individual owner
- `team_id` (UUID, FK → Team, nullable) - Team owner
- `is_archived` (Boolean) - Archive status

**Relationships**:
- Belongs to User (owner) **XOR** Team (owner)
- Has many Environments

**Validation**:
- Exactly one of owner_id or team_id must be set (XOR constraint)
- Unique constraint on (slug, owner_id) or (slug, team_id)

**Indexes**:
- Composite unique indexes on (slug, owner_id) and (slug, team_id)

---

### 5. Environment

**Purpose**: Docker-based development environment

**Key Fields**:
- `id` (UUID) - Unique identifier
- `name` (String) - Environment name
- `project_id` (UUID, FK → Project)
- `base_image` (String) - Docker image (e.g., "node:20")
- `container_id` (String, nullable) - Docker container ID
- `status` (Enum) - Environment status
- `cpu_limit` (Decimal) - CPU cores limit (default: 2.0)
- `memory_limit` (Integer) - Memory in MB (default: 4096)
- `storage_limit` (Integer) - Storage in MB (default: 20480)

**Status Values**:
- `stopped` - Environment is not running
- `starting` - Container is being created/started
- `running` - Container is active
- `stopping` - Container is being stopped
- `error` - Error occurred during lifecycle

**State Transitions**:
```
stopped → starting → running
running → stopping → stopped
any → error (on failure)
error → starting (on retry)
```

**Relationships**:
- Belongs to Project
- Has many Sessions
- Has many EnvironmentExtensions
- Has many EnvironmentPorts
- Has many EnvironmentVariables
- Has many LogEntries

**Indexes**:
- Composite unique on (project_id, slug)
- Indexes on project_id, creator_id, status, container_id

---

### 6. EnvironmentPort

**Purpose**: Port mappings for network access

**Key Fields**:
- `environment_id` (UUID, FK → Environment)
- `container_port` (Integer) - Port inside container
- `host_port` (Integer, nullable) - Port on host (null = auto-assign)
- `protocol` (Enum: tcp, udp)

**Validation**:
- Container port: 1-65535
- Host port: 1024-65535 or null
- Unique constraint on (environment_id, container_port)
- Unique constraint on host_port (if not null)

---

### 7. EnvironmentVariable

**Purpose**: Environment variables for container runtime

**Key Fields**:
- `environment_id` (UUID, FK → Environment)
- `key` (String) - Variable name
- `value` (Text) - Variable value
- `is_encrypted` (Boolean) - Encryption flag

**Security**:
- Values with is_encrypted=true are AES-256 encrypted at rest
- Common secret patterns (API_KEY, SECRET, PASSWORD) automatically encrypted

**Validation**:
- Key: uppercase alphanumeric and underscore only
- Unique constraint on (environment_id, key)

---

### 8. Session

**Purpose**: Active processes inside an environment

**Key Fields**:
- `environment_id` (UUID, FK → Environment)
- `session_type` (Enum: vscode_server, tmux, shell)
- `session_name` (String) - Session identifier
- `status` (Enum: starting, active, idle, terminated)
- `pid` (Integer, nullable) - Process ID in container
- `idle_timeout_minutes` (Integer, default: 30)

**Lifecycle**:
- Automatically created when environment starts
- Marked idle after idle_timeout_minutes of inactivity
- Terminated when environment stops or idle cleanup runs

**Constraints**:
- Unique on (environment_id, session_type, session_name)

---

### 9. Extension

**Purpose**: VS Code extension metadata catalog

**Key Fields**:
- `extension_id` (String, unique) - VS Code marketplace ID
- `name` (String) - Display name
- `version` (String) - Extension version
- `publisher` (String) - Publisher name
- `is_custom` (Boolean) - Custom (non-marketplace) flag
- `download_url` (String, nullable) - Custom extension URL

**Validation**:
- Extension ID format: publisher.name
- Version follows semver format

---

### 10. EnvironmentExtension (Junction)

**Purpose**: Environment-Extension relationship with installation status

**Key Fields**:
- `environment_id` (UUID, FK → Environment)
- `extension_id` (UUID, FK → Extension)
- `status` (Enum) - Installation status
- `error_message` (Text, nullable)
- `installed_at` (Timestamp, nullable)

**Status Values**:
- `pending` - Installation queued
- `installing` - Currently installing
- `installed` - Successfully installed
- `failed` - Installation failed
- `uninstalling` - Being removed

**State Transitions**:
```
pending → installing → installed
installing → failed (on error)
installed → uninstalling → (deleted)
```

---

### 11. LogEntry

**Purpose**: Persistent log storage for environments

**Key Fields**:
- `environment_id` (UUID, FK → Environment)
- `timestamp` (Timestamp) - Log timestamp
- `stream` (Enum: stdout, stderr) - Log stream
- `message` (Text) - Log message content

**Retention Policy**:
- Logs older than 7 days automatically deleted
- Per-environment log size limited to 20MB (FIFO rotation)

**Indexes**:
- Composite index on (environment_id, timestamp DESC) for efficient queries

---

## 🔌 API Contracts

### REST API

**Base URL**: `/api/v1`

**Authentication**: Bearer JWT token

**OpenAPI Specification**: [contracts/openapi.yaml](../specs/001-develop-vibecode-a/contracts/openapi.yaml)

**Endpoint Summary**:

| Resource | Endpoints | Description |
|----------|-----------|-------------|
| Auth | POST /auth/register<br>POST /auth/login<br>GET /auth/oauth/{provider}<br>POST /auth/refresh | User authentication |
| Users | GET /users/me<br>PATCH /users/me | User profile management |
| Teams | GET /teams<br>POST /teams<br>GET/PATCH/DELETE /teams/{id}<br>GET/POST /teams/{id}/members | Team management |
| Projects | GET /projects<br>POST /projects<br>GET/PATCH/DELETE /projects/{id} | Project CRUD |
| Environments | GET /environments<br>POST /environments<br>GET/PATCH/DELETE /environments/{id}<br>POST /environments/{id}/start<br>POST /environments/{id}/stop<br>POST /environments/{id}/ports<br>GET/POST /environments/{id}/variables | Environment lifecycle |
| Sessions | GET /environments/{id}/sessions<br>POST /environments/{id}/sessions<br>DELETE /sessions/{id} | Session management |
| Extensions | GET /extensions<br>GET/POST /environments/{id}/extensions<br>DELETE /environments/{id}/extensions/{extId} | Extension management |
| Logs | GET /environments/{id}/logs | Log retrieval |

### WebSocket API

**Base URL**: `ws://localhost:3000/ws` (dev), `wss://api.vibecode.dev/ws` (prod)

**Authentication**: JWT token via query parameter

**Specification**: [contracts/websocket-spec.md](../specs/001-develop-vibecode-a/contracts/websocket-spec.md)

**Endpoints**:

1. **Log Streaming**: `/ws/environments/{id}/logs`
   - Real-time log streaming from Docker containers
   - Historical logs (last 100 lines) on connect
   - Filter by stream (stdout, stderr, all)
   - Pause/resume controls

2. **Terminal (PTY)**: `/ws/environments/{id}/terminal`
   - Bidirectional terminal communication
   - ANSI escape sequence support
   - Dynamic resize support
   - Session attach/detach

3. **Status Updates**: `/ws/environments/{id}/status`
   - Real-time environment status changes
   - Resource metrics (CPU, memory)
   - Lightweight connection for dashboards

---

## 🔒 Security Model

### Authentication

- **Email/Password**: Bcrypt-hashed passwords
- **OAuth**: GitHub and Google providers
- **JWT**: Short-lived access tokens (15min) + refresh tokens (7 days)

### Authorization

**Role-Based Access Control (RBAC)**:

| Role | Permissions |
|------|-------------|
| Team Admin | Full team management, all resources |
| Team Developer | Create/manage projects and environments |
| Team Viewer | Read-only access to team resources |
| Project Owner | Full control over project |
| Environment Creator | Manage own environments |

**Resource Access**:
- Users can only access their own resources
- Team members can access team-owned resources
- Row-level security enforced in PostgreSQL

### Data Protection

- **Encryption at Rest**: PostgreSQL transparent encryption
- **Encryption in Transit**: TLS 1.3 for all connections
- **Environment Variables**: AES-256 encryption for secrets
- **Docker Isolation**: User namespaces, cgroups limits

---

## 📈 Performance Requirements

From [plan.md](../specs/001-develop-vibecode-a/plan.md):

- **API Response Times**: Sub-second for CRUD operations
- **Environment Startup**: <2s from API call to running (excluding Docker)
- **Scale**: Support 1,000+ total environments
- **Concurrent Environments**: 10 per user
- **Dashboard Queries**: <200ms p95
- **Log Streaming**: <100ms latency per line

---

## 🧪 Validation & Testing

### Contract Tests

All API endpoints have corresponding contract tests that validate:
- Request/response schemas match OpenAPI spec
- HTTP status codes are correct
- Authentication/authorization requirements
- Error responses are properly formatted

**Test Location**: `backend/tests/contract/`

### Integration Tests

Validate service interactions and business logic:
- Docker container lifecycle
- Database operations
- WebSocket connections
- Multi-user scenarios

**Test Location**: `backend/tests/integration/`

### E2E Tests

Full user flows based on [quickstart.md](../specs/001-develop-vibecode-a/quickstart.md):
- User registration → Create project → Create environment → Start → Logs → Terminal
- Team collaboration scenarios
- Error handling and recovery

**Test Location**: `frontend/tests/e2e/`

---

## 📚 Additional Resources

- **[Quick Start Guide](./quick_start.md)** - Setup instructions
- **[API Reference](./api_reference.md)** - Detailed API documentation
- **[Development Workflow](./dev_workflow.md)** - PR process and CI/CD
- **[FAQ](./faq.md)** - Common questions

---

**Status**: ✅ Specification complete and validated
**Last Updated**: 2025-10-01
