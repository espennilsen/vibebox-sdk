# Secrets Management Quick Reference

> Quick reference for VibeBox secrets management

---

## 🚀 Quick Start

### Development (Local)

```bash
# Use .env file
cp backend/.env.example backend/.env
# Edit .env with development values
npm run dev
```

### Production Setup

```bash
# 1. Choose provider
export SECRET_PROVIDER=aws  # or gcp, azure, vault, k8s

# 2. Migrate secrets
./scripts/migrate-secrets.sh aws

# 3. Update config to use references
DATABASE_URL=${secret:database-url}
JWT_SECRET=${secret:jwt-secret}

# 4. Deploy
kubectl apply -f k8s/
```

---

## 📝 Common Commands

### Using Secret Manager in Code

```typescript
import { getSecretManager } from './lib/secrets';

// Get secret
const sm = await getSecretManager();
const secret = await sm.get('database-password');
console.log(secret.value);

// Set secret
await sm.set('api-key', 'new-value', {
  description: 'Updated API key',
  tags: { env: 'prod' }
});

// List secrets
const secrets = await sm.list();

// Rotate secret
await sm.rotate('jwt-secret', async () => {
  return crypto.randomBytes(32).toString('hex');
});

// Delete secret
await sm.delete('old-key');

// Get audit logs
const logs = sm.getAuditLogs(10);
```

### Configuration with Secret References

```bash
# .env
DATABASE_URL=${secret:database-url}
JWT_SECRET=${secret:jwt-secret}
GITHUB_CLIENT_SECRET=${secret:github-secret}
API_KEY=${env:EXTERNAL_API_KEY}
```

### Migration Script

```bash
# Dry run
./scripts/migrate-secrets.sh aws --dry-run

# Migrate
./scripts/migrate-secrets.sh aws

# Validate
./scripts/migrate-secrets.sh aws --validate

# Rollback
./scripts/migrate-secrets.sh aws --rollback
```

### Rotation Script

```bash
# Rotate JWT secret (2h grace period)
./scripts/rotate-secrets.sh jwt-secret --grace-period=2h

# Rotate database password
./scripts/rotate-secrets.sh database-password

# Rotate all secrets
./scripts/rotate-secrets.sh all

# Cleanup old secrets
./scripts/rotate-secrets.sh cleanup

# Dry run
./scripts/rotate-secrets.sh all --dry-run
```

---

## 🔧 Environment Variables

### Provider Selection

```bash
SECRET_PROVIDER=aws|gcp|azure|vault|k8s|env
ENABLE_SECRET_MANAGER=true|false
```

### AWS

```bash
AWS_SECRET_MANAGER_REGION=us-east-1
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
AWS_SECRET_PREFIX=vibebox/
```

### GCP

```bash
GCP_PROJECT_ID=<project-id>
GOOGLE_APPLICATION_CREDENTIALS=<path>
GCP_SECRET_PREFIX=vibebox-
```

### Azure

```bash
AZURE_KEYVAULT_URL=https://<vault>.vault.azure.net
AZURE_TENANT_ID=<tenant>
AZURE_CLIENT_ID=<client>
AZURE_CLIENT_SECRET=<secret>
AZURE_SECRET_PREFIX=vibebox-
```

### Vault

```bash
VAULT_ADDR=https://vault.example.com
VAULT_TOKEN=<token>
VAULT_PATH=secret
VAULT_PREFIX=vibebox/
```

### Kubernetes

```bash
K8S_SECRET_NAMESPACE=default
K8S_SECRET_NAME=vibebox-secrets
```

---

## 🐛 Troubleshooting

### Secret Not Found

```bash
# Check secret exists
aws secretsmanager get-secret-value --secret-id vibebox/database-password
gcloud secrets versions access latest --secret=vibebox-database-password
az keyvault secret show --vault-name vibebox-kv --name vibebox-database-password
```

### Authentication Issues

```bash
# Verify credentials
aws sts get-caller-identity
gcloud auth list
az account show
vault token lookup
```

### Cache Issues

```typescript
// Clear cache
secretManager.clearCache();

// Bypass cache
await secretManager.get('secret', { bypassCache: true });
```

### Application Not Using New Secrets

```bash
# Restart pods
kubectl rollout restart deployment/vibebox-backend

# Check logs
kubectl logs -f deployment/vibebox-backend

# Verify secret
kubectl exec -it deployment/vibebox-backend -- env | grep SECRET
```

---

## 📦 Kubernetes External Secrets

### Install Operator

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  -n external-secrets-system --create-namespace
```

### Apply Resources

```bash
# Apply SecretStore
kubectl apply -f k8s/base/external-secrets/secretstore-aws.yaml

# Apply ExternalSecrets
kubectl apply -f k8s/base/external-secrets/external-secret-database.yaml
kubectl apply -f k8s/base/external-secrets/external-secret-jwt.yaml
kubectl apply -f k8s/base/external-secrets/external-secret-oauth.yaml
kubectl apply -f k8s/base/external-secrets/external-secret-app.yaml
```

### Verify

```bash
# Check SecretStore
kubectl get secretstore

# Check ExternalSecrets
kubectl get externalsecret

# Check synchronized secrets
kubectl get secret vibebox-database
kubectl describe externalsecret vibebox-database
```

---

## 🔒 Security Best Practices

1. ✅ **Use IAM roles** instead of access keys
2. ✅ **Rotate secrets** every 30-90 days
3. ✅ **Enable audit logging** on all providers
4. ✅ **Use separate secrets** per environment
5. ✅ **Test rotations** in staging first
6. ✅ **Monitor secret access** with alerts
7. ✅ **Document rotations** and maintain runbooks
8. ✅ **Never commit** .env files

---

## 📚 Documentation

- **[Full Guide](./.claude/secrets_management.md)** - Comprehensive documentation
- **[Security Guide](./.claude/security.md)** - Security best practices
- **[Scripts README](../scripts/README.md)** - Detailed script usage
- **[Implementation Summary](../docs/SECRETS_IMPLEMENTATION.md)** - Technical details

---

## 🆘 Quick Help

| Problem | Solution |
|---------|----------|
| Secret not found | Check secret name and provider prefix |
| Auth failed | Verify credentials and permissions |
| Stale secrets | Clear cache or bypass cache |
| Slow startup | Check cache TTL and network latency |
| Rotation failed | Check logs and verify permissions |

---

**Last Updated**: 2025-10-01
