# Security Guide

## 🔐 Secrets Management

### Environment Variables

VibeBox uses environment variables for all sensitive configuration. **Never commit credentials to version control.**

### Required Secrets

**Database**:
- `POSTGRES_USER` - Database username
- `POSTGRES_PASSWORD` - Database password (strong, unique)
- `DATABASE_URL` - Full PostgreSQL connection string
- `DATABASE_URL_TEST` - Test database connection string

**JWT Authentication**:
- `JWT_SECRET` - Token signing key (min 32 characters, cryptographically random)
- `JWT_REFRESH_SECRET` - Refresh token key (min 32 characters, different from JWT_SECRET)

**OAuth Providers** (optional):
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`

**Encryption**:
- `ENCRYPTION_KEY` - For encrypting environment variables in database (32 characters)

### Setup Instructions

1. **Copy example file**:
   ```bash
   cp .env.example .env
   ```

2. **Generate secure secrets**:
   ```bash
   # Generate JWT secrets
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

   # Generate encryption key
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **Set strong database password**:
   ```bash
   # Use a password manager or generate one:
   openssl rand -base64 32
   ```

4. **Update .env file** with generated values

5. **Verify .env is in .gitignore**:
   ```bash
   grep "^\.env$" .gitignore
   ```

---

## 🛡️ Production Security Checklist

### Before Deployment

- [ ] All `.env` files configured with production-grade secrets
- [ ] JWT secrets are different from development
- [ ] Database uses strong, unique password
- [ ] Encryption key is 32+ characters and random
- [ ] OAuth credentials are from production apps
- [ ] `.env` files are NOT in version control
- [ ] Secrets are stored in secure secret manager (AWS Secrets Manager, HashiCorp Vault, etc.)

### Infrastructure

- [ ] PostgreSQL is not exposed to public internet
- [ ] Database uses SSL/TLS connections
- [ ] Backend API uses HTTPS
- [ ] CORS is configured with specific origins (not `*`)
- [ ] Rate limiting is enabled
- [ ] Environment variables are injected at runtime (not baked into images)

### Access Control

- [ ] Database user has minimal required permissions
- [ ] Docker socket access is restricted
- [ ] API authentication is enforced on all protected routes
- [ ] OAuth callback URLs are whitelisted

---

## 🔒 Per-Environment Database Architecture

VibeBox uses **one shared PostgreSQL database** for storing all application metadata (users, teams, projects, environments).

**User-Created Environments** (Docker containers managed by VibeBox):
- Users can add their own PostgreSQL containers via `docker-compose.yml`
- VibeBox does NOT automatically provision databases for each environment
- Database containers are user-managed and project-specific

Example user project with PostgreSQL:

```yaml
# User's project docker-compose.yml
version: '3.8'
services:
  app:
    image: myapp:latest
    environment:
      DATABASE_URL: postgresql://appuser:apppass@db:5432/appdb

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: appdb
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: ${DB_PASSWORD}  # User sets this
    volumes:
      - dbdata:/var/lib/postgresql/data

volumes:
  dbdata:
```

---

## 📊 Encryption at Rest

### Environment Variables

User environment variables stored in the database are encrypted using AES-256-GCM:

- **Encryption Key**: `ENCRYPTION_KEY` from .env (32 bytes)
- **Algorithm**: AES-256-GCM
- **IV**: Random, stored with ciphertext
- **Key Rotation**: Not yet implemented (roadmap)

### Database Backups

- Use PostgreSQL's native encryption features
- Encrypt backup files before storing remotely
- Rotate backup encryption keys periodically

---

## 🚨 Security Incident Response

### If Credentials Are Leaked

1. **Immediately rotate all secrets**:
   ```bash
   # Generate new secrets
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

   # Update .env
   # Restart services
   docker-compose restart
   ```

2. **Revoke compromised OAuth apps** (GitHub/Google developer consoles)

3. **Check database access logs** for unauthorized access

4. **Invalidate all user sessions**:
   ```sql
   -- Force all users to re-login
   DELETE FROM sessions;
   ```

5. **Review audit logs** (if enabled)

### If Database Is Compromised

1. **Isolate database** (block network access)
2. **Audit all user accounts** for unauthorized changes
3. **Review environment variables** for injected values
4. **Check for backdoors** in user environments
5. **Restore from backup** if necessary
6. **Rotate all secrets** after investigation

---

## 🔍 Security Monitoring

### Recommended Monitoring

- **Failed login attempts** - Alert on threshold
- **Database connection failures** - Detect credential stuffing
- **API rate limit hits** - Identify abuse
- **Environment creation spikes** - Resource exhaustion attacks
- **Docker API errors** - Container escape attempts

### Logging

All security-relevant events are logged:
- Authentication attempts (success/failure)
- Authorization failures
- Environment operations (create/start/stop/delete)
- Database schema changes
- Configuration changes

See [Logs Guide](./logs.md) for log retention and access.

---

## 📚 Additional Resources

- [Quick Start Guide](./quick_start.md) - Initial setup
- [API Reference](./api_reference.md) - Authentication endpoints
- [Development Workflow](./dev_workflow.md) - Secure development practices

---

## 🔐 Compliance Notes

### GDPR/Privacy

- User passwords are hashed with bcrypt (cost factor 10)
- OAuth tokens are encrypted at rest
- User data can be exported/deleted via API
- Audit logs track data access (optional)

### SOC 2 / ISO 27001

- Secrets are never logged
- Access control via role-based permissions
- Audit trails for critical operations
- Encryption in transit (HTTPS/TLS)
- Encryption at rest (environment variables)

---

**Last Updated**: 2025-10-01
