# VibeBox SDK API Reference

> **Complete REST API documentation for SDK integration**

## 📋 Overview

This document covers all REST API endpoints added to support the VibeBox SDK. These endpoints enable programmatic access to create and manage development environments, execute code, manage files, and perform git operations.

**Base URL**: `http://localhost:3000/api/v1` (development)

**Production**: `https://api.vibecode.dev/v1`

---

## 🔐 Authentication

### Authentication Methods for SDK

The SDK supports two authentication methods:

#### 1. JWT Tokens (User Authentication)
```http
Authorization: Bearer <access_token>
```

#### 2. API Keys (Programmatic Access) ✨ **NEW**
```http
Authorization: Bearer vbx_live_...
```
or
```http
X-API-Key: vbx_live_...
```

**API Key Scopes:**
- `read`: Read-only operations (list, get, download)
- `write`: Write operations (create, update, delete, upload)
- `execute`: Code execution operations

---

## 🔑 API Key Management

### POST /api/v1/keys

Generate a new API key.

**Authentication**: JWT required

**Request Body**:
```json
{
  "name": "Production SDK Key",
  "scopes": ["read", "write", "execute"],
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

**Response** (201 Created):
```json
{
  "apiKey": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user-id-123",
    "name": "Production SDK Key",
    "keyPrefix": "vbx_live_abc",
    "scopes": ["read", "write", "execute"],
    "expiresAt": "2025-12-31T23:59:59.000Z",
    "createdAt": "2025-10-01T00:00:00.000Z",
    "updatedAt": "2025-10-01T00:00:00.000Z"
  },
  "key": "vbx_live_abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
}
```

**Important**: The full `key` is only returned once. Store it securely.

**Errors**:
- `400 Bad Request`: Invalid scopes or expiration date
- `401 Unauthorized`: Not authenticated

---

### GET /api/v1/keys

List all API keys for the authenticated user.

**Authentication**: JWT required

**Response** (200 OK):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user-id-123",
    "name": "Production SDK Key",
    "keyPrefix": "vbx_live_abc",
    "scopes": ["read", "write", "execute"],
    "expiresAt": "2025-12-31T23:59:59.000Z",
    "lastUsedAt": "2025-10-15T14:30:00.000Z",
    "createdAt": "2025-10-01T00:00:00.000Z",
    "updatedAt": "2025-10-01T00:00:00.000Z"
  }
]
```

---

### GET /api/v1/keys/:keyId

Get a specific API key by ID.

**Authentication**: JWT required

**Response** (200 OK): Same as single key object above

**Errors**:
- `404 Not Found`: API key not found

---

### PUT /api/v1/keys/:keyId

Update an API key.

**Authentication**: JWT required

**Request Body**:
```json
{
  "name": "Updated Key Name",
  "scopes": ["read", "write"]
}
```

**Response** (200 OK): Updated API key object

---

### DELETE /api/v1/keys/:keyId

Revoke (delete) an API key.

**Authentication**: JWT required

**Response** (200 OK):
```json
{
  "success": true,
  "message": "API key revoked"
}
```

---

## 🏗️ Enhanced Environment Creation

### POST /api/v1/environments

Create a new development environment with enhanced options.

**Authentication**: JWT or API Key (write scope)

**Request Body**:
```json
{
  "name": "My Dev Environment",
  "slug": "my-dev-env",
  "description": "Development environment for my project",
  "projectId": "project-id-123",
  "baseImage": "node:20-alpine",
  "cpuLimit": 2.0,
  "memoryLimit": 4096,
  "storageLimit": 20480,
  "template": "node-20-claude-code",
  "autoStart": true,
  "ephemeral": true,
  "timeout": "2h",
  "git": {
    "url": "https://github.com/user/repo.git",
    "branch": "main",
    "path": "/workspace",
    "depth": 1,
    "auth": {
      "type": "token",
      "token": "ghp_xxxxxxxxxxxx"
    }
  }
}
```

**New Fields**:
- `template`: Template ID for quick setup (optional)
- `autoStart`: Automatically start environment after creation (default: false)
- `ephemeral`: Environment will auto-cleanup on expiration (default: false)
- `timeout`: Human-readable expiration time ("30m", "2h", "1d") (optional)
- `git`: Auto-clone repository configuration (optional)

**Response** (201 Created):
```json
{
  "id": "env-id-123",
  "name": "My Dev Environment",
  "slug": "my-dev-env",
  "description": "Development environment for my project",
  "projectId": "project-id-123",
  "creatorId": "user-id-123",
  "baseImage": "node:20-alpine",
  "containerId": "docker-container-id",
  "status": "running",
  "cpuLimit": 2.0,
  "memoryLimit": 4096,
  "storageLimit": 20480,
  "ephemeral": true,
  "expiresAt": "2025-10-01T02:00:00.000Z",
  "createdAt": "2025-10-01T00:00:00.000Z",
  "updatedAt": "2025-10-01T00:00:00.000Z",
  "startedAt": "2025-10-01T00:00:05.000Z"
}
```

---

## 🔄 Environment Lifecycle

### POST /api/v1/environments/:envId/pause

Pause a running environment (freeze all processes).

**Authentication**: JWT or API Key (write scope)

**Response** (200 OK):
```json
{
  "id": "env-id-123",
  "status": "paused",
  "pausedAt": "2025-10-01T10:00:00.000Z"
}
```

**Errors**:
- `400 Bad Request`: Environment is not running
- `404 Not Found`: Environment not found

---

### POST /api/v1/environments/:envId/resume

Resume a paused environment.

**Authentication**: JWT or API Key (write scope)

**Response** (200 OK):
```json
{
  "id": "env-id-123",
  "status": "running",
  "pausedAt": null
}
```

**Errors**:
- `400 Bad Request`: Environment is not paused

---

## 🌿 Git Operations

All git endpoints are nested under `/api/v1/environments/:environmentId/git`

### POST /api/v1/environments/:envId/git/clone

Clone a git repository into the sandbox.

**Authentication**: JWT or API Key (write scope)

**Request Body**:
```json
{
  "url": "https://github.com/user/repo.git",
  "branch": "main",
  "path": "/workspace",
  "depth": 1,
  "auth": {
    "type": "token",
    "token": "ghp_xxxxxxxxxxxx"
  }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "path": "/workspace",
  "branch": "main",
  "commit": "abc123def456"
}
```

---

### POST /api/v1/environments/:envId/git/pull

Pull latest changes from remote.

**Authentication**: JWT or API Key (write scope)

**Request Body**:
```json
{
  "remote": "origin",
  "branch": "main"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "updatedFiles": 5,
  "commit": "abc123def456"
}
```

---

### POST /api/v1/environments/:envId/git/push

Push local commits to remote.

**Authentication**: JWT or API Key (write scope)

**Request Body**:
```json
{
  "remote": "origin",
  "branch": "main",
  "force": false
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "pushed": true,
  "commit": "abc123def456"
}
```

---

### POST /api/v1/environments/:envId/git/commit

Commit changes.

**Authentication**: JWT or API Key (write scope)

**Request Body**:
```json
{
  "message": "Fix authentication bug",
  "files": ["src/auth.ts", "tests/auth.test.ts"],
  "author": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "commit": "abc123def456",
  "filesChanged": 2
}
```

---

### POST /api/v1/environments/:envId/git/checkout

Checkout a branch.

**Authentication**: JWT or API Key (write scope)

**Request Body**:
```json
{
  "branch": "feature/new-feature",
  "create": true
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "branch": "feature/new-feature"
}
```

---

### GET /api/v1/environments/:envId/git/status

Get git status.

**Authentication**: JWT or API Key (read scope)

**Response** (200 OK):
```json
{
  "branch": "main",
  "modified": ["src/index.ts"],
  "added": ["src/new-file.ts"],
  "deleted": ["src/old-file.ts"],
  "untracked": ["temp.log"],
  "ahead": 2,
  "behind": 0
}
```

---

### GET /api/v1/environments/:envId/git/diff

Get git diff.

**Authentication**: JWT or API Key (read scope)

**Response** (200 OK):
```json
{
  "files": [
    {
      "path": "src/index.ts",
      "status": "modified",
      "additions": 10,
      "deletions": 5,
      "diff": "@@ -1,5 +1,10 @@\n-old line\n+new line\n..."
    }
  ]
}
```

---

### GET /api/v1/environments/:envId/git/config

Get git configuration for the environment.

**Authentication**: JWT or API Key (read scope)

**Response** (200 OK):
```json
{
  "id": "config-id-123",
  "environmentId": "env-id-123",
  "repoUrl": "https://github.com/user/repo.git",
  "branch": "main",
  "path": "/workspace",
  "depth": 1,
  "authType": "token",
  "lastSyncAt": "2025-10-01T10:00:00.000Z",
  "createdAt": "2025-10-01T00:00:00.000Z",
  "updatedAt": "2025-10-01T00:00:00.000Z"
}
```

---

## ⚡ Code Execution

All execution endpoints are nested under `/api/v1/environments/:environmentId/execute`

### POST /api/v1/environments/:envId/execute

Execute code in the sandbox.

**Authentication**: JWT or API Key (execute scope)

**Query Parameters**:
- `stream`: Set to `true` for WebSocket streaming (default: false)

**Request Body**:
```json
{
  "code": "console.log('Hello from SDK!');",
  "language": "javascript",
  "timeout": 30000,
  "env": {
    "NODE_ENV": "production",
    "API_KEY": "secret"
  }
}
```

**Response (Synchronous)** (200 OK):
```json
{
  "executionId": "exec-id-123",
  "stdout": "Hello from SDK!\n",
  "stderr": "",
  "exitCode": 0,
  "duration": 142,
  "status": "completed"
}
```

**Response (Streaming)** (202 Accepted):
```json
{
  "executionId": "exec-id-123",
  "message": "Execution started. Connect to WebSocket for real-time output."
}
```

**Supported Languages**:
- `javascript`
- `typescript`
- `python`
- `bash`
- `sh`

**WebSocket Messages** (when streaming):
```json
// Start
{
  "type": "execution:start",
  "data": {
    "executionId": "exec-id-123"
  }
}

// Output
{
  "type": "execution:output",
  "data": {
    "executionId": "exec-id-123",
    "stream": "stdout",
    "data": "Hello from SDK!\n"
  }
}

// End
{
  "type": "execution:end",
  "data": {
    "executionId": "exec-id-123",
    "exitCode": 0,
    "duration": 142,
    "status": "completed"
  }
}
```

---

### GET /api/v1/environments/:envId/execute

List executions for an environment.

**Authentication**: JWT or API Key (read scope)

**Query Parameters**:
- `limit`: Maximum results (default: 50)

**Response** (200 OK):
```json
[
  {
    "id": "exec-id-123",
    "environmentId": "env-id-123",
    "userId": "user-id-123",
    "code": "console.log('Hello!');",
    "language": "javascript",
    "status": "completed",
    "stdout": "Hello!\n",
    "stderr": "",
    "exitCode": 0,
    "duration": 142,
    "timeout": 30000,
    "createdAt": "2025-10-01T00:00:00.000Z"
  }
]
```

---

### GET /api/v1/environments/:envId/execute/:execId

Get execution details by ID.

**Authentication**: JWT or API Key (read scope)

**Response** (200 OK): Single execution object (same format as list)

---

### DELETE /api/v1/environments/:envId/execute/:execId

Cancel a running execution.

**Authentication**: JWT or API Key (execute scope)

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Execution cancelled"
}
```

---

### GET /api/v1/environments/:envId/execute/languages

Get supported programming languages.

**Authentication**: JWT or API Key (read scope)

**Response** (200 OK):
```json
{
  "languages": ["javascript", "typescript", "python", "bash", "sh"]
}
```

---

## 📁 File Operations

All file endpoints are nested under `/api/v1/environments/:environmentId/files`

### GET /api/v1/environments/:envId/files

List files in a directory.

**Authentication**: JWT or API Key (read scope)

**Query Parameters**:
- `path`: Directory path (default: `/workspace`)

**Response** (200 OK):
```json
{
  "files": [
    {
      "name": "index.ts",
      "path": "/workspace/index.ts",
      "size": 1024,
      "isDirectory": false,
      "permissions": "-rw-r--r--",
      "modifiedAt": "2025-10-01T00:00:00.000Z"
    },
    {
      "name": "src",
      "path": "/workspace/src",
      "size": 4096,
      "isDirectory": true,
      "permissions": "drwxr-xr-x",
      "modifiedAt": "2025-10-01T00:00:00.000Z"
    }
  ],
  "path": "/workspace"
}
```

---

### GET /api/v1/environments/:envId/files/info

Get file metadata.

**Authentication**: JWT or API Key (read scope)

**Query Parameters**:
- `path`: File path (required)

**Response** (200 OK):
```json
{
  "name": "index.ts",
  "path": "/workspace/index.ts",
  "size": 1024,
  "isDirectory": false,
  "permissions": "-rw-r--r--",
  "modifiedAt": "2025-10-01T00:00:00.000Z"
}
```

---

### GET /api/v1/environments/:envId/files/download

Download a file.

**Authentication**: JWT or API Key (read scope)

**Query Parameters**:
- `path`: File path (required)

**Response** (200 OK):
- Content-Type: `application/octet-stream`
- Content-Disposition: `attachment; filename="..."`
- Body: File content

---

### POST /api/v1/environments/:envId/files

Upload a file.

**Authentication**: JWT or API Key (write scope)

**Request Body**:
```json
{
  "path": "/workspace/new-file.txt",
  "content": "File content here",
  "permissions": "644"
}
```

**Note**: For binary files, use base64 encoding:
```json
{
  "path": "/workspace/image.png",
  "content": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "permissions": "644"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "path": "/workspace/new-file.txt",
  "size": 17
}
```

---

### DELETE /api/v1/environments/:envId/files

Delete a file or directory.

**Authentication**: JWT or API Key (write scope)

**Query Parameters**:
- `path`: Path to delete (required)
- `recursive`: Delete directories recursively (default: false)

**Response** (200 OK):
```json
{
  "success": true,
  "deleted": 1
}
```

---

### POST /api/v1/environments/:envId/files/mkdir

Create a directory.

**Authentication**: JWT or API Key (write scope)

**Request Body**:
```json
{
  "path": "/workspace/new-dir",
  "recursive": true
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Directory created",
  "path": "/workspace/new-dir"
}
```

---

### POST /api/v1/environments/:envId/files/copy

Copy a file or directory.

**Authentication**: JWT or API Key (write scope)

**Request Body**:
```json
{
  "source": "/workspace/file.txt",
  "dest": "/workspace/backup/file.txt",
  "recursive": false
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "File copied",
  "source": "/workspace/file.txt",
  "dest": "/workspace/backup/file.txt"
}
```

---

### POST /api/v1/environments/:envId/files/move

Move or rename a file or directory.

**Authentication**: JWT or API Key (write scope)

**Request Body**:
```json
{
  "source": "/workspace/old-name.txt",
  "dest": "/workspace/new-name.txt"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "File moved",
  "source": "/workspace/old-name.txt",
  "dest": "/workspace/new-name.txt"
}
```

---

### GET /api/v1/environments/:envId/files/search

Search for files matching a pattern.

**Authentication**: JWT or API Key (read scope)

**Query Parameters**:
- `path`: Base path to search (required)
- `pattern`: Search pattern/glob (required)

**Response** (200 OK):
```json
{
  "files": [
    "/workspace/src/index.ts",
    "/workspace/tests/index.test.ts"
  ]
}
```

---

## 📊 Summary

### Total Endpoints Added: 30

- **API Keys**: 5 endpoints
- **Enhanced Environment**: 3 endpoints (create + pause + resume)
- **Git Operations**: 8 endpoints
- **Code Execution**: 5 endpoints
- **File Operations**: 9 endpoints

### Authentication
- All endpoints support both JWT and API Key authentication
- API Keys use scope-based authorization (read, write, execute)

### Rate Limiting
- Read operations: 100 requests/minute
- Write operations: 60 requests/minute
- Intensive operations (start, stop, execute): 20 requests/minute

### Error Responses

All endpoints follow a consistent error format:

```json
{
  "error": "ErrorType",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional error context"
  }
}
```

**Common Status Codes**:
- `200 OK`: Success
- `201 Created`: Resource created
- `202 Accepted`: Async operation started
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict
- `500 Internal Server Error`: Server error

---

## 🚀 SDK Usage Examples

### Example: Create and Use Environment

```typescript
// 1. Create API key
const keyResponse = await fetch('/api/v1/keys', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <jwt_token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'SDK Key',
    scopes: ['read', 'write', 'execute']
  })
});
const { key } = await keyResponse.json();

// 2. Create environment with auto-start and git clone
const envResponse = await fetch('/api/v1/environments', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'My Project',
    slug: 'my-project',
    projectId: 'project-123',
    baseImage: 'node:20-alpine',
    autoStart: true,
    ephemeral: true,
    timeout: '2h',
    git: {
      url: 'https://github.com/user/repo.git',
      branch: 'main',
      auth: {
        type: 'token',
        token: 'ghp_xxxxx'
      }
    }
  })
});
const env = await envResponse.json();

// 3. Execute code
const execResponse = await fetch(`/api/v1/environments/${env.id}/execute`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    code: 'console.log("Hello from SDK!");',
    language: 'javascript'
  })
});
const result = await execResponse.json();
console.log(result.stdout); // "Hello from SDK!"
```

---

## 📝 Migration Notes

### Database Migration Required

Before using these endpoints, run the Prisma migration:

```bash
cd backend
npx prisma migrate dev --name add_sdk_prerequisites
```

This creates the following tables:
- `api_keys`
- `sandbox_git_configs`
- `executions`
- `templates`

And adds the following fields to `environments`:
- `ephemeral`
- `expires_at`
- `paused_at`

---

## 🔗 Additional Resources

- **Main API Reference**: `.claude/api_reference.md`
- **Roadmap**: `docs/ROADMAP.md`
- **Architecture**: `docs/architecture/`
- **Security**: `.claude/security.md`

---

**Version**: 2.0.0
**Last Updated**: 2025-11-18
**Status**: Production Ready ✅
