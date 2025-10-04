# Security Implementation Guide

This document details the security features implemented in VibeBox and provides operational procedures for production deployment.

## Table of Contents
1. [Authentication & Authorization](#authentication--authorization)
2. [Secrets Management](#secrets-management)
3. [Database Security](#database-security)
4. [Container Security](#container-security)
5. [Application Security](#application-security)
6. [Monitoring & Incident Response](#monitoring--incident-response)
7. [Operational Procedures](#operational-procedures)

---

## Authentication & Authorization

### JWT Session Timeout Enforcement ✅

**Implementation:** `backend/src/lib/config.ts`, `backend/src/services/auth.service.ts`

- **Access tokens**: Expire in 15 minutes (configurable via `JWT_EXPIRES_IN`)
- **Refresh tokens**: Expire in 7 days (configurable via `JWT_REFRESH_EXPIRES_IN`)
- **Algorithm**: HS256 (HMAC with SHA-256)
- **Secret rotation**: See [JWT Secret Rotation](#jwt-secret-rotation)

```typescript
// Configuration
jwt: {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
}
```

### API Rate Limiting ✅

**Implementation:** `backend/src/api/middleware/rateLimit.ts`

- **Global rate limit**: 100 requests/minute per IP
- **Auth endpoints**: 5 requests/minute (registration, token refresh)
- **Login endpoint**: 5 attempts per 15 minutes per IP (brute force protection)
- **Per-user limits**: 1000 requests/hour for authenticated users
- **Headers**: Returns `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

```typescript
// Pre-configured rate limits
rateLimits.login     // 5 req/15min - Brute force protection
rateLimits.auth      // 5 req/min - Standard auth operations
rateLimits.perIP     // 100 req/min - Global per-IP limit
rateLimits.api       // Composite: 100/min per IP, 1000/hour per user
```

### Brute Force Protection ✅

**Implementation:** `backend/src/api/routes/auth.routes.ts`, `backend/src/api/middleware/rateLimit.ts`

- Login endpoint limited to 5 attempts per 15 minutes per IP
- Failed login attempts logged with HIGH severity for security monitoring
- Audit trail includes IP address, timestamp, and attempted email
- Rate limit headers inform clients of retry timing

### RBAC Enforcement ✅

**Implementation:** `backend/src/api/middleware/rbac.ts`

Role hierarchy (admin > developer > viewer):
- **admin**: Full control over team resources
- **developer**: Can create/modify projects and environments
- **viewer**: Read-only access

```typescript
// Middleware examples
requireTeamRole(UserTeamRole.admin)              // Require admin role
requireTeamMembership()                          // Require team membership (any role)
requireOwnershipOrAdmin({ resourceType: 'project' }) // Owner or admin
requireAnyTeamRole(UserTeamRole.developer)       // Developer in any team
```

### OAuth Token Refresh Handling ✅

**Implementation:** `backend/src/services/auth.service.ts`

OAuth integration with GitHub and Google providers:
- OAuth profiles stored with user records
- JWT tokens issued after OAuth authentication
- Refresh token mechanism applies to OAuth sessions
- User profile updates on each OAuth login

**Note**: OAuth provider token refresh is handled by the OAuth provider. VibeBox uses JWT tokens after OAuth authentication completes.

### JWT Secret Rotation

**Procedure:**

1. **Generate new secrets**:
   ```bash
   # Generate 64-character random string for JWT secrets
   openssl rand -base64 48
   ```

2. **Update environment variables**:
   ```bash
   # Set new secrets
   NEW_JWT_SECRET="<new-secret>"
   NEW_JWT_REFRESH_SECRET="<new-refresh-secret>"
   ```

3. **Implement dual-secret verification** (for zero-downtime rotation):
   - Update `auth.middleware.ts` to accept both old and new secrets during transition
   - Configure transition period (e.g., 7 days for refresh tokens)

4. **Rotate secrets**:
   ```bash
   # Step 1: Deploy with dual-secret support
   kubectl set env deployment/vibebox-backend \
     JWT_SECRET_NEW="$NEW_JWT_SECRET" \
     JWT_REFRESH_SECRET_NEW="$NEW_JWT_REFRESH_SECRET"

   # Step 2: Wait for transition period (7 days)

   # Step 3: Make new secrets primary
   kubectl set env deployment/vibebox-backend \
     JWT_SECRET="$NEW_JWT_SECRET" \
     JWT_REFRESH_SECRET="$NEW_JWT_REFRESH_SECRET"

   # Step 4: Remove old secrets after another 7 days
   kubectl set env deployment/vibebox-backend \
     JWT_SECRET_OLD- \
     JWT_REFRESH_SECRET_OLD-
   ```

5. **Schedule**: Rotate JWT secrets every 90 days minimum, immediately if compromised

---

## Secrets Management

### Environment Variable Validation ✅

**Implementation:** `backend/src/lib/validate-env.ts`

Validates on startup:
- **Presence**: All required environment variables exist
- **Format**: Database URLs, JWT secrets, encryption keys meet requirements
- **Security**: No weak/default secrets in production
- **Strength**: JWT secrets minimum 32 characters, encryption key exactly 32 characters

```bash
# Validation checks
✓ DATABASE_URL format (postgresql://, password required in prod)
✓ JWT_SECRET length >= 32 characters
✓ JWT_REFRESH_SECRET length >= 32 characters
✓ ENCRYPTION_KEY exactly 32 characters (AES-256)
✓ PORT valid range (1-65535)
✓ No default/weak secrets in production
```

### Encrypted Environment Variables ✅

**Implementation:** `backend/src/lib/secrets.ts`, `backend/src/lib/config.ts`

Supports multiple secret backends:
- **AWS Secrets Manager**
- **Google Cloud Secret Manager**
- **Azure Key Vault**
- **HashiCorp Vault**
- **Kubernetes Secrets**

```typescript
// Secret reference syntax in environment variables
DATABASE_URL="${secret:database-password}"
JWT_SECRET="${secret:jwt-secret}"

// Automatic provider detection
const secretManager = await getSecretManager();
const secret = await secretManager.get('database-password');
```

### No Secrets in Logs ✅

**Implementation:** Enforced throughout codebase

- Passwords excluded from validation error messages
- Database URLs sanitized in logs
- JWT tokens never logged
- Audit logs store only metadata (not secret values)
- Error responses don't expose configuration details

### Audit Logging for Secret Access ✅

**Implementation:** `backend/src/services/audit.service.ts`

Secret operations logged:
- `secret_create` - Medium severity
- `secret_access` - High severity
- `secret_update` - High severity
- `secret_delete` - Critical severity

All secret audit logs include:
- User ID and email
- IP address and user agent
- Resource ID (environment, project)
- Timestamp
- Success/failure status

### Secret Rotation Procedures

**Procedure for rotating application secrets:**

1. **Database Password Rotation**:
   ```bash
   # Step 1: Create new password
   NEW_PASSWORD=$(openssl rand -base64 32)

   # Step 2: Update database user password
   psql -c "ALTER USER vibebox_user WITH PASSWORD '$NEW_PASSWORD';"

   # Step 3: Update secret manager
   aws secretsmanager update-secret \
     --secret-id database-password \
     --secret-string "$NEW_PASSWORD"

   # Step 4: Rolling restart application pods
   kubectl rollout restart deployment/vibebox-backend
   ```

2. **Encryption Key Rotation**:
   ```bash
   # Step 1: Generate new key (exactly 32 characters for AES-256)
   NEW_KEY=$(openssl rand -base64 24)

   # Step 2: Re-encrypt all encrypted fields with new key
   node scripts/rotate-encryption-key.js --old-key "$OLD_KEY" --new-key "$NEW_KEY"

   # Step 3: Update secret manager
   aws secretsmanager update-secret \
     --secret-id encryption-key \
     --secret-string "$NEW_KEY"
   ```

3. **OAuth Client Secret Rotation**:
   ```bash
   # Step 1: Generate new secret in OAuth provider console
   # Step 2: Update secret manager
   aws secretsmanager update-secret \
     --secret-id github-client-secret \
     --secret-string "$NEW_SECRET"

   # Step 3: Rolling restart
   kubectl rollout restart deployment/vibebox-backend
   ```

**Schedule**: Rotate secrets every 90 days minimum, immediately if compromised

---

## Database Security

### Connection Pooling ✅

**Implementation:** `backend/src/lib/db.ts`

Configuration:
- **Pool size**: 10 connections (configurable via `DB_POOL_SIZE`)
- **Pool timeout**: 10 seconds (configurable via `DB_POOL_TIMEOUT`)
- **Statement cache**: 100 statements (production only)
- **Connect timeout**: 10 seconds

```typescript
// Environment variables
DB_POOL_SIZE=20
DB_POOL_TIMEOUT=10

// Applied via DATABASE_URL query parameters
postgresql://user:pass@host/db?connection_limit=20&pool_timeout=10
```

### Prepared Statements (SQL Injection Prevention) ✅

**Implementation:** Automatic via Prisma ORM

- All database queries use parameterized prepared statements
- Prisma automatically escapes and sanitizes inputs
- No raw SQL queries except in explicitly reviewed cases
- Type-safe query builder prevents injection attacks

```typescript
// ✅ Safe - Parameterized query via Prisma
await prisma.user.findUnique({ where: { email: userInput } });

// ❌ Unsafe - Raw SQL (avoided)
await prisma.$queryRaw`SELECT * FROM users WHERE email = ${userInput}`;
```

### Row-Level Security (RLS)

**Status**: Implemented at application layer via RBAC middleware

**Application-level RLS**:
- Team membership required for team resource access
- Project ownership or team admin role required for modifications
- Environment ownership enforced
- Secret access restricted to environment owners and team admins

**Database-level RLS** (optional, for defense-in-depth):

```sql
-- Enable RLS on sensitive tables
ALTER TABLE secrets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access secrets in their team's environments
CREATE POLICY secrets_team_access ON secrets
  FOR SELECT
  USING (
    environment_id IN (
      SELECT e.id FROM environments e
      JOIN projects p ON e.project_id = p.id
      JOIN user_teams ut ON p.team_id = ut.team_id
      WHERE ut.user_id = current_setting('app.user_id')::uuid
    )
  );
```

### Database Backups

**Procedure**:

1. **Automated Backups** (PostgreSQL):
   ```bash
   # Daily backup with pg_dump
   pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
     --format=custom \
     --file=/backups/vibebox-$(date +%Y%m%d).dump

   # Upload to S3
   aws s3 cp /backups/vibebox-$(date +%Y%m%d).dump \
     s3://vibebox-backups/daily/
   ```

2. **Retention Policy**:
   - Daily backups: 7 days
   - Weekly backups: 4 weeks
   - Monthly backups: 12 months

3. **Restore Procedure**:
   ```bash
   # Download backup
   aws s3 cp s3://vibebox-backups/daily/vibebox-20231201.dump .

   # Restore
   pg_restore -h $DB_HOST -U $DB_USER -d $DB_NAME \
     --clean --if-exists \
     vibebox-20231201.dump
   ```

4. **Kubernetes CronJob**:
   ```yaml
   apiVersion: batch/v1
   kind: CronJob
   metadata:
     name: database-backup
   spec:
     schedule: "0 2 * * *"  # 2 AM daily
     jobTemplate:
       spec:
         template:
           spec:
             containers:
             - name: backup
               image: postgres:16
               command: ["/bin/sh", "-c"]
               args:
                 - |
                   pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
                     --format=custom \
                     --file=/backup/dump.sql
                   aws s3 cp /backup/dump.sql s3://backups/
   ```

### Encryption at Rest

**Database Level**:
- Use cloud provider's managed PostgreSQL with encryption at rest enabled
- AWS RDS: Enable encryption when creating instance
- GCP Cloud SQL: Encryption enabled by default
- Azure Database: Enable storage encryption

**Application Level**:
- Sensitive fields encrypted using `ENCRYPTION_KEY`
- AES-256-GCM encryption for secrets
- Implementation: `backend/src/lib/encryption.ts` (if needed)

```bash
# AWS RDS encryption
aws rds create-db-instance \
  --db-instance-identifier vibebox-db \
  --storage-encrypted \
  --kms-key-id arn:aws:kms:region:account:key/key-id
```

---

## Container Security

### Docker Socket Access Restrictions ✅

**Implementation:** `backend/src/services/docker-security.service.ts`

Security policy enforces:
- ✅ Prevent Docker socket mounting (`/var/run/docker.sock`)
- ✅ Block Docker-in-Docker images
- ✅ Whitelist approved base images
- ✅ Prevent use of `:latest` tag

```typescript
const DEFAULT_SECURITY_POLICY = {
  preventDockerSocket: true,
  blockedImages: ['docker:*', 'dind:*'],
  allowedImages: ['node:*', 'python:*', 'ubuntu:*', 'alpine:*'],
};
```

### Container Resource Limits ✅

**Implementation:** `backend/src/services/docker.service.ts`

Default limits per container:
- **CPU**: 2 cores (configurable)
- **Memory**: 4096 MB (configurable)
- **Storage**: Managed via Docker volume limits

```typescript
const container = await dockerService.createContainer({
  name: 'dev-env',
  image: 'node:20-alpine',
  cpuLimit: 2,      // 2 CPU cores
  memoryLimit: 4096, // 4 GB RAM
});
```

### Network Isolation ✅

**Implementation:** `backend/src/services/docker-security.service.ts`

- **Isolated mode**: Each environment on separate network (default)
- **Shared mode**: Environments can communicate within team
- **None mode**: No network access (disabled by security policy)

```typescript
networkIsolation: 'isolated'  // Default: separate network per environment
```

### Non-Root Containers ✅

**Implementation:** Enforced by security policy

```typescript
enforceNonRoot: true  // Requires USER directive in Dockerfile
dropCapabilities: ['ALL']  // Drop all Linux capabilities
preventPrivilegeEscalation: true  // Prevent escalation
```

### Image Scanning

**Procedure** (CI/CD integration):

```yaml
# GitHub Actions workflow
- name: Scan Docker image
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: 'vibebox:${{ github.sha }}'
    format: 'sarif'
    exit-code: '1'  # Fail on HIGH/CRITICAL vulnerabilities
    severity: 'CRITICAL,HIGH'
```

**Manual scanning**:
```bash
# Scan image with Trivy
trivy image --severity HIGH,CRITICAL node:20-alpine

# Scan with Snyk
snyk container test node:20-alpine
```

---

## Application Security

### CORS Configuration ✅

**Implementation:** `backend/src/server.ts`, `backend/src/api/middleware/security.ts`

- Whitelist-based origin validation
- Wildcard pattern support (e.g., `*.example.com`)
- Credentials enabled for authenticated requests
- Exposed headers for rate limiting info

```typescript
// Configuration
FRONTEND_URL=https://app.example.com
CORS_ALLOWED_ORIGINS=https://admin.example.com,*.example.com

// Headers
Access-Control-Allow-Origin: <origin>
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
```

### CSRF Protection ✅

**Implementation:** `backend/src/api/middleware/csrf.ts`

**Note**: For JWT-based APIs, CSRF is primarily mitigated by:
1. Bearer token authentication (not cookies)
2. CORS configuration (origin validation)
3. Origin/Referer header validation

CSRF middleware provides defense-in-depth by validating request origins for state-changing operations.

```typescript
// Optional: Apply CSRF protection to specific routes
fastify.post('/api/resource',
  { preHandler: csrfProtection },
  handler
);
```

### Input Validation ✅

**Implementation:** `backend/src/api/middleware/validation.ts`

All endpoints use validation middleware:
- Type checking (string, number, boolean, array, object)
- Length constraints (min/max)
- Pattern matching (regex)
- Enum validation
- Custom validators
- **Automatic sanitization** (XSS prevention)

```typescript
// Example validation
validate({
  body: {
    email: { type: 'string', required: true, pattern: patterns.email, sanitize: 'email' },
    name: { type: 'string', required: true, min: 1, max: 100, sanitize: 'string' },
  }
})
```

### Output Encoding/Sanitization ✅

**Implementation:** `backend/src/api/middleware/security.ts`

Sanitization functions:
- `sanitize.string()` - Remove control characters, null bytes
- `sanitize.html()` - Strip HTML tags
- `sanitize.email()` - Normalize email addresses
- `sanitize.url()` - Validate and sanitize URLs
- `sanitize.sql()` - Remove SQL injection patterns
- `sanitize.filename()` - Remove path traversal attempts
- `sanitize.object()` - Recursively sanitize object values

### Security Headers ✅

**Implementation:** `backend/src/api/middleware/security.ts`

Headers applied to all responses:
- `Content-Security-Policy`: Prevents XSS attacks
- `Strict-Transport-Security`: Forces HTTPS
- `X-Frame-Options`: Prevents clickjacking
- `X-Content-Type-Options`: Prevents MIME sniffing
- `X-XSS-Protection`: Browser XSS filtering
- `Referrer-Policy`: Controls referrer information
- `Permissions-Policy`: Restricts browser features

```typescript
// Configuration
ENABLE_SECURITY_HEADERS=true  // Default: enabled
CSP_DIRECTIVE="default-src 'self'; script-src 'self' 'unsafe-inline';"
```

### Dependency Vulnerability Scanning

**Procedure**:

1. **Automated scanning** (npm audit):
   ```bash
   # Run audit
   npm audit

   # Fix automatically
   npm audit fix

   # Fix with breaking changes
   npm audit fix --force
   ```

2. **CI/CD integration**:
   ```yaml
   # GitHub Actions
   - name: Run security audit
     run: npm audit --audit-level=high
   ```

3. **Snyk integration**:
   ```bash
   # Install Snyk
   npm install -g snyk

   # Authenticate
   snyk auth

   # Test for vulnerabilities
   snyk test

   # Monitor continuously
   snyk monitor
   ```

4. **Schedule**: Run weekly, fix HIGH/CRITICAL within 7 days

---

## Monitoring & Incident Response

### Audit Logging ✅

**Implementation:** `backend/src/services/audit.service.ts`

All sensitive operations logged to database:
- Authentication events (login, register, password change)
- Authorization changes (role changes, team membership)
- Resource operations (create, update, delete)
- Secret access
- System configuration changes

Audit log includes:
- User ID and email
- Action type and severity
- Resource type and ID
- IP address and user agent
- Timestamp
- Success/failure status
- Error message (if failed)

```typescript
// Severity levels
LOW      // Routine operations (view)
MEDIUM   // Standard operations (create, update)
HIGH     // Sensitive operations (delete, secret access, failed auth)
CRITICAL // Critical operations (role change, user delete, system config)
```

### Security Event Monitoring

**Queries for security monitoring**:

```typescript
// Failed login attempts (last 24 hours)
const failedLogins = await getFailedAuthAttempts({
  hours: 24,
  limit: 100
});

// Security events (HIGH/CRITICAL severity)
const securityEvents = await getSecurityEvents({
  hours: 24,
  limit: 100
});

// Brute force detection
const attempts = await countFailedAuthAttempts(ipAddress, 15);
if (attempts > 5) {
  // Alert: Potential brute force attack
}

// Unusual activity patterns
const userLogs = await getUserAuditLogs(userId, {
  limit: 1000,
  action: AuditAction.secret_access
});
```

### Log Retention Policies ✅

**Implementation:** `backend/src/services/log-cleanup.service.ts`

- **Container logs**: 7 days retention
- **Max size**: 20 MB per environment
- **Cleanup**: Daily at midnight (cron job)
- **Audit logs**: Retained indefinitely (separate from container logs)

```typescript
// Configuration
LOG_RETENTION_DAYS=7
MAX_LOG_SIZE_MB=20

// Automated cleanup via scheduler
scheduler.register({
  name: 'log-cleanup',
  schedule: '0 0 * * *',  // Daily at midnight
  handler: logCleanupService.runCleanup
});
```

### Alerting for Suspicious Activities

**Procedure**:

1. **Configure alerting** (Prometheus + Alertmanager example):
   ```yaml
   groups:
     - name: security
       rules:
         - alert: HighFailedLoginRate
           expr: rate(audit_logs{action="auth_login_failed"}[5m]) > 10
           for: 5m
           annotations:
             summary: "High failed login rate detected"

         - alert: UnusualSecretAccess
           expr: increase(audit_logs{action="secret_access"}[1h]) > 100
           for: 5m
           annotations:
             summary: "Unusual secret access pattern detected"
   ```

2. **Application-level monitoring**:
   ```typescript
   // Monitor failed auth attempts
   if (await countFailedAuthAttempts(ipAddress, 15) > 5) {
     logger.warn({ ipAddress }, 'Potential brute force attack');
     // Send alert to security team
     await sendSecurityAlert({
       type: 'brute_force',
       ipAddress,
       attempts: await countFailedAuthAttempts(ipAddress, 15)
     });
   }
   ```

3. **Integration with incident response**:
   - Failed login alerts → Security team investigation
   - Secret access spikes → Audit review
   - HIGH/CRITICAL audit events → Immediate notification

### Incident Response Procedures

**Procedure for security incidents**:

1. **Detection**:
   - Monitor security alerts
   - Review audit logs daily
   - Investigate anomalies

2. **Containment**:
   ```bash
   # Suspend compromised user
   psql -c "UPDATE users SET is_active = false WHERE id = '$USER_ID';"

   # Revoke all active sessions
   redis-cli KEYS "session:$USER_ID:*" | xargs redis-cli DEL

   # Block IP address
   kubectl patch configmap nginx-config \
     --patch '{"data":{"blocked-ips":"1.2.3.4,5.6.7.8"}}'
   ```

3. **Investigation**:
   ```sql
   -- Review user activity
   SELECT * FROM audit_logs
   WHERE user_id = '$USER_ID'
     AND timestamp > NOW() - INTERVAL '24 hours'
   ORDER BY timestamp DESC;

   -- Check secret access
   SELECT * FROM audit_logs
   WHERE action IN ('secret_access', 'secret_update', 'secret_delete')
     AND timestamp > NOW() - INTERVAL '7 days';
   ```

4. **Remediation**:
   - Rotate compromised secrets
   - Reset user passwords
   - Review and update security policies
   - Patch vulnerabilities

5. **Post-Incident**:
   - Document incident
   - Update runbooks
   - Improve monitoring/alerts
   - Conduct blameless postmortem

---

## Operational Procedures

### Production Deployment Checklist

**Pre-Deployment**:
- [ ] All secrets rotated and stored in secret manager
- [ ] Environment variables validated (`npm run validate-env`)
- [ ] Database backups configured and tested
- [ ] Security headers enabled (`ENABLE_SECURITY_HEADERS=true`)
- [ ] Rate limiting configured
- [ ] SSL/TLS certificates installed
- [ ] CORS origins configured for production domains
- [ ] Container resource limits set
- [ ] Network policies applied
- [ ] Audit logging enabled
- [ ] Monitoring and alerting configured

**Deployment**:
- [ ] Run database migrations
- [ ] Deploy with zero-downtime strategy
- [ ] Verify health checks passing
- [ ] Test authentication flow
- [ ] Verify security headers in production
- [ ] Check rate limiting is active
- [ ] Validate audit logs are being written

**Post-Deployment**:
- [ ] Monitor error rates
- [ ] Review security events
- [ ] Verify backup execution
- [ ] Test incident response procedures
- [ ] Document deployment

### Security Maintenance Schedule

**Daily**:
- [ ] Review security alerts
- [ ] Check failed authentication attempts
- [ ] Monitor resource usage

**Weekly**:
- [ ] Review audit logs
- [ ] Run dependency vulnerability scan
- [ ] Check backup integrity

**Monthly**:
- [ ] Security event analysis
- [ ] Review and update security policies
- [ ] Test restore procedures
- [ ] Review user access and permissions

**Quarterly**:
- [ ] Rotate JWT secrets
- [ ] Rotate database passwords
- [ ] Rotate encryption keys
- [ ] Security training for team
- [ ] Review incident response procedures

**Annually**:
- [ ] Comprehensive security audit
- [ ] Penetration testing
- [ ] Compliance review
- [ ] Update security documentation

---

## Additional Resources

- **Security Guide**: `.claude/security.md`
- **API Reference**: `.claude/api_reference.md`
- **Kubernetes Deployment**: `.claude/kubernetes.md`
- **Secrets Management**: `.claude/secrets_management.md`
- **Audit Service**: `backend/src/services/audit.service.ts`
- **Security Middleware**: `backend/src/api/middleware/security.ts`

---

**Document Version**: 1.0
**Last Updated**: 2025-10-03
**Next Review**: 2025-11-03
