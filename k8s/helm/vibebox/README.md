# VibeBox Helm Chart

This Helm chart deploys VibeBox - a production-ready development environment management tool.

## Prerequisites

- Kubernetes 1.24+
- Helm 3.8+
- PV provisioner support in the underlying infrastructure
- Ingress controller (nginx-ingress recommended)
- cert-manager (for automatic TLS certificates)

## Installation

### Quick Start

```bash
# Add your secrets
helm install vibebox ./vibebox \
  --set secrets.postgresPassword="your-secure-password" \
  --set secrets.jwtSecret="$(openssl rand -base64 32)" \
  --set secrets.jwtRefreshSecret="$(openssl rand -base64 32)" \
  --set secrets.encryptionKey="$(openssl rand -base64 32)" \
  --set global.domain="vibebox.yourdomain.com" \
  --set certManager.email="your-email@example.com"
```

### Production Installation

```bash
# Create a production secrets file (DO NOT commit to git)
cat > secrets.yaml <<EOF
secrets:
  postgresPassword: "your-secure-password"
  jwtSecret: "base64-encoded-jwt-secret"
  jwtRefreshSecret: "base64-encoded-refresh-secret"
  encryptionKey: "base64-encoded-encryption-key"
EOF

# Install with production values
helm install vibebox ./vibebox \
  -f values.yaml \
  -f values-production.yaml \
  -f secrets.yaml \
  --namespace vibebox \
  --create-namespace
```

### Using External Secrets Operator

```bash
# Install External Secrets Operator first
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace

# Install VibeBox with external secrets
helm install vibebox ./vibebox \
  -f values-production.yaml \
  --set secrets.externalSecrets.enabled=true \
  --set secrets.externalSecrets.backend=secretsManager \
  --set secrets.externalSecrets.region=us-east-1
```

## Configuration

See [values.yaml](values.yaml) for all available configuration options.

### Key Configuration Options

| Parameter | Description | Default |
|-----------|-------------|---------|
| `global.domain` | Domain name for the application | `vibebox.yourdomain.com` |
| `backend.replicaCount` | Number of backend replicas | `2` |
| `frontend.replicaCount` | Number of frontend replicas | `2` |
| `postgresql.persistence.size` | PostgreSQL storage size | `20Gi` |
| `dockerDind.persistence.size` | Docker-in-Docker storage size | `50Gi` |
| `ingress.enabled` | Enable ingress | `true` |
| `certManager.email` | Email for Let's Encrypt | `your-email@example.com` |
| `networkPolicy.enabled` | Enable network policies | `true` |

## Upgrading

```bash
# Upgrade to a new version
helm upgrade vibebox ./vibebox \
  -f values.yaml \
  -f values-production.yaml \
  -f secrets.yaml

# Rollback if needed
helm rollback vibebox
```

## Uninstalling

```bash
# Delete the release
helm uninstall vibebox --namespace vibebox

# Optionally delete the namespace
kubectl delete namespace vibebox
```

## Persistence

The chart creates PersistentVolumeClaims for:
- PostgreSQL data (20Gi by default)
- Docker-in-Docker data (50Gi by default)

Data persists across pod restarts. To delete data, manually delete the PVCs.

## Security

- All secrets must be provided externally (never commit secrets to values.yaml)
- Use External Secrets Operator for production
- Network policies restrict traffic between components
- RBAC is enabled by default
- Containers run as non-root users (except Docker-in-Docker)

## Monitoring

Enable monitoring with Prometheus and Grafana:

```bash
helm upgrade vibebox ./vibebox \
  --set monitoring.enabled=true \
  --set monitoring.prometheus.enabled=true \
  --set monitoring.grafana.enabled=true
```

## Backup

Enable automated PostgreSQL backups:

```bash
helm upgrade vibebox ./vibebox \
  --set backup.enabled=true \
  --set backup.schedule="0 2 * * *" \
  --set backup.retention=30
```

## Troubleshooting

See the [Kubernetes documentation](../../.claude/kubernetes.md) for detailed troubleshooting.

## Support

- Documentation: [.claude/kubernetes.md](../../.claude/kubernetes.md)
- Issues: https://github.com/yourusername/vibebox/issues
