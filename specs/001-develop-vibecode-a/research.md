# Research & Technical Decisions

**Feature**: VibeCode - Dev Environment Management Tool
**Date**: 2025-09-30
**Status**: Complete

## Technology Stack Decisions

### Backend Framework

**Decision**: Fastify + TypeScript
**Rationale**:
- High performance (up to 2x faster than Express) suitable for real-time requirements
- Native TypeScript support with excellent type inference
- Built-in schema validation (JSON Schema) for API contracts
- WebSocket plugin available for log streaming
- Well-suited for microservices if needed for scaling

**Alternatives Considered**:
- Express.js: More mature ecosystem but slower performance and less TypeScript-native
- NestJS: More opinionated framework with dependency injection, may be overkill for initial implementation
- Koa: Lighter weight but smaller ecosystem and community

### Docker Integration

**Decision**: dockerode (Official Docker Node.js client)
**Rationale**:
- Official Docker-supported library with comprehensive API coverage
- Promise-based API fits well with async/await patterns
- Stream support for logs and container attach operations
- Active maintenance and wide adoption

**Alternatives Considered**:
- Docker CLI via child_process: Less reliable, harder to manage streams, no type safety
- docker-compose programmatic API: Focused on multi-container apps, less suitable for dynamic single-container management

### Frontend Framework

**Decision**: React 18+ with TypeScript
**Rationale**:
- Large ecosystem with extensive UI component libraries
- Excellent developer experience with hot reload
- Concurrent features for better UX with real-time updates
- Strong TypeScript integration
- xterm.js has React bindings for terminal integration

**Alternatives Considered**:
- Vue 3: Simpler learning curve but smaller ecosystem for enterprise features
- Svelte: Better performance but less mature ecosystem for complex state management
- Angular: More opinionated, steeper learning curve, heavier bundle size

### Terminal Emulation

**Decision**: xterm.js
**Rationale**:
- Industry standard for web-based terminals (used by VS Code, GitHub Codespaces)
- Full terminal emulation with ANSI escape code support
- Addon ecosystem (fit, weblinks, search)
- WebSocket integration for bidirectional communication
- Actively maintained by Microsoft

**Alternatives Considered**:
- term.js: Abandoned project, predecessor to xterm.js
- ttyd: Server-side solution, less flexible for our use case
- Custom implementation: Reinventing the wheel, high complexity

### Database

**Decision**: PostgreSQL
**Rationale**:
- ACID compliance for critical metadata (users, permissions, environment configs)
- JSON/JSONB support for flexible environment configuration storage
- Excellent performance for OLTP workloads (sub-second queries)
- Row-level security for multi-tenancy isolation
- Strong TypeScript ORM options (Prisma, TypeORM)

**Alternatives Considered**:
- MongoDB: Better for unstructured data but weaker consistency guarantees for permissions
- MySQL: Viable alternative but weaker JSON support
- SQLite: Too lightweight for multi-user concurrent access

### Authentication

**Decision**: Passport.js with JWT
**Rationale**:
- Supports multiple strategies (local, OAuth) from one library
- Widely adopted with extensive documentation
- Easy integration with Fastify via @fastify/passport
- Strategy pattern allows adding SSO/SAML later
- JWT for stateless API authentication

**Alternatives Considered**:
- NextAuth.js: Frontend-focused, less suitable for standalone backend API
- Auth0/Supabase: SaaS solutions reduce flexibility and increase vendor lock-in
- Custom implementation: High security risk, not recommended

### Real-time Communication

**Decision**: Native WebSocket (with @fastify/websocket)
**Rationale**:
- Low overhead for log streaming (no HTTP headers per message)
- Bidirectional communication for terminal interaction
- Browser-native support (no client library required)
- Fastify plugin provides clean integration
- Suitable for fan-out patterns (one container log to multiple clients)

**Alternatives Considered**:
- Server-Sent Events (SSE): Unidirectional only, no terminal input support
- Socket.IO: Additional abstraction layer, unnecessary complexity for our use case
- gRPC streaming: Not browser-native, requires additional proxy layer

## Architecture Patterns

### API Design

**Decision**: RESTful API with OpenAPI 3.0 specification
**Rationale**:
- Clear resource modeling (environments, projects, users)
- Standard HTTP verbs map well to CRUD operations
- OpenAPI enables contract-first development and auto-generated docs
- Easy to test and mock
- WebSocket for streaming (REST for state changes, WS for real-time data)

**Alternatives Considered**:
- GraphQL: Adds complexity, may be overkill for relatively simple data model
- tRPC: TypeScript-only, limits potential non-TS clients
- gRPC: Requires HTTP/2, not as browser-friendly

### State Management (Frontend)

**Decision**: React Context + Custom Hooks for global state, Component state for local
**Rationale**:
- Built-in solution, no external dependencies
- Sufficient for current complexity (user auth, environment list)
- Easy migration to Zustand/Redux later if needed
- Hooks provide clean separation of concerns

**Alternatives Considered**:
- Redux Toolkit: More boilerplate, may be premature optimization
- Zustand: Lightweight alternative, viable for future migration
- Recoil/Jotai: Atomic state management, unnecessary complexity initially

### Testing Strategy

**Decision**: TDD with three-tier testing (Contract → Integration → Unit)
**Rationale**:
- Contract tests ensure API stability (OpenAPI validation)
- Integration tests verify service interactions (DB, Docker)
- Unit tests for business logic isolation
- Playwright for E2E user flows
- Aligns with constitution's test-first principle

## Performance Considerations

### Log Streaming Optimization

**Decision**: Tail logs with configurable buffer, WebSocket fan-out
**Approach**:
- Docker logs API with `tail=100` parameter for initial load
- Stream new logs via dockerode event stream
- Server-side fan-out: one Docker stream to N WebSocket clients
- Client-side virtual scrolling for large log volumes

**Trade-offs**:
- Memory overhead for buffering (mitigated by 20MB rotation limit)
- Increased server CPU for fan-out (acceptable for target scale)

### Database Query Optimization

**Decision**: Indexed queries, connection pooling, caching for hot paths
**Approach**:
- Indexes on user_id, project_id, environment_id for common queries
- Connection pool (min: 5, max: 20 connections)
- Redis cache for environment status (5s TTL) to reduce Docker API calls
- Pagination for environment lists (20 per page)

### Environment Startup Time

**Decision**: Pre-pull common base images, parallel initialization
**Approach**:
- Background job to pre-pull node:20, node:18, node:16 images
- Parallel execution: container create + network setup + volume mount
- Optimistic UI updates (show "starting" immediately)
- Target: <2s from API call to container running state

## Security Considerations

### Container Isolation

**Decision**: Docker user namespaces, resource limits via cgroups
**Approach**:
- Each container runs with user namespace remapping
- CPU limit: 2 cores (configurable quota)
- Memory limit: 4GB with OOM killer
- Network isolation: custom bridge networks per environment
- Read-only root filesystem where possible

### Authentication & Authorization

**Decision**: JWT with short expiry + refresh tokens, RBAC
**Approach**:
- Access tokens: 15min expiry
- Refresh tokens: 7 days expiry, stored in httpOnly cookie
- Role-based access: owner, member, viewer per environment
- Team-level roles: admin, developer, viewer

### Data Protection

**Decision**: Encryption at rest (DB), in transit (TLS), secrets management
**Approach**:
- PostgreSQL transparent data encryption
- TLS 1.3 for all API/WebSocket traffic
- Environment variables encrypted in DB (AES-256)
- Docker secrets for sensitive container data
- No logging of tokens or passwords

## Scaling Strategy

### Horizontal Scaling Approach

**Decision**: Stateless API servers + sticky sessions for WebSocket
**Approach**:
- Multiple backend instances behind load balancer
- Sticky sessions (IP hash) for WebSocket connections
- Shared PostgreSQL and Docker daemon
- Future: Docker Swarm/Kubernetes for multi-host

**Limitations**:
- Single Docker daemon bottleneck (acceptable for 1,000 environments)
- Vertical scaling of Docker host required for growth
- Migration to orchestration at 5,000+ environment scale

## Open Questions for Future Phases

1. **VS Code Server Integration**: How to automatically inject and manage code-server in containers?
2. **Extension Installation**: Direct container exec or REST API to code-server?
3. **tmux Session Persistence**: Automatic recovery on container restart?
4. **Multi-host Docker**: Swarm mode vs Kubernetes for horizontal scaling?
5. **Log Export**: S3/GCS archival for compliance requirements?

## Phase 0 Completion Checklist

- [x] Backend framework selected and justified
- [x] Frontend framework selected and justified
- [x] Database chosen with rationale
- [x] Authentication strategy defined
- [x] Real-time communication approach decided
- [x] Performance optimization strategies outlined
- [x] Security considerations documented
- [x] Scaling strategy defined
- [x] All NEEDS CLARIFICATION items from spec resolved
- [x] No blocking unknowns remaining

**Status**: ✅ Ready for Phase 1 (Design & Contracts)
