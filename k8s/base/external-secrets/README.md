# Kubernetes External Secrets Configuration

This directory contains External Secrets Operator (ESO) configurations for synchronizing secrets from cloud secret managers into Kubernetes.

## Prerequisites

1. Install External Secrets Operator:
```bash
helm repo add external-secrets https://charts.external-secrets.io
helm repo update
helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace
```

2. Configure authentication for your cloud provider (see provider-specific sections below)

## Directory Structure

```
external-secrets/
├── README.md                      # This file
├── secretstore-aws.yaml           # AWS Secrets Manager SecretStore
├── secretstore-gcp.yaml           # GCP Secret Manager SecretStore
├── secretstore-azure.yaml         # Azure Key Vault SecretStore
├── secretstore-vault.yaml         # HashiCorp Vault SecretStore
├── external-secret-database.yaml  # Database secrets
├── external-secret-jwt.yaml       # JWT secrets
├── external-secret-oauth.yaml     # OAuth secrets
└── external-secret-app.yaml       # Application secrets
```

## Configuration

### 1. Choose Your Provider

Select the appropriate SecretStore configuration for your cloud provider:

- **AWS Secrets Manager**: `secretstore-aws.yaml`
- **Google Cloud Secret Manager**: `secretstore-gcp.yaml`
- **Azure Key Vault**: `secretstore-azure.yaml`
- **HashiCorp Vault**: `secretstore-vault.yaml`

### 2. Apply SecretStore

```bash
# Apply the SecretStore for your provider
kubectl apply -f secretstore-aws.yaml     # For AWS
kubectl apply -f secretstore-gcp.yaml     # For GCP
kubectl apply -f secretstore-azure.yaml   # For Azure
kubectl apply -f secretstore-vault.yaml   # For Vault
```

### 3. Create ExternalSecrets

```bash
# Apply ExternalSecret resources
kubectl apply -f external-secret-database.yaml
kubectl apply -f external-secret-jwt.yaml
kubectl apply -f external-secret-oauth.yaml
kubectl apply -f external-secret-app.yaml
```

## Provider-Specific Setup

### AWS Secrets Manager

**Prerequisites:**
- AWS IAM role for service account (IRSA) or access keys
- Secrets created in AWS Secrets Manager with prefix `vibebox/`

**Authentication:**
```bash
# Create IAM role for service account
eksctl create iamserviceaccount \
  --name vibebox-external-secrets \
  --namespace default \
  --cluster your-cluster-name \
  --attach-policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite \
  --approve
```

### Google Cloud Secret Manager

**Prerequisites:**
- GCP service account with Secret Manager Secret Accessor role
- Secrets created in Secret Manager with prefix `vibebox-`

**Authentication:**
```bash
# Create service account
gcloud iam service-accounts create vibebox-external-secrets \
  --display-name="VibeBox External Secrets"

# Grant permissions
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:vibebox-external-secrets@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Create Kubernetes secret with service account key
kubectl create secret generic gcpsm-secret \
  --from-file=secret-access-credentials=key.json
```

### Azure Key Vault

**Prerequisites:**
- Azure Key Vault with secrets
- Service principal with Get and List permissions

**Authentication:**
```bash
# Create service principal
az ad sp create-for-rbac -n vibebox-external-secrets

# Grant Key Vault permissions
az keyvault set-policy \
  --name your-keyvault-name \
  --spn <service-principal-id> \
  --secret-permissions get list

# Create Kubernetes secret with credentials
kubectl create secret generic azurekv-secret \
  --from-literal=clientid=<client-id> \
  --from-literal=clientsecret=<client-secret>
```

### HashiCorp Vault

**Prerequisites:**
- Vault server running and accessible
- KV v2 secrets engine mounted at `secret/`
- Vault authentication configured (token or Kubernetes)

**Authentication:**
```bash
# Using Vault token
kubectl create secret generic vault-token \
  --from-literal=token=<vault-token>

# Using Kubernetes auth (recommended)
vault auth enable kubernetes
vault write auth/kubernetes/config \
  kubernetes_host="https://$KUBERNETES_PORT_443_TCP_ADDR:443"
```

## Verification

Check that secrets are synchronized:

```bash
# Check SecretStore status
kubectl get secretstore

# Check ExternalSecret status
kubectl get externalsecret

# Check synchronized secrets
kubectl get secret vibebox-database
kubectl get secret vibebox-jwt
kubectl get secret vibebox-oauth
kubectl get secret vibebox-app

# Describe ExternalSecret for troubleshooting
kubectl describe externalsecret vibebox-database
```

## Troubleshooting

### Secret Not Syncing

1. Check SecretStore status:
```bash
kubectl describe secretstore vibebox-secretstore
```

2. Check ExternalSecret events:
```bash
kubectl describe externalsecret vibebox-database
```

3. Check External Secrets Operator logs:
```bash
kubectl logs -n external-secrets-system deployment/external-secrets
```

### Authentication Errors

- **AWS**: Verify IAM role has correct permissions
- **GCP**: Check service account key and permissions
- **Azure**: Verify service principal credentials and Key Vault access policies
- **Vault**: Check token validity and Kubernetes auth configuration

## Best Practices

1. **Use ClusterSecretStore for shared configuration** across namespaces
2. **Enable automatic secret refresh** with `refreshInterval`
3. **Use secret templates** to transform secret data
4. **Monitor secret sync status** with alerts
5. **Implement secret rotation** with your cloud provider
6. **Use least privilege** for service account permissions

## Security Notes

- Service account credentials are stored as Kubernetes secrets
- Secrets are synchronized periodically (default: 1 hour)
- ESO supports secret rotation and automatic updates
- Use RBAC to restrict access to ExternalSecret resources
- Audit secret access through cloud provider logs

## References

- [External Secrets Operator Documentation](https://external-secrets.io/)
- [AWS Provider Guide](https://external-secrets.io/latest/provider/aws-secrets-manager/)
- [GCP Provider Guide](https://external-secrets.io/latest/provider/google-secrets-manager/)
- [Azure Provider Guide](https://external-secrets.io/latest/provider/azure-key-vault/)
- [Vault Provider Guide](https://external-secrets.io/latest/provider/hashicorp-vault/)
