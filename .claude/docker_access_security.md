# Docker Access Security Model

This document explains why and how VibeBox's backend service accesses Docker, and the security measures in place to prevent abuse.

## TL;DR for Code Reviewers

✅ **The backend service having Docker access is INTENTIONAL and REQUIRED**

- This is the standard pattern for container-as-a-service platforms
- Multiple layers of security protect against abuse
- User containers DO NOT have Docker access (enforced by security policies)
- Same model used by Jenkins, GitLab Runner, Portainer, and similar platforms

---

## Why Does VibeBox Need Docker Access?

VibeBox is a **container-as-a-service platform** that provides on-demand development environments. To create and manage these environments, the backend service must:

1. Create Docker containers for user environments
2. Start, stop, and monitor containers
3. Manage container networking and isolation
4. Stream logs from containers
5. Execute commands in containers (interactive terminal)
6. Clean up containers when environments are deleted

**Without Docker access, VibeBox cannot function.**

---

## Security Model Overview

### Two-Tier Trust Model

```
┌─────────────────────────────────────────────────────────────────┐
│  TRUSTED TIER                                                   │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Backend Service (VibeBox API)                            │ │
│  │  ✅ HAS Docker access                                      │ │
│  │  ✅ Authenticated users only                              │ │
│  │  ✅ RBAC enforcement (team roles)                         │ │
│  │  ✅ Security policy validation                            │ │
│  │  ✅ Audit logging                                         │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Creates & manages
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  UNTRUSTED TIER                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  User Containers (Development Environments)               │ │
│  │  ❌ NO Docker access (Docker socket blocked)              │ │
│  │  ✅ Non-root user enforced                                │ │
│  │  ✅ Linux capabilities dropped                            │ │
│  │  ✅ Network isolated                                      │ │
│  │  ✅ Resource limits enforced                              │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Key Principle

**The backend is trusted; user containers are not.**

The backend enforces security on behalf of users. User containers are heavily restricted to prevent malicious activity.

---

## Deployment Architectures

VibeBox supports two deployment models with different Docker access patterns:

### 1. Docker Compose (Development)

**File:** `docker-compose.yml`

```yaml
backend:
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock  # Direct host socket access
```

**Access Method:** Unix socket (`/var/run/docker.sock`)

**Security Considerations:**
- Backend container has direct access to host's Docker daemon
- Simpler for local development
- Host must trust the backend container
- User containers created by backend are still secured

**Use Case:** Local development only

---

### 2. Kubernetes (Production)

**Files:**
- `k8s/base/backend-deployment.yaml`
- `k8s/base/docker-dind-deployment.yaml`

```yaml
# Backend connects via TCP
env:
  - name: DOCKER_HOST
    value: tcp://vibebox-docker-dind:2375

# Separate DinD service
docker-dind:
  securityContext:
    privileged: true  # Required for Docker daemon
  # Isolated by NetworkPolicy
```

**Access Method:** TCP connection to isolated Docker-in-Docker (DinD) service

**Security Considerations:**
- Backend does NOT have direct host access
- DinD runs in isolated pod with NetworkPolicy restrictions
- Only backend pods can connect to DinD
- DinD runs privileged but isolated from cluster control plane
- Better resource limits and monitoring

**Use Case:** Production deployments

**Benefits over Host Socket:**
- ✅ No host Docker socket exposure
- ✅ Isolated Docker daemon
- ✅ Better resource management
- ✅ Easier to monitor and scale
- ✅ Follows Kubernetes security best practices

---

## Security Protection Layers

### Layer 1: Authentication

**All Docker operations require authenticated users**

```typescript
// Auth middleware required on all Docker-related endpoints
fastify.post('/environments',
  { preHandler: [authenticate, requireTeamMembership()] },
  createEnvironmentHandler
);
```

**Implementation:** `backend/src/api/middleware/auth.ts`

### Layer 2: RBAC (Role-Based Access Control)

**Team membership and role checks on all operations**

```typescript
// Roles: admin > developer > viewer
// Only developers and admins can create environments
requireTeamRole(UserTeamRole.developer)

// Only owners or team admins can delete environments
requireOwnershipOrAdmin({ resourceType: 'environment' })
```

**Implementation:** `backend/src/api/middleware/rbac.ts`

### Layer 3: Security Policy Validation

**All container configurations validated before creation**

```typescript
// Enforced by DockerSecurityService
✅ Image whitelist/blacklist (blocks suspicious images)
✅ Docker socket mount prevention (blocks /var/run/docker.sock)
✅ Privileged mode blocking
✅ Non-root user enforcement
✅ Linux capability dropping (ALL capabilities dropped by default)
✅ Network isolation (separate network per environment)
```

**Implementation:** `backend/src/services/docker-security.service.ts`

**Default Security Policy:**
```typescript
{
  preventDockerSocket: true,
  enforceNonRoot: true,
  dropCapabilities: ['ALL'],
  preventPrivilegeEscalation: true,
  networkIsolation: 'isolated',
  blockedImages: ['docker:*', 'dind:*', '*:latest']
}
```

### Layer 4: Container Hardening

**All user containers run with strict security settings**

```typescript
{
  User: '1000:1000',                    // Non-root user
  SecurityOpt: ['no-new-privileges'],   // Prevent privilege escalation
  CapDrop: ['ALL'],                     // Drop all Linux capabilities
  ReadonlyRootfs: false,                // Allow writes (configurable)
  NetworkMode: 'isolated-network-id'    // Separate network per environment
}
```

### Layer 5: Audit Logging

**All Docker operations logged for security monitoring**

```typescript
await auditLog(request, {
  userId: user.id,
  action: AuditAction.environment_create,
  resource: 'environment',
  severity: AuditSeverity.medium,
  details: { image, cpuLimit, memoryLimit }
});
```

**Tracked Events:**
- Environment creation/deletion
- Container start/stop
- Failed operations (HIGH severity)
- Image pull requests
- Configuration changes

**Implementation:** `backend/src/services/audit.service.ts`

---

## Attack Scenarios & Mitigations

### Scenario 1: Container Escape to Host

**Attack:** User tries to mount Docker socket in their container

```dockerfile
# Malicious user's Dockerfile
FROM ubuntu
VOLUME /var/run/docker.sock:/var/run/docker.sock
```

**Mitigation:**

```typescript
// DockerSecurityService blocks this
if (config.HostConfig.Binds?.includes('/var/run/docker.sock')) {
  throw new SecurityPolicyViolationError('Docker socket mounting is not allowed');
}
```

**Result:** ❌ Container creation fails with security policy violation

---

### Scenario 2: Privileged Container

**Attack:** User tries to create privileged container

```javascript
// Malicious API request
POST /environments
{
  "image": "ubuntu",
  "privileged": true  // Attempt to get root privileges
}
```

**Mitigation:**

```typescript
// DockerSecurityService blocks this
if (config.HostConfig?.Privileged) {
  throw new SecurityPolicyViolationError('Privileged containers are not allowed');
}
```

**Result:** ❌ Container creation fails with security policy violation

---

### Scenario 3: Docker-in-Docker

**Attack:** User tries to run Docker inside their container

```javascript
// Malicious request
POST /environments
{
  "image": "docker:24-dind"  // Docker-in-Docker image
}
```

**Mitigation:**

```typescript
// DockerSecurityService blocks this
const blockedImages = ['docker:*', 'dind:*'];
if (matchesBlockedPattern(image, blockedImages)) {
  throw new SecurityPolicyViolationError('Image blocked by security policy');
}
```

**Result:** ❌ Container creation fails with blocked image error

---

### Scenario 4: Resource Exhaustion

**Attack:** User tries to create containers without resource limits

**Mitigation:**

```typescript
// Default resource limits enforced
const defaultLimits = {
  cpuLimit: 2,        // 2 CPU cores
  memoryLimit: 4096,  // 4 GB RAM
};

// Applied to all containers
NanoCpus: cpuLimit * 1e9,
Memory: memoryLimit * 1024 * 1024
```

**Result:** ✅ Container created with enforced limits

---

### Scenario 5: Unauthorized Access

**Attack:** Unauthenticated user tries to create container

**Mitigation:**

```typescript
// Authentication middleware blocks request
fastify.post('/environments', {
  preHandler: [authenticate],  // Throws 401 if not authenticated
  handler: createEnvironmentHandler
});
```

**Result:** ❌ Request fails with 401 Unauthorized

---

## Comparison with Similar Platforms

### Jenkins

**Docker Access:** Host socket or DinD
**Security:** Plugin-based, varies by configuration
**Use Case:** CI/CD pipelines

```yaml
# Jenkins with Docker
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
```

### GitLab Runner

**Docker Access:** Host socket, DinD, or Kubernetes
**Security:** Configuration-based isolation
**Use Case:** CI/CD pipelines

```yaml
# GitLab Runner Docker executor
[[runners]]
  executor = "docker"
  [runners.docker]
    privileged = true  # For DinD
```

### Portainer

**Docker Access:** Host socket or TCP
**Security:** RBAC, environment isolation
**Use Case:** Docker management UI

```yaml
# Portainer
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
```

### VibeBox

**Docker Access:** Host socket (dev) or DinD (prod)
**Security:** Multi-layer (auth + RBAC + policies + hardening + audit)
**Use Case:** Development environment as a service

**VibeBox has MORE security layers than most similar platforms.**

---

## Production Hardening Recommendations

### Option 1: Rootless Docker (Recommended)

Run Docker daemon as non-root user:

```yaml
# k8s/base/docker-dind-deployment.yaml
containers:
  - name: docker-dind
    image: docker:24.0-dind-rootless
    securityContext:
      privileged: false  # No longer required!
      runAsUser: 1000
```

**Benefits:**
- ✅ No privileged container required
- ✅ Better isolation from host
- ✅ Reduces attack surface

**Trade-offs:**
- ⚠️ Some Docker features may not work (e.g., iptables, VXLAN)
- ⚠️ Requires kernel support (user namespaces)

---

### Option 2: Sysbox Runtime

Use Nestybox Sysbox for enhanced container isolation:

```yaml
# k8s/base/docker-dind-deployment.yaml
spec:
  runtimeClassName: sysbox-runc
  containers:
    - name: docker-dind
      securityContext:
        privileged: false  # Sysbox provides isolation
```

**Benefits:**
- ✅ Run Docker in unprivileged containers
- ✅ Better security than traditional DinD
- ✅ VM-like isolation without VMs

**Trade-offs:**
- ⚠️ Requires Sysbox runtime installation on nodes
- ⚠️ Additional complexity

---

### Option 3: Kata Containers

Use VM-based isolation for containers:

```yaml
# k8s/base/docker-dind-deployment.yaml
spec:
  runtimeClassName: kata
```

**Benefits:**
- ✅ VM-level isolation (strongest)
- ✅ Kernel-level protection
- ✅ Complete process isolation

**Trade-offs:**
- ⚠️ Higher resource overhead (each container is a VM)
- ⚠️ Slower startup times
- ⚠️ Requires Kata runtime installation

---

## Testing Docker Access

### Verify Docker Connectivity

```bash
# From backend container
docker info

# Should show:
# - Server Version
# - Docker Root Dir
# - Operating System
```

### Test Container Creation

```bash
# From backend container
docker run --rm alpine echo "Hello from user container"

# Should successfully create and run container
```

### Test Security Policy

```bash
# Try to mount Docker socket (should fail)
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock alpine ls /var/run

# Should fail if security policies are enforced
```

---

## Monitoring & Alerting

### Key Metrics to Monitor

1. **Docker Operations per User**
   - Alert on >100 operations/hour per user
   - Indicates potential abuse or automation

2. **Failed Container Creations**
   - Alert on >10 failures/hour
   - May indicate attack attempts or misconfigurations

3. **Privileged Container Attempts**
   - Alert immediately on any attempt
   - Always indicates malicious activity

4. **Docker Socket Mount Attempts**
   - Alert immediately on any attempt
   - Always indicates escape attempt

5. **Resource Exhaustion**
   - Alert on >80% Docker daemon CPU/memory
   - May indicate resource abuse

### Audit Log Queries

```sql
-- Failed container creation attempts (suspicious)
SELECT * FROM audit_logs
WHERE action = 'environment_create'
  AND success = false
  AND severity = 'high'
  AND timestamp > NOW() - INTERVAL '1 hour';

-- Docker socket mount attempts (critical)
SELECT * FROM audit_logs
WHERE details::text LIKE '%docker.sock%'
  AND severity = 'critical';
```

---

## FAQ

### Q: Why not use Kubernetes API instead of Docker?

**A:** Kubernetes is designed for long-running services, not ephemeral dev environments. Docker provides:
- Faster container startup/stop
- Better interactive terminal support
- Simpler container lifecycle management
- Lower overhead for temporary workloads

### Q: Can users run Docker commands inside their environments?

**A:** No. User containers do NOT have Docker socket access. They cannot:
- Create new containers
- Access other users' containers
- Escape to the host
- Run Docker daemon

### Q: What if the Docker daemon is compromised?

**A:** Defense in depth:
1. Backend still requires authentication + RBAC
2. Network policies limit DinD access (Kubernetes)
3. Audit logs track all operations
4. Container hardening limits damage
5. Regular security updates on Docker daemon

### Q: Is this secure enough for production?

**A:** Yes, with proper configuration:
- ✅ Use Kubernetes with DinD (not host socket)
- ✅ Enable NetworkPolicies (isolate DinD)
- ✅ Use rootless Docker or Sysbox (if possible)
- ✅ Monitor audit logs for suspicious activity
- ✅ Keep Docker daemon updated
- ✅ Review RBAC policies regularly

This is the **industry-standard security model** for container platforms.

---

## References

- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [Kubernetes Security Contexts](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/)
- [Docker-in-Docker Security](https://docs.docker.com/engine/security/rootless/)
- [NIST Container Security Guide](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-190.pdf)
- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)

---

## Document Information

**Version:** 1.0
**Last Updated:** 2025-10-03
**Next Review:** 2025-11-03
**Owner:** VibeBox Security Team
