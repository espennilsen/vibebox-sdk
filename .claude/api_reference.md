# VibeBox API Reference

> **Task T189**: Complete API endpoint documentation with examples

## 📋 Overview

The VibeBox API is a RESTful API that provides endpoints for managing development environments, teams, projects, and more. All API endpoints require authentication unless explicitly noted.

**Base URL**: `http://localhost:3000/api/v1` (development)

**Production**: `https://api.vibecode.dev/v1`

**API Documentation (Swagger UI)**: `http://localhost:3000/api/v1/docs`

---

## 🚀 SDK API Reference

**NEW**: For comprehensive SDK integration documentation including API Keys, Git Operations, Code Execution, and File Management, see:

**📚 [SDK API Reference](../docs/SDK_API_REFERENCE.md)** ⭐

This document covers all 30+ new endpoints added for programmatic SDK access.

---

## 🔐 Authentication

### Authentication Methods

VibeBox supports multiple authentication methods:

1. **Email/Password**: Traditional username and password
2. **OAuth**: GitHub and Google

### JWT Tokens

All authenticated requests use JWT (JSON Web Tokens) in the `Authorization` header:

```http
Authorization: Bearer <access_token>
```

**Token Lifespans**:
- Access Token: 15 minutes
- Refresh Token: 7 days

### Token Refresh

When the access token expires, use the refresh endpoint:

```http
POST /api/v1/auth/refresh
Cookie: refreshToken=<refresh_token>
```

---

## 🔑 Authentication Endpoints

### POST /auth/register

Register a new user account.

**Authentication**: None required

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "displayName": "John Doe"
}
```

**Response** (201 Created):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "displayName": "John Doe",
    "timezone": "UTC",
    "locale": "en-US",
    "createdAt": "2025-10-01T00:00:00.000Z"
  }
}
```

**Errors**:
- `400 Bad Request`: Invalid email or password format
- `409 Conflict`: Email already exists

---

### POST /auth/login

Login with email and password.

**Authentication**: None required

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response** (200 OK):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "displayName": "John Doe",
    "createdAt": "2025-10-01T00:00:00.000Z",
    "lastLoginAt": "2025-10-01T12:00:00.000Z"
  }
}
```

**Errors**:
- `401 Unauthorized`: Invalid credentials

---

### GET /auth/oauth/{provider}

Initiate OAuth login flow.

**Authentication**: None required

**Parameters**:
- `provider` (path): `github` or `google`

**Response** (302 Redirect):
Redirects to OAuth provider's authorization page.

---

### POST /auth/refresh

Refresh access token.

**Authentication**: Refresh token in cookie

**Response** (200 OK):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "displayName": "John Doe"
  }
}
```

**Errors**:
- `401 Unauthorized`: Invalid refresh token

---

## 👤 User Endpoints

### GET /users/me

Get current user profile.

**Authentication**: Required

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "displayName": "John Doe",
  "avatarUrl": "https://example.com/avatar.jpg",
  "timezone": "America/New_York",
  "locale": "en-US",
  "sshPublicKey": "ssh-rsa AAAAB3NzaC1yc2EA...",
  "notificationSettings": {
    "email": true,
    "webhook": false
  },
  "createdAt": "2025-10-01T00:00:00.000Z",
  "lastLoginAt": "2025-10-01T12:00:00.000Z"
}
```

---

### PATCH /users/me

Update current user profile.

**Authentication**: Required

**Request Body**:
```json
{
  "displayName": "Jane Doe",
  "avatarUrl": "https://example.com/new-avatar.jpg",
  "timezone": "America/Los_Angeles",
  "sshPublicKey": "ssh-rsa AAAAB3NzaC1yc2EA..."
}
```

**Response** (200 OK):
Returns updated user object.

---

## 👥 Team Endpoints

### GET /teams

List user's teams.

**Authentication**: Required

**Response** (200 OK):
```json
[
  {
    "id": "team-uuid",
    "name": "Acme Corp",
    "slug": "acme-corp",
    "description": "Development team",
    "avatarUrl": "https://example.com/team.jpg",
    "createdAt": "2025-10-01T00:00:00.000Z",
    "updatedAt": "2025-10-01T00:00:00.000Z"
  }
]
```

---

### POST /teams

Create a new team.

**Authentication**: Required

**Request Body**:
```json
{
  "name": "Acme Corp",
  "slug": "acme-corp",
  "description": "Development team"
}
```

**Response** (201 Created):
Returns created team object.

**Errors**:
- `400 Bad Request`: Invalid slug format
- `409 Conflict`: Slug already exists

---

### GET /teams/{teamId}

Get team details.

**Authentication**: Required (team member)

**Response** (200 OK):
Returns team object.

**Errors**:
- `403 Forbidden`: Not a team member
- `404 Not Found`: Team doesn't exist

---

### POST /teams/{teamId}/members

Add a team member.

**Authentication**: Required (team admin)

**Request Body**:
```json
{
  "email": "newmember@example.com",
  "role": "developer"
}
```

**Roles**: `admin`, `developer`, `viewer`

**Response** (201 Created):
```json
{
  "user": {
    "id": "user-uuid",
    "email": "newmember@example.com",
    "displayName": "New Member"
  },
  "role": "developer",
  "joinedAt": "2025-10-01T12:00:00.000Z"
}
```

---

## 📁 Project Endpoints

### GET /projects

List projects.

**Authentication**: Required

**Query Parameters**:
- `teamId` (optional): Filter by team
- `archived` (optional): Include archived projects (default: false)

**Response** (200 OK):
```json
[
  {
    "id": "project-uuid",
    "name": "My Web App",
    "slug": "my-web-app",
    "description": "React application",
    "ownerId": "user-uuid",
    "teamId": null,
    "isArchived": false,
    "createdAt": "2025-10-01T00:00:00.000Z",
    "updatedAt": "2025-10-01T00:00:00.000Z"
  }
]
```

---

### POST /projects

Create a new project.

**Authentication**: Required

**Request Body**:
```json
{
  "name": "My Web App",
  "slug": "my-web-app",
  "description": "React application",
  "teamId": "team-uuid"  // Optional: omit for personal project
}
```

**Response** (201 Created):
Returns created project object.

---

## 🐳 Environment Endpoints

### GET /environments

List environments with pagination.

**Authentication**: Required

**Query Parameters**:
- `projectId` (optional): Filter by project
- `status` (optional): Filter by status
- `page` (default: 1): Page number
- `limit` (default: 20, max: 100): Items per page

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "env-uuid",
      "name": "Development",
      "slug": "dev",
      "projectId": "project-uuid",
      "baseImage": "node:20",
      "status": "running",
      "cpuLimit": 2.0,
      "memoryLimit": 4096,
      "storageLimit": 20480,
      "createdAt": "2025-10-01T00:00:00.000Z",
      "startedAt": "2025-10-01T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

---

### POST /environments

Create a new environment.

**Authentication**: Required

**Request Body**:
```json
{
  "name": "Development",
  "slug": "dev",
  "description": "Development environment",
  "projectId": "project-uuid",
  "baseImage": "node:20",
  "cpuLimit": 2.0,
  "memoryLimit": 4096,
  "storageLimit": 20480,
  "ports": [
    {
      "containerPort": 3000,
      "hostPort": 3000,
      "protocol": "tcp"
    }
  ],
  "environmentVariables": [
    {
      "key": "NODE_ENV",
      "value": "development",
      "isEncrypted": false
    }
  ],
  "extensions": [
    "ms-python.python",
    "dbaeumer.vscode-eslint"
  ]
}
```

**Response** (201 Created):
Returns created environment object with status "stopped".

---

### POST /environments/{environmentId}/start

Start an environment.

**Authentication**: Required (environment access)

**Response** (200 OK):
```json
{
  "id": "env-uuid",
  "status": "starting",
  "containerId": "docker-container-id"
}
```

**Errors**:
- `409 Conflict`: Environment already running

---

### POST /environments/{environmentId}/stop

Stop an environment.

**Authentication**: Required (environment access)

**Response** (200 OK):
```json
{
  "id": "env-uuid",
  "status": "stopping"
}
```

---

### GET /environments/{environmentId}/logs

Get environment logs.

**Authentication**: Required (environment access)

**Query Parameters**:
- `since` (optional): ISO 8601 timestamp
- `until` (optional): ISO 8601 timestamp
- `tail` (default: 100): Number of recent lines
- `stream` (default: all): `stdout`, `stderr`, or `all`

**Response** (200 OK):
```json
[
  {
    "id": "log-uuid",
    "timestamp": "2025-10-01T12:00:00.123Z",
    "stream": "stdout",
    "message": "Server started on port 3000"
  },
  {
    "id": "log-uuid-2",
    "timestamp": "2025-10-01T12:00:01.456Z",
    "stream": "stderr",
    "message": "Warning: Deprecated API"
  }
]
```

---

## 🔌 Session Endpoints

### GET /environments/{environmentId}/sessions

List environment sessions.

**Authentication**: Required (environment access)

**Response** (200 OK):
```json
[
  {
    "id": "session-uuid",
    "environmentId": "env-uuid",
    "sessionType": "shell",
    "sessionName": "default",
    "status": "active",
    "pid": 1234,
    "createdAt": "2025-10-01T12:00:00.000Z",
    "lastActivityAt": "2025-10-01T12:05:00.000Z"
  }
]
```

---

### POST /environments/{environmentId}/sessions

Create a new session.

**Authentication**: Required (environment access)

**Request Body**:
```json
{
  "sessionType": "tmux",
  "sessionName": "dev-session"
}
```

**Session Types**: `vscode_server`, `tmux`, `shell`

**Response** (201 Created):
Returns created session object.

---

## 🧩 Extension Endpoints

### GET /extensions

Search extensions in VS Code marketplace.

**Authentication**: Required

**Query Parameters**:
- `query` (optional): Search query
- `publisher` (optional): Filter by publisher

**Response** (200 OK):
```json
[
  {
    "id": "ext-uuid",
    "extensionId": "ms-python.python",
    "name": "Python",
    "version": "2024.0.1",
    "description": "Python language support",
    "publisher": "ms-python",
    "iconUrl": "https://example.com/icon.png",
    "isCustom": false
  }
]
```

---

### POST /environments/{environmentId}/extensions

Install an extension.

**Authentication**: Required (environment access)

**Request Body**:
```json
{
  "extensionId": "ms-python.python"
}
```

**Response** (202 Accepted):
```json
{
  "id": "install-uuid",
  "environmentId": "env-uuid",
  "extension": {
    "extensionId": "ms-python.python",
    "name": "Python"
  },
  "status": "pending",
  "createdAt": "2025-10-01T12:00:00.000Z"
}
```

---

## ⚡ WebSocket API

### Log Streaming

**Endpoint**: `ws://localhost:3000/ws/environments/{environmentId}/logs?token=<jwt_token>`

**Message Types**:

```json
// Server → Client: Log entry
{
  "type": "log",
  "data": {
    "id": "log-uuid",
    "timestamp": "2025-10-01T12:00:00.123Z",
    "stream": "stdout",
    "message": "Server started"
  }
}

// Server → Client: Status update
{
  "type": "status",
  "data": {
    "connected": true,
    "environmentStatus": "running",
    "streamingFrom": "2025-10-01T12:00:00.000Z"
  }
}

// Client → Server: Control message
{
  "type": "control",
  "action": "pause",
  "params": {
    "stream": "stdout"
  }
}
```

---

### Terminal (PTY)

**Endpoint**: `ws://localhost:3000/ws/environments/{environmentId}/terminal?token=<jwt_token>`

**Message Types**:

```json
// Server → Client: Terminal data
{
  "type": "data",
  "data": "\u001b[32muser@container:~$\u001b[0m "
}

// Client → Server: Terminal input
{
  "type": "input",
  "data": "ls -la\n"
}

// Client → Server: Resize terminal
{
  "type": "resize",
  "cols": 120,
  "rows": 40
}
```

---

## 📊 Error Responses

All errors follow this format:

```json
{
  "error": "ErrorType",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional context"
  }
}
```

**HTTP Status Codes**:
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Authentication required/invalid
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource doesn't exist
- `409 Conflict`: Resource conflict (duplicate, etc.)
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

---

## 🔄 Rate Limiting

**Limits**:
- API Requests: 1000 requests/hour per user
- WebSocket Connections: 100 concurrent per user
- WebSocket Messages: 1000 messages/second per connection

**Rate Limit Headers**:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1633024800
```

---

## 📝 Examples

### Create and Start Environment (Complete Flow)

```bash
# 1. Register/Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePassword123!"}'

# Save the accessToken from response
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 2. Create Project
curl -X POST http://localhost:3000/api/v1/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Project","slug":"my-project"}'

# Save projectId from response
PROJECT_ID="project-uuid"

# 3. Create Environment
curl -X POST http://localhost:3000/api/v1/environments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Dev\",\"slug\":\"dev\",\"projectId\":\"$PROJECT_ID\",\"baseImage\":\"node:20\"}"

# Save environmentId from response
ENV_ID="env-uuid"

# 4. Start Environment
curl -X POST http://localhost:3000/api/v1/environments/$ENV_ID/start \
  -H "Authorization: Bearer $TOKEN"

# 5. Get Logs
curl http://localhost:3000/api/v1/environments/$ENV_ID/logs?tail=50 \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔗 Additional Resources

- **OpenAPI Specification**: `/specs/001-develop-vibecode-a/contracts/openapi.yaml`
- **WebSocket Specification**: `/specs/001-develop-vibecode-a/contracts/websocket-spec.md`
- **Swagger UI**: http://localhost:3000/api/v1/docs
- **[Specs Documentation](./specs.md)**: Detailed data models
- **[Quick Start Guide](./quick_start.md)**: Getting started

---

**API Version**: 1.0.0
**Last Updated**: 2025-10-01
