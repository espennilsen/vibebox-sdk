# Secrets Management Guide

> Production-grade secrets management for VibeBox with support for multiple cloud providers and Kubernetes.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Supported Providers](#supported-providers)
4. [Quick Start](#quick-start)
5. [Provider Setup Guides](#provider-setup-guides)
6. [Secret Rotation](#secret-rotation)
7. [Migration from .env Files](#migration-from-env-files)
8. [Configuration Reference](#configuration-reference)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)
11. [Disaster Recovery](#disaster-recovery)

---

## Overview

VibeBox's secrets management system provides a unified interface for storing and accessing secrets across multiple providers. The system features:

- **Multi-provider Support**: AWS, GCP, Azure, Vault, Kubernetes
- **Automatic Provider Detection**: Seamlessly detects the appropriate provider based on environment
- **Caching Layer**: Configurable TTL-based caching for performance
- **Secret Rotation**: Zero-downtime secret rotation with grace periods
- **Audit Logging**: Comprehensive logging of all secret operations
- **Type-Safe**: Full TypeScript support with type inference

### When to Use Secret Managers

| Environment | Recommended Approach |
|-------------|---------------------|
| **Development** | `.env` files (local) |
| **Testing** | Environment variables or Kubernetes Secrets |
| **Staging** | Cloud secret manager (AWS/GCP/Azure) |
| **Production** | Cloud secret manager with rotation |

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐         │
│  │   Config   │  │  Services   │  │  API Routes  │         │
│  └─────┬──────┘  └──────┬──────┘  └──────┬───────┘         │
│        │                │                │                   │
│        └────────────────┴────────────────┘                   │
│                         │                                    │
│              ┌──────────▼───────────┐                        │
│              │  SecretManager API   │                        │
│              │  (Abstract Interface)│                        │
│              └──────────┬───────────┘                        │
│                         │                                    │
│        ┌────────────────┼────────────────┐                  │
│        │                │                │                   │
│   ┌────▼────┐    ┌─────▼─────┐    ┌────▼────┐             │
│   │ Caching │    │  Audit    │    │  Retry  │             │
│   │  Layer  │    │  Logging  │    │  Logic  │             │
│   └─────────┘    └───────────┘    └─────────┘             │
└─────────────────────────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┬────────────┐
        │                │                │            │
   ┌────▼────┐    ┌─────▼─────┐    ┌────▼────┐  ┌───▼────┐
   │   AWS   │    │    GCP    │    │  Azure  │  │ Vault  │
   │ Secrets │    │  Secret   │    │   Key   │  │        │
   │ Manager │    │  Manager  │    │  Vault  │  │        │
   └─────────┘    └───────────┘    └─────────┘  └────────┘
```

### Secret Resolution Flow

1. Application requests secret via `getSecretManager().get('secret-name')`
2. Check cache for unexpired secret
3. If not cached, retrieve from provider
4. Cache secret with TTL
5. Log audit entry
6. Return secret to application

---

## Supported Providers

### Provider Comparison

| Feature | AWS | GCP | Azure | Vault | K8s |
|---------|-----|-----|-------|-------|-----|
| **Versioning** | ✅ | ✅ | ✅ | ✅ (v2) | ❌ |
| **Auto Rotation** | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Encryption at Rest** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **IAM Integration** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Cross-Region Replication** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Audit Logs** | CloudTrail | Cloud Audit | Monitor | Audit Device | K8s Audit |
| **Cost** | $0.40/secret/month | $0.06/secret/month | Free tier | Self-hosted | Free |

### Provider Selection Guide

**Choose AWS Secrets Manager if:**
- Running on AWS EKS or EC2
- Need automatic rotation for RDS/DocumentDB
- Require CloudFormation integration

**Choose GCP Secret Manager if:**
- Running on GKE or GCE
- Need fine-grained IAM permissions
- Require global secret replication

**Choose Azure Key Vault if:**
- Running on AKS or Azure VMs
- Need HSM-backed keys
- Require certificate management

**Choose HashiCorp Vault if:**
- Multi-cloud deployment
- Need dynamic secrets
- Require encryption as a service

**Choose Kubernetes Secrets if:**
- Development environment
- Simple deployments
- No external dependencies needed

---

## Quick Start

### 1. Install Dependencies

```bash
cd backend

# For AWS
npm install @aws-sdk/client-secrets-manager

# For GCP
npm install @google-cloud/secret-manager

# For Azure
npm install @azure/keyvault-secrets @azure/identity

# For Vault
npm install node-vault

# For Kubernetes
npm install @kubernetes/client-node
```

### 2. Configure Provider

Set environment variables for your chosen provider:

```bash
# Option 1: Explicit provider selection
export SECRET_PROVIDER=aws

# Option 2: Auto-detection (sets required credentials)
export AWS_REGION=us-east-1
export AWS_SECRET_MANAGER_REGION=us-east-1
```

### 3. Use in Application

```typescript
import { getSecretManager } from './lib/secrets';

async function loadSecrets() {
  const secretManager = await getSecretManager();

  // Get a secret
  const dbPassword = await secretManager.get('database-password');
  console.log('Database password retrieved');

  // Set a secret
  await secretManager.set('api-key', 'new-key-value', {
    description: 'API key for third-party service'
  });

  // List all secrets
  const secrets = await secretManager.list();
  console.log(`Total secrets: ${secrets.length}`);

  // Rotate a secret
  await secretManager.rotate('jwt-secret', async () => {
    return crypto.randomBytes(32).toString('hex');
  });
}
```

### 4. Configuration with Secret References

Use secret references in your configuration:

```bash
# .env for production
DATABASE_URL=${secret:database-password}
JWT_SECRET=${secret:jwt-secret}
ENCRYPTION_KEY=${secret:encryption-key}
```

The configuration system automatically resolves these references at startup.

---

## Provider Setup Guides

### AWS Secrets Manager

#### Prerequisites

- AWS account with Secrets Manager access
- IAM role or access keys with appropriate permissions

#### Setup Steps

**1. Create IAM Policy**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:CreateSecret",
        "secretsmanager:UpdateSecret",
        "secretsmanager:DeleteSecret",
        "secretsmanager:ListSecrets",
        "secretsmanager:RotateSecret"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:vibebox/*"
    }
  ]
}
```

**2. Configure Environment**

```bash
# Option A: IAM Role (recommended for EKS/EC2)
export AWS_REGION=us-east-1
export AWS_SECRET_MANAGER_REGION=us-east-1

# Option B: Access Keys
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_REGION=us-east-1
```

**3. Create Secrets**

```bash
# Using AWS CLI
aws secretsmanager create-secret \
  --name vibebox/database-password \
  --secret-string "your-db-password" \
  --region us-east-1

# Using migration script
./scripts/migrate-secrets.sh aws
```

**4. Enable Automatic Rotation (Optional)**

```typescript
import { AWSSecretsManager } from './lib/secrets/aws';

const sm = new AWSSecretsManager();
await sm.enableRotation(
  'database-password',
  'arn:aws:lambda:us-east-1:123456789012:function:RotateSecret',
  30 // Rotate every 30 days
);
```

---

### Google Cloud Secret Manager

#### Prerequisites

- GCP project with Secret Manager API enabled
- Service account with Secret Manager permissions

#### Setup Steps

**1. Enable API**

```bash
gcloud services enable secretmanager.googleapis.com
```

**2. Create Service Account**

```bash
# Create service account
gcloud iam service-accounts create vibebox-secrets \
  --display-name="VibeBox Secrets Manager"

# Grant permissions
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:vibebox-secrets@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.admin"

# Create key (for local development)
gcloud iam service-accounts keys create key.json \
  --iam-account=vibebox-secrets@PROJECT_ID.iam.gserviceaccount.com
```

**3. Configure Environment**

```bash
# Option A: Service Account Key
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
export GCP_PROJECT_ID=your-project-id

# Option B: Workload Identity (GKE)
export GCP_PROJECT_ID=your-project-id
# Workload Identity automatically provides credentials
```

**4. Create Secrets**

```bash
# Using gcloud
echo -n "your-secret-value" | \
  gcloud secrets create vibebox-database-password \
  --data-file=- \
  --replication-policy="automatic"

# Using migration script
./scripts/migrate-secrets.sh gcp
```

---

### Azure Key Vault

#### Prerequisites

- Azure subscription
- Key Vault instance
- Service principal with Key Vault access

#### Setup Steps

**1. Create Key Vault**

```bash
# Create resource group
az group create --name vibebox-rg --location eastus

# Create Key Vault
az keyvault create \
  --name vibebox-keyvault \
  --resource-group vibebox-rg \
  --location eastus
```

**2. Create Service Principal**

```bash
# Create service principal
az ad sp create-for-rbac -n vibebox-secrets \
  --role="Key Vault Secrets Officer" \
  --scopes=/subscriptions/SUBSCRIPTION_ID/resourceGroups/vibebox-rg/providers/Microsoft.KeyVault/vaults/vibebox-keyvault

# Output will include:
# - appId (CLIENT_ID)
# - password (CLIENT_SECRET)
# - tenant (TENANT_ID)
```

**3. Configure Environment**

```bash
export AZURE_KEY_VAULT_NAME=vibebox-keyvault
export AZURE_TENANT_ID=your-tenant-id
export AZURE_CLIENT_ID=your-client-id
export AZURE_CLIENT_SECRET=your-client-secret
```

**4. Create Secrets**

```bash
# Using Azure CLI
az keyvault secret set \
  --vault-name vibebox-keyvault \
  --name vibebox-database-password \
  --value "your-secret-value"

# Using migration script
./scripts/migrate-secrets.sh azure
```

---

### HashiCorp Vault

#### Prerequisites

- Vault server running and accessible
- Vault token or AppRole credentials

#### Setup Steps

**1. Enable KV Secrets Engine**

```bash
# Enable KV v2 (if not already enabled)
vault secrets enable -path=secret kv-v2
```

**2. Create Policy**

```bash
# Create policy file
cat > vibebox-policy.hcl <<EOF
path "secret/data/vibebox/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/metadata/vibebox/*" {
  capabilities = ["list", "read", "delete"]
}
EOF

# Apply policy
vault policy write vibebox-app vibebox-policy.hcl
```

**3. Configure Authentication**

**Option A: Token Auth**

```bash
# Create token
vault token create -policy=vibebox-app

export VAULT_ADDR=https://vault.example.com
export VAULT_TOKEN=your-token
```

**Option B: AppRole Auth**

```bash
# Enable AppRole
vault auth enable approle

# Create AppRole
vault write auth/approle/role/vibebox-app \
  policies=vibebox-app \
  secret_id_ttl=0 \
  token_ttl=1h \
  token_max_ttl=4h

# Get credentials
vault read auth/approle/role/vibebox-app/role-id
vault write -f auth/approle/role/vibebox-app/secret-id

export VAULT_ADDR=https://vault.example.com
export VAULT_ROLE_ID=your-role-id
export VAULT_SECRET_ID=your-secret-id
```

**4. Create Secrets**

```bash
# Using Vault CLI
vault kv put secret/vibebox/database-password value="your-secret"

# Using migration script
./scripts/migrate-secrets.sh vault
```

---

### Kubernetes Secrets

#### Prerequisites

- Kubernetes cluster access
- kubectl configured

#### Setup Steps

**1. Create Namespace (Optional)**

```bash
kubectl create namespace vibebox
```

**2. Configure Environment**

```bash
# For in-cluster usage (pods automatically have credentials)
export K8S_SECRET_NAMESPACE=vibebox
export K8S_SECRET_NAME=vibebox-secrets

# For local development
export KUBECONFIG=~/.kube/config
```

**3. Create Secrets**

```bash
# Using kubectl
kubectl create secret generic vibebox-secrets \
  --from-literal=database-password=your-password \
  --from-literal=jwt-secret=your-jwt-secret \
  --namespace vibebox

# Using migration script
./scripts/migrate-secrets.sh k8s
```

**4. Use in Pods**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: vibebox-backend
spec:
  containers:
  - name: backend
    image: vibebox/backend:latest
    envFrom:
    - secretRef:
        name: vibebox-secrets
```

---

## Secret Rotation

### Overview

Secret rotation is critical for maintaining security. VibeBox provides tools for zero-downtime rotation.

### Rotation Strategy

**JWT Secrets (with Grace Period)**

```bash
./scripts/rotate-secrets.sh jwt-secret --grace-period=2h
```

This rotation:
1. Generates new JWT secret
2. Backs up old secret as `jwt-secret-old`
3. Updates `jwt-secret` with new value
4. Application validates tokens with both old and new secrets during grace period
5. After grace period, removes old secret

**Database Passwords (with Connection Draining)**

```bash
./scripts/rotate-secrets.sh database-password
```

This rotation:
1. Generates new password
2. Updates database user password
3. Updates secret in secret manager
4. Gracefully restarts application with connection draining

**Encryption Keys (Manual Process)**

```bash
./scripts/rotate-secrets.sh encryption-key
```

Requires custom re-encryption logic:
1. Deploy with both `ENCRYPTION_KEY` (old) and `ENCRYPTION_KEY_NEW` (new)
2. Run migration to re-encrypt data
3. Update to use new key
4. Remove old key

### Automated Rotation

**AWS Secrets Manager**

Enable Lambda-based rotation:

```typescript
await secretManager.enableRotation(
  'database-password',
  'arn:aws:lambda:region:account:function:RotateSecret',
  30
);
```

**HashiCorp Vault**

Configure database secrets engine for dynamic credentials:

```bash
vault write database/roles/vibebox \
  db_name=postgres \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}';" \
  default_ttl=1h \
  max_ttl=24h
```

---

## Migration from .env Files

### Migration Process

**1. Backup Existing .env**

```bash
cp backend/.env backend/.env.backup
```

**2. Run Migration Script**

```bash
# Dry run first
./scripts/migrate-secrets.sh aws --dry-run

# Actual migration
./scripts/migrate-secrets.sh aws
```

**3. Validate Migration**

```bash
./scripts/migrate-secrets.sh aws --validate
```

**4. Update Configuration**

Replace hardcoded values with secret references:

```bash
# Before
DATABASE_URL="postgresql://user:password@localhost:5432/db"

# After
DATABASE_URL="${secret:database-url}"
```

**5. Test Application**

```bash
cd backend
npm run build
NODE_ENV=production npm start
```

**6. Secure .env File**

```bash
# Move to secure location
mv backend/.env backend/.env.old
chmod 600 backend/.env.old

# Or delete entirely
rm backend/.env
```

### Rollback

If migration fails:

```bash
./scripts/migrate-secrets.sh aws --rollback
cp backend/.env.backup backend/.env
```

---

## Configuration Reference

### Environment Variables

#### Secret Provider Selection

```bash
SECRET_PROVIDER=aws|gcp|azure|vault|k8s|env
ENABLE_SECRET_MANAGER=true|false  # Default: true in production
```

#### AWS Secrets Manager

```bash
AWS_SECRET_MANAGER_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key          # Optional (use IAM role)
AWS_SECRET_ACCESS_KEY=your-secret   # Optional
AWS_SESSION_TOKEN=your-token        # Optional
AWS_SECRET_PREFIX=vibebox/          # Default prefix
```

#### GCP Secret Manager

```bash
GCP_PROJECT_ID=your-project-id
GOOGLE_CLOUD_PROJECT=your-project-id      # Alternative
GOOGLE_APPLICATION_CREDENTIALS=/path/key.json  # Optional
GCP_SECRET_PREFIX=vibebox-                # Default prefix
```

#### Azure Key Vault

```bash
AZURE_KEYVAULT_URL=https://vault.vault.azure.net
AZURE_KEY_VAULT_NAME=your-vault-name      # Alternative
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-secret
AZURE_SECRET_PREFIX=vibebox-              # Default prefix
```

#### HashiCorp Vault

```bash
VAULT_ADDR=https://vault.example.com
VAULT_TOKEN=your-token                    # Token auth
VAULT_ROLE_ID=your-role-id               # AppRole auth
VAULT_SECRET_ID=your-secret-id           # AppRole auth
VAULT_NAMESPACE=admin                     # Enterprise only
VAULT_PATH=secret                         # KV mount path
VAULT_KV_VERSION=2                        # KV version (1 or 2)
VAULT_PREFIX=vibebox/                     # Default prefix
```

#### Kubernetes Secrets

```bash
K8S_SECRET_NAMESPACE=default
K8S_SECRET_NAME=vibebox-secrets
KUBERNETES_SERVICE_HOST=10.0.0.1         # Auto-set in pods
```

### Secret Reference Syntax

```bash
# Secret manager reference
${secret:secret-name}

# Environment variable reference
${env:ENV_VAR_NAME}

# Examples
DATABASE_URL=${secret:database-url}
JWT_SECRET=${secret:jwt-secret}
API_KEY=${env:EXTERNAL_API_KEY}
```

---

## Best Practices

### 1. Use Least Privilege

Grant minimal required permissions:

```json
{
  "Effect": "Allow",
  "Action": [
    "secretsmanager:GetSecretValue"
  ],
  "Resource": "arn:aws:secretsmanager:*:*:secret:vibebox/app-*"
}
```

### 2. Enable Audit Logging

Monitor secret access:

```typescript
const secretManager = await getSecretManager();

// View audit logs
const logs = secretManager.getAuditLogs(100);
console.log('Recent secret operations:', logs);
```

### 3. Implement Secret Rotation

Rotate secrets regularly:

```bash
# Monthly rotation schedule
0 0 1 * * /path/to/rotate-secrets.sh all
```

### 4. Use Secret Versioning

Track secret changes:

```typescript
// Get specific version
const secret = await secretManager.get('jwt-secret', {
  version: '2'
});
```

### 5. Cache Appropriately

Balance security and performance:

```typescript
// Production: 5 minutes
const secretManager = new AWSSecretsManager(300000);

// Development: 1 hour
const secretManager = new EnvironmentSecretManager(3600000);
```

### 6. Separate Environments

Use distinct secrets per environment:

```
vibebox/production/database-password
vibebox/staging/database-password
vibebox/development/database-password
```

### 7. Monitor Secret Health

Set up alerts:

```bash
# CloudWatch alarm for failed secret retrievals
aws cloudwatch put-metric-alarm \
  --alarm-name vibebox-secrets-failures \
  --metric-name SecretsManagerErrors \
  --threshold 5 \
  --evaluation-periods 1
```

### 8. Document Secret Usage

Maintain secret inventory:

```markdown
| Secret Name | Purpose | Rotation | Owner |
|-------------|---------|----------|-------|
| database-password | PostgreSQL auth | 30 days | Platform |
| jwt-secret | Token signing | 90 days | Security |
```

---

## Troubleshooting

### Common Issues

#### Secret Not Found

**Symptoms:**
```
Error: Secret not found: database-password
```

**Solutions:**
1. Verify secret exists in provider
2. Check secret name format (prefix)
3. Confirm IAM permissions

```bash
# AWS
aws secretsmanager get-secret-value \
  --secret-id vibebox/database-password

# GCP
gcloud secrets versions access latest \
  --secret=vibebox-database-password
```

#### Authentication Failed

**Symptoms:**
```
Error: Failed to authenticate with secret provider
```

**Solutions:**
1. Verify credentials are set
2. Check IAM role/service account permissions
3. Confirm network connectivity

```bash
# Test AWS credentials
aws sts get-caller-identity

# Test GCP credentials
gcloud auth list

# Test Azure credentials
az account show
```

#### Cache Issues

**Symptoms:**
- Stale secret values
- Old secrets still being used

**Solutions:**
```typescript
// Clear cache manually
const secretManager = await getSecretManager();
secretManager.clearCache();

// Force cache bypass
const secret = await secretManager.get('jwt-secret', {
  bypassCache: true
});
```

#### Performance Issues

**Symptoms:**
- Slow application startup
- High latency for secret retrieval

**Solutions:**
1. Increase cache TTL
2. Use secret references sparingly
3. Preload secrets at startup

```typescript
// Preload secrets
async function preloadSecrets() {
  const secretManager = await getSecretManager();
  await Promise.all([
    secretManager.get('database-password'),
    secretManager.get('jwt-secret'),
    secretManager.get('encryption-key')
  ]);
}
```

### Debug Mode

Enable debug logging:

```bash
export LOG_LEVEL=debug
export DEBUG=vibebox:secrets
```

View detailed logs:

```typescript
import { logger } from './lib/logger';

logger.level = 'debug';
```

---

## Disaster Recovery

### Backup Procedures

**1. Export Secrets**

```bash
# AWS
aws secretsmanager list-secrets \
  --filters Key=name,Values=vibebox/ \
  --query 'SecretList[*].[Name]' \
  --output text | \
  while read secret; do
    aws secretsmanager get-secret-value \
      --secret-id "$secret" \
      --query 'SecretString' \
      --output text > "backup-$(basename $secret).txt"
  done

# GCP
gcloud secrets list --format="value(name)" | \
  grep "^vibebox-" | \
  while read secret; do
    gcloud secrets versions access latest \
      --secret="$secret" > "backup-$secret.txt"
  done
```

**2. Secure Backups**

```bash
# Encrypt backups
tar czf secrets-backup.tar.gz backup-*.txt
gpg --encrypt --recipient admin@vibebox.com secrets-backup.tar.gz

# Store securely
aws s3 cp secrets-backup.tar.gz.gpg \
  s3://vibebox-secrets-backup/ \
  --sse AES256
```

### Recovery Procedures

**1. Restore from Backup**

```bash
# Decrypt and extract
gpg --decrypt secrets-backup.tar.gz.gpg > secrets-backup.tar.gz
tar xzf secrets-backup.tar.gz

# Restore secrets
for file in backup-*.txt; do
  secret_name=$(basename "$file" .txt | sed 's/^backup-//')
  aws secretsmanager create-secret \
    --name "$secret_name" \
    --secret-string "$(cat $file)"
done
```

**2. Verify Recovery**

```bash
./scripts/migrate-secrets.sh aws --validate
```

### Emergency Procedures

**If Secret Manager is Unavailable:**

1. Fall back to environment variables:
```bash
export ENABLE_SECRET_MANAGER=false
export DATABASE_URL="postgresql://..."
export JWT_SECRET="..."
```

2. Restart application:
```bash
kubectl rollout restart deployment/vibebox-backend
```

**If Secrets are Compromised:**

1. Immediately rotate all secrets:
```bash
./scripts/rotate-secrets.sh all
```

2. Review audit logs:
```bash
# AWS CloudTrail
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceType,AttributeValue=AWS::SecretsManager::Secret
```

3. Invalidate all user sessions:
```bash
# Force re-authentication
kubectl exec -it deployment/vibebox-backend -- \
  node -e "require('./dist/lib/db').prisma.session.deleteMany()"
```

---

## Security Considerations

### Secrets in Transit

- All secrets retrieved over TLS/HTTPS
- Use VPC endpoints for AWS (avoid internet)
- Enable Private Google Access for GCP
- Use Private Link for Azure

### Secrets at Rest

- Encrypted by default in all providers
- Use customer-managed keys (CMK) where possible
- Enable secret rotation

### Access Control

- Use IAM roles (not access keys)
- Implement least privilege
- Enable MFA for sensitive operations
- Review access regularly

### Monitoring

- Enable audit logging
- Alert on failed access attempts
- Monitor secret age
- Track rotation compliance

---

## References

### Documentation

- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
- [GCP Secret Manager](https://cloud.google.com/secret-manager/docs)
- [Azure Key Vault](https://docs.microsoft.com/azure/key-vault/)
- [HashiCorp Vault](https://www.vaultproject.io/docs)
- [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [External Secrets Operator](https://external-secrets.io/)

### Related Guides

- [Security Guide](./security.md)
- [Development Workflow](./dev_workflow.md)
- [Quick Start Guide](./quick_start.md)

---

**Last Updated**: 2025-10-01
**Version**: 1.0.0
