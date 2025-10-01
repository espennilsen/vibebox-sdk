# VibeBox API Documentation

This directory contains comprehensive API documentation for the VibeBox platform.

## Contents

- **[openapi.yaml](./openapi.yaml)** - Complete OpenAPI 3.0 specification with all endpoints, schemas, and examples

## Accessing the Documentation

### Interactive Swagger UI

The best way to explore the API is through the interactive Swagger UI:

**Development**: http://localhost:3000/api/v1/docs

**Production**: https://api.vibecode.dev/v1/docs

### Features

- Browse all endpoints organized by category (Authentication, Users, Teams, Projects, Environments, etc.)
- View detailed request/response schemas
- Try out API calls directly from the browser
- See example requests and responses
- Filter endpoints by tag or search
- Deep linking to specific operations

## Using the OpenAPI Specification

### Importing into API Tools

The `openapi.yaml` file can be imported into various API development tools:

**Postman**:
1. File → Import
2. Select `openapi.yaml`
3. All endpoints will be imported as a collection

**Insomnia**:
1. Create → Import From → File
2. Select `openapi.yaml`
3. Choose "OpenAPI 3.0"

**VS Code REST Client**:
1. Install "OpenAPI (Swagger) Editor" extension
2. Open `openapi.yaml`
3. Right-click → Preview Swagger

### Code Generation

Generate client libraries in various languages:

```bash
# Install OpenAPI Generator
npm install -g @openapitools/openapi-generator-cli

# Generate TypeScript client
openapi-generator-cli generate \
  -i docs/openapi.yaml \
  -g typescript-fetch \
  -o clients/typescript

# Generate Python client
openapi-generator-cli generate \
  -i docs/openapi.yaml \
  -g python \
  -o clients/python
```

## API Overview

### Base URL

**Development**: `http://localhost:3000/api/v1`

**Production**: `https://api.vibecode.dev/v1`

### Authentication

All endpoints (except `/auth/register`, `/auth/login`, and `/health`) require JWT authentication.

Include the access token in the `Authorization` header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Rate Limiting

- **API Requests**: 1000 requests/hour per user
- **WebSocket Connections**: 100 concurrent per user
- **WebSocket Messages**: 1000 messages/second per connection

Rate limit information is included in response headers:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1633024800
```

## API Categories

### Authentication (5 endpoints)
- Register new users
- Login with email/password
- OAuth (GitHub, Google)
- Token refresh
- Get current user profile

### Users (2 endpoints)
- Get user profile
- Update user profile

### Teams (7 endpoints)
- Create and manage teams
- Add/remove team members
- List teams and members
- Team roles: admin, developer, viewer

### Projects (5 endpoints)
- Create and organize projects
- Personal or team-owned projects
- Archive/restore projects

### Environments (15+ endpoints)
- Create Docker-based development environments
- Start/stop/restart environments
- Manage environment variables
- Configure port mappings
- Monitor environment status

### Sessions (5 endpoints)
- Create VS Code, tmux, or shell sessions
- List active sessions
- Terminate sessions
- Session idle timeout management

### Extensions (5 endpoints)
- Search VS Code extensions
- Install/uninstall extensions
- Track installation status
- Custom extension registry

### Logs (3 endpoints)
- Retrieve historical logs
- Filter by stream (stdout/stderr)
- WebSocket log streaming (real-time)

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "ValidationError",
  "message": "Invalid input data",
  "details": {
    "field": "email",
    "reason": "Invalid email format"
  }
}
```

### HTTP Status Codes

- **200 OK**: Successful request
- **201 Created**: Resource created successfully
- **204 No Content**: Successful request with no response body
- **400 Bad Request**: Invalid request parameters
- **401 Unauthorized**: Authentication required or invalid credentials
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource conflict (duplicate, invalid state)
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

## Examples

### Complete Flow: Create and Start Environment

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
PROJECT_ID="550e8400-e29b-41d4-a716-446655440003"

# 3. Create Environment
curl -X POST http://localhost:3000/api/v1/environments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Dev\",\"slug\":\"dev\",\"projectId\":\"$PROJECT_ID\",\"baseImage\":\"node:20\"}"

# Save environmentId from response
ENV_ID="550e8400-e29b-41d4-a716-446655440004"

# 4. Start Environment
curl -X POST http://localhost:3000/api/v1/environments/$ENV_ID/start \
  -H "Authorization: Bearer $TOKEN"

# 5. Get Logs
curl http://localhost:3000/api/v1/environments/$ENV_ID/logs?tail=50 \
  -H "Authorization: Bearer $TOKEN"
```

## WebSocket API

### Log Streaming

Connect to: `ws://localhost:3000/api/v1/ws/environments/{envId}/logs?token={jwt_token}`

**Server → Client: Log Entry**
```json
{
  "type": "log",
  "data": {
    "id": "550e8400-e29b-41d4-a716-44665544000a",
    "timestamp": "2025-10-01T12:00:00.123Z",
    "stream": "stdout",
    "message": "Server started on port 3000"
  }
}
```

**Client → Server: Control Message**
```json
{
  "type": "control",
  "action": "pause",
  "params": {
    "stream": "stdout"
  }
}
```

### Terminal (PTY)

Connect to: `ws://localhost:3000/api/v1/ws/environments/{envId}/terminal?token={jwt_token}`

**Server → Client: Terminal Data**
```json
{
  "type": "data",
  "data": "\u001b[32muser@container:~$\u001b[0m "
}
```

**Client → Server: Terminal Input**
```json
{
  "type": "input",
  "data": "ls -la\n"
}
```

**Client → Server: Resize Terminal**
```json
{
  "type": "resize",
  "cols": 120,
  "rows": 40
}
```

## Additional Resources

- **[API Reference](../../.claude/api_reference.md)** - Human-readable API documentation
- **[Spec Kit Contracts](../../specs/001-develop-vibecode-a/data-model.md)** - Data model definitions
- **[Security Guide](../../.claude/security.md)** - Security best practices
- **[Quick Start Guide](../../.claude/quick_start.md)** - Getting started

## Updating the Documentation

When adding new endpoints or modifying existing ones:

1. Update `openapi.yaml` with the new endpoint specification
2. Add comprehensive TSDoc comments to the route handler
3. Include request/response examples
4. Update the `.claude/api_reference.md` if needed
5. Test the endpoint in Swagger UI

The Swagger UI will automatically reflect changes to `openapi.yaml` after server restart.

## Validation

Validate the OpenAPI specification:

```bash
# Install validator
npm install -g @apidevtools/swagger-cli

# Validate specification
swagger-cli validate docs/openapi.yaml
```

## Contributing

When contributing to the API:

1. Follow OpenAPI 3.0 specification standards
2. Include detailed descriptions and examples
3. Document all error cases
4. Add TSDoc comments to all route handlers
5. Test endpoints in Swagger UI before committing

---

**Last Updated**: 2025-10-01
**API Version**: 1.0.0
**OpenAPI Version**: 3.0.3
