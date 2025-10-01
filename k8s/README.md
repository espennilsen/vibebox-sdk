# VibeBox Kubernetes Deployment

Production-ready Kubernetes manifests and Helm chart for deploying VibeBox.

## Quick Start

```bash
# Deploy with interactive script
cd scripts
./deploy.sh

# Deploy with Helm
helm install vibebox helm/vibebox \
  --namespace vibebox \
  --create-namespace \
  -f helm/vibebox/values.yaml \
  --set secrets.postgresPassword="your-password" \
  --set secrets.jwtSecret="$(openssl rand -base64 32)" \
  --set secrets.jwtRefreshSecret="$(openssl rand -base64 32)" \
  --set secrets.encryptionKey="$(openssl rand -base64 32)" \
  --set global.domain="vibebox.yourdomain.com"
```

## Directory Structure

```
k8s/
├── base/                        # Raw Kubernetes manifests
│   ├── namespace.yaml           # Namespace definition
│   ├── configmap.yaml           # Non-sensitive configuration
│   ├── secrets.yaml.example     # Secret template (copy and edit)
│   ├── pvc.yaml                 # Persistent Volume Claims
│   ├── postgresql-*.yaml        # PostgreSQL StatefulSet and Service
│   ├── backend-*.yaml           # Backend Deployment and Service
│   ├── frontend-*.yaml          # Frontend Deployment and Service
│   ├── docker-dind-*.yaml       # Docker-in-Docker deployment
│   ├── rbac.yaml                # Role-Based Access Control
│   ├── ingress.yaml             # Ingress with TLS
│   ├── hpa.yaml                 # Horizontal Pod Autoscalers
│   └── network-policies.yaml   # Network security policies
│
├── helm/vibebox/                # Helm chart
│   ├── Chart.yaml               # Chart metadata
│   ├── values.yaml              # Default values
│   ├── values-production.yaml   # Production overrides
│   ├── templates/               # Helm templates
│   └── README.md                # Helm chart documentation
│
└── scripts/                     # Deployment scripts
    ├── deploy.sh                # Interactive deployment script
    └── uninstall.sh             # Cleanup script
```

## Documentation

Complete documentation is available:

- **[Kubernetes Guide](../.claude/kubernetes.md)** - Comprehensive deployment guide
  - Prerequisites and installation
  - Configuration options
  - Scaling strategies
  - Backup and restore
  - Security hardening
  - Monitoring setup
  - Troubleshooting

- **[Security Guide](../.claude/security.md)** - Security best practices
- **[Quick Start](../.claude/quick_start.md)** - Getting started guide

## Deployment Methods

### 1. Helm Chart (Recommended)

**Advantages:**
- Simplified configuration
- Easy upgrades and rollbacks
- Production-ready defaults
- Template-based customization

**Installation:**
```bash
cd helm/vibebox
helm install vibebox . -f values.yaml -f secrets.yaml
```

See [helm/vibebox/README.md](helm/vibebox/README.md) for detailed instructions.

### 2. Raw Manifests (kubectl)

**Advantages:**
- Full control over resources
- No Helm dependency
- Direct manifest management

**Installation:**
```bash
cd base

# 1. Copy and edit secrets
cp secrets.yaml.example secrets.yaml
# Edit secrets.yaml with your values

# 2. Apply manifests in order
kubectl apply -f namespace.yaml
kubectl apply -f secrets.yaml
kubectl apply -f configmap.yaml
kubectl apply -f pvc.yaml
kubectl apply -f rbac.yaml
kubectl apply -f postgresql-statefulset.yaml
kubectl apply -f postgresql-service.yaml
kubectl apply -f docker-dind-deployment.yaml
kubectl apply -f backend-deployment.yaml
kubectl apply -f backend-service.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f frontend-service.yaml
kubectl apply -f ingress.yaml
kubectl apply -f hpa.yaml
kubectl apply -f network-policies.yaml
```

### 3. Automated Script

**Interactive deployment with validation:**
```bash
cd scripts
./deploy.sh
```

The script will:
1. Check prerequisites (kubectl, helm)
2. Generate secure secrets
3. Deploy all components
4. Wait for services to be ready
5. Display access information

## Prerequisites

- **Kubernetes 1.24+** with kubectl configured
- **Helm 3.8+** (for Helm installation)
- **Ingress Controller** (nginx-ingress recommended)
- **cert-manager** (for automatic TLS)
- **Storage provisioner** with dynamic PV provisioning

## Configuration

### Required Secrets

All secrets must be provided before deployment:

```bash
# Generate secrets
POSTGRES_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
```

### Environment Variables

Edit `base/configmap.yaml` or use Helm values:

```yaml
# Backend
NODE_ENV: production
LOG_LEVEL: info

# Database
POSTGRES_DB: vibebox

# Features
ENABLE_OAUTH: "false"
ENABLE_METRICS: "true"
```

### Resource Sizing

**Development:**
- 2 backend replicas: 250m CPU, 512Mi RAM each
- 2 frontend replicas: 100m CPU, 128Mi RAM each
- PostgreSQL: 500m CPU, 512Mi RAM
- Docker DinD: 500m CPU, 2Gi RAM

**Production:**
- 3+ backend replicas: 1000m CPU, 2Gi RAM each
- 3+ frontend replicas: 500m CPU, 1Gi RAM each
- PostgreSQL: 2000m CPU, 4Gi RAM
- Docker DinD: 4000m CPU, 8Gi RAM

## Scaling

### Horizontal Scaling

```bash
# Manual scaling
kubectl scale deployment vibebox-backend -n vibebox --replicas=5

# Automatic scaling (HPA)
kubectl get hpa -n vibebox
```

### Vertical Scaling

```bash
# Increase resources
helm upgrade vibebox helm/vibebox \
  --set backend.resources.limits.memory=4Gi
```

## Monitoring

```bash
# View pod status
kubectl get pods -n vibebox

# View logs
kubectl logs -f deployment/vibebox-backend -n vibebox

# Resource usage
kubectl top pods -n vibebox

# Check HPA status
kubectl get hpa -n vibebox
```

## Troubleshooting

### Common Issues

**Pods not starting:**
```bash
kubectl describe pod <pod-name> -n vibebox
kubectl logs <pod-name> -n vibebox
```

**Database connection errors:**
```bash
kubectl logs deployment/vibebox-backend -n vibebox
kubectl get secret vibebox-secrets -n vibebox -o yaml
```

**Ingress not working:**
```bash
kubectl get ingress -n vibebox
kubectl describe ingress vibebox-ingress -n vibebox
```

See [../.claude/kubernetes.md](../.claude/kubernetes.md) for detailed troubleshooting.

## Uninstallation

```bash
# Interactive uninstall
cd scripts
./uninstall.sh

# Or with Helm
helm uninstall vibebox -n vibebox

# Or with kubectl
kubectl delete namespace vibebox
```

## Security

- All secrets are external (never committed)
- Network policies restrict traffic between components
- RBAC limits pod permissions
- Containers run as non-root users (except DinD)
- TLS/SSL enabled by default
- Read-only root filesystems where possible

## Support

- **Documentation:** [../.claude/kubernetes.md](../.claude/kubernetes.md)
- **Issues:** https://github.com/yourusername/vibebox/issues
- **Security:** See [../.claude/security.md](../.claude/security.md)

## License

MIT - See [../LICENSE](../LICENSE) for details.
