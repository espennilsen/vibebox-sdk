# VibeBox Scripts

Utility scripts for managing VibeBox deployment and operations.

---

## Secrets Management Scripts

### `migrate-secrets.sh`

Migrate secrets from `.env` files to a production secret manager.

**Usage:**
```bash
./scripts/migrate-secrets.sh [provider] [options]
```

**Examples:**
```bash
# Dry run first
./scripts/migrate-secrets.sh aws --dry-run

# Migrate to AWS Secrets Manager
./scripts/migrate-secrets.sh aws

# Migrate to GCP with custom .env file
./scripts/migrate-secrets.sh gcp --env-file=.env.production

# Validate migration
./scripts/migrate-secrets.sh aws --validate

# Rollback migration
./scripts/migrate-secrets.sh aws --rollback
```

**Supported Providers:**
- `aws` - AWS Secrets Manager
- `gcp` - Google Cloud Secret Manager
- `azure` - Azure Key Vault
- `vault` - HashiCorp Vault
- `k8s` - Kubernetes Secrets

---

### `rotate-secrets.sh`

Rotate production secrets with zero downtime.

**Usage:**
```bash
./scripts/rotate-secrets.sh [secret-type] [options]
```

**Examples:**
```bash
# Rotate database password
./scripts/rotate-secrets.sh database-password

# Rotate JWT secret with grace period
./scripts/rotate-secrets.sh jwt-secret --grace-period=2h

# Rotate all secrets (dry run)
./scripts/rotate-secrets.sh all --dry-run

# Clean up old secrets
./scripts/rotate-secrets.sh cleanup
```

**Secret Types:**
- `database-password` - PostgreSQL password with connection draining
- `jwt-secret` - JWT signing key with grace period
- `jwt-refresh-secret` - JWT refresh token key
- `encryption-key` - Encryption key (requires re-encryption)
- `oauth` - OAuth credentials (manual process)
- `all` - Rotate all secrets
- `cleanup` - Remove old/expired secrets

---

## Environment Variables

### Common Variables

```bash
# Provider selection
export SECRET_PROVIDER=aws|gcp|azure|vault|k8s

# Dry run mode
export DRY_RUN=true

# Grace period for rotations
export GRACE_PERIOD=1h

# .env file path
export ENV_FILE=/path/to/.env
```

### Provider-Specific Variables

**AWS:**
```bash
export AWS_SECRET_MANAGER_REGION=us-east-1
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret
export AWS_SECRET_PREFIX=vibebox/
```

**GCP:**
```bash
export GCP_PROJECT_ID=your-project-id
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
export GCP_SECRET_PREFIX=vibebox-
```

**Azure:**
```bash
export AZURE_KEYVAULT_URL=https://vault.vault.azure.net
export AZURE_TENANT_ID=your-tenant-id
export AZURE_CLIENT_ID=your-client-id
export AZURE_CLIENT_SECRET=your-secret
export AZURE_SECRET_PREFIX=vibebox-
```

**Vault:**
```bash
export VAULT_ADDR=https://vault.example.com
export VAULT_TOKEN=your-token
export VAULT_PATH=secret
export VAULT_PREFIX=vibebox/
```

**Kubernetes:**
```bash
export K8S_SECRET_NAMESPACE=default
export K8S_SECRET_NAME=vibebox-secrets
```

---

## Prerequisites

### All Scripts

- Node.js 20+
- Backend built (`npm run build` in `/backend`)
- OpenSSL for secret generation

### Migration Script

- Target secret manager configured
- Appropriate credentials/permissions
- Backup of `.env` file

### Rotation Script

- Active deployment with secret manager
- Database access for password rotation
- Monitoring for rotation verification

---

## Workflow Examples

### Initial Setup (Development → Production)

1. **Develop locally with .env:**
```bash
cd backend
cp .env.example .env
# Edit .env with development values
npm run dev
```

2. **Prepare for production:**
```bash
# Create production .env
cp .env .env.production
# Edit with production values
```

3. **Migrate to secret manager:**
```bash
# Test migration (dry run)
./scripts/migrate-secrets.sh aws --env-file=backend/.env.production --dry-run

# Perform migration
./scripts/migrate-secrets.sh aws --env-file=backend/.env.production

# Validate
./scripts/migrate-secrets.sh aws --validate
```

4. **Update deployment configuration:**
```yaml
# Kubernetes deployment
env:
  - name: DATABASE_URL
    value: "${secret:database-url}"
  - name: JWT_SECRET
    value: "${secret:jwt-secret}"
```

5. **Deploy application:**
```bash
kubectl apply -f k8s/
```

---

### Regular Rotation (Production)

**Monthly Rotation Schedule:**

```bash
# Cron job
0 0 1 * * /path/to/rotate-secrets.sh jwt-secret
0 0 1 * * /path/to/rotate-secrets.sh jwt-refresh-secret
```

**On-Demand Rotation:**

```bash
# Rotate database password
./scripts/rotate-secrets.sh database-password

# Verify rotation
kubectl logs -f deployment/vibebox-backend

# Test application
curl https://api.vibebox.com/health
```

---

### Emergency Rotation (Security Incident)

```bash
# 1. Rotate all secrets immediately
./scripts/rotate-secrets.sh all

# 2. Force application restart
kubectl rollout restart deployment/vibebox-backend

# 3. Invalidate all user sessions
kubectl exec -it deployment/vibebox-backend -- \
  node -e "require('./dist/lib/db').prisma.session.deleteMany()"

# 4. Monitor for issues
kubectl logs -f deployment/vibebox-backend
```

---

## Troubleshooting

### Migration Issues

**Problem:** "Secret already exists"
```bash
# Delete existing secret first
aws secretsmanager delete-secret \
  --secret-id vibebox/database-password \
  --force-delete-without-recovery

# Retry migration
./scripts/migrate-secrets.sh aws
```

**Problem:** "Permission denied"
```bash
# Check IAM permissions
aws iam get-user
aws iam list-attached-user-policies --user-name your-user

# Add required policy
aws iam attach-user-policy \
  --user-name your-user \
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite
```

### Rotation Issues

**Problem:** "Database connection failed"
```bash
# Check database accessibility
psql -h localhost -U vibebox -d vibebox_prod

# Verify new password
echo "SELECT 1" | PGPASSWORD="new-password" psql -h localhost -U vibebox -d vibebox_prod
```

**Problem:** "Application not picking up new secrets"
```bash
# Clear secret cache
kubectl exec -it deployment/vibebox-backend -- \
  node -e "require('./dist/lib/secrets').resetSecretManager()"

# Restart pods
kubectl rollout restart deployment/vibebox-backend
```

---

## Best Practices

1. **Always run dry-run first**
   ```bash
   ./scripts/migrate-secrets.sh aws --dry-run
   ./scripts/rotate-secrets.sh all --dry-run
   ```

2. **Create backups before migrations**
   ```bash
   cp backend/.env backend/.env.backup.$(date +%Y%m%d)
   ```

3. **Validate after operations**
   ```bash
   ./scripts/migrate-secrets.sh aws --validate
   kubectl logs deployment/vibebox-backend
   ```

4. **Test in staging first**
   ```bash
   # Use staging environment
   export SECRET_PROVIDER=aws
   export AWS_SECRET_MANAGER_REGION=us-east-1
   ./scripts/migrate-secrets.sh aws --env-file=.env.staging
   ```

5. **Monitor during rotations**
   ```bash
   # Watch logs during rotation
   kubectl logs -f deployment/vibebox-backend &
   ./scripts/rotate-secrets.sh database-password
   ```

6. **Document custom rotations**
   - Keep runbooks for complex rotations
   - Document grace periods and downtime
   - Track rotation history

---

## Security Notes

- **Never commit .env files** to version control
- **Use separate credentials** for each environment
- **Rotate secrets regularly** (30-90 days)
- **Monitor secret access** via audit logs
- **Test rotations** in staging first
- **Have rollback plan** ready

---

## References

- [Secrets Management Guide](../.claude/secrets_management.md)
- [Security Guide](../.claude/security.md)
- [AWS Secrets Manager Docs](https://docs.aws.amazon.com/secretsmanager/)
- [GCP Secret Manager Docs](https://cloud.google.com/secret-manager/docs)
- [Azure Key Vault Docs](https://docs.microsoft.com/azure/key-vault/)
- [HashiCorp Vault Docs](https://www.vaultproject.io/docs)

---

**Last Updated**: 2025-10-01
