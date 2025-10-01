# Kubernetes Deployment Guide

Complete guide for deploying VibeBox to Kubernetes clusters, including installation, configuration, scaling, and troubleshooting.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Installation Methods](#installation-methods)
- [Configuration](#configuration)
- [Scaling](#scaling)
- [Backup and Restore](#backup-and-restore)
- [Security](#security)
- [Monitoring](#monitoring)
- [Upgrade Procedures](#upgrade-procedures)
- [Disaster Recovery](#disaster-recovery)
- [Troubleshooting](#troubleshooting)
- [Architecture](#architecture)

---

## Prerequisites

### Required Tools

- **Kubernetes 1.24+** - Target cluster
- **kubectl 1.24+** - Kubernetes CLI
- **Helm 3.8+** - Package manager (for Helm deployment)
- **Docker** - For building images
- **openssl** - For generating secrets

### Cluster Requirements

**Minimum Resources:**
- 3 worker nodes (for high availability)
- 4 vCPUs per node
- 8GB RAM per node
- 100GB available storage
- Storage class with dynamic provisioning

**Recommended Resources:**
- 5+ worker nodes
- 8 vCPUs per node
- 16GB RAM per node
- 500GB+ available storage
- High-performance storage class (SSD/NVMe)

**Required Add-ons:**
- Ingress controller (nginx-ingress recommended)
- cert-manager (for automatic TLS certificates)
- metrics-server (for HPA)
- Storage provisioner

**Optional Add-ons:**
- Prometheus & Grafana (monitoring)
- External Secrets Operator (secrets management)
- Velero (backup/restore)
- Network policy enforcement (Calico, Cilium, etc.)

### Installation

```bash
# Install kubectl (Linux)
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Install nginx-ingress
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace
```

---

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/vibebox.git
cd vibebox/k8s/scripts
```

### 2. Generate Secrets

```bash
# Generate secure random secrets
openssl rand -base64 32  # Use for passwords
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # JWT secrets
```

### 3. Deploy with Script

```bash
# Run interactive deployment script
./deploy.sh

# Or use environment variables
NAMESPACE=vibebox ./deploy.sh
```

### 4. Verify Deployment

```bash
# Check pods
kubectl get pods -n vibebox

# Check services
kubectl get svc -n vibebox

# Check ingress
kubectl get ingress -n vibebox

# Check logs
kubectl logs -f deployment/vibebox-backend -n vibebox
```

---

## Installation Methods

### Method 1: Helm Chart (Recommended)

**Advantages:**
- Simplified configuration management
- Easy upgrades and rollbacks
- Template-based deployments
- Production-ready defaults

**Installation:**

```bash
cd k8s/scripts

# Generate secrets
cat > secrets.yaml <<EOF
secrets:
  postgresPassword: "$(openssl rand -base64 32)"
  jwtSecret: "$(node -e 'console.log(require("crypto").randomBytes(32).toString("base64"))')"
  jwtRefreshSecret: "$(node -e 'console.log(require("crypto").randomBytes(32).toString("base64"))')"
  encryptionKey: "$(node -e 'console.log(require("crypto").randomBytes(32).toString("base64"))')"
EOF

# Install with Helm
helm install vibebox ../helm/vibebox \
  --namespace vibebox \
  --create-namespace \
  -f ../helm/vibebox/values.yaml \
  -f secrets.yaml \
  --set global.domain="vibebox.yourdomain.com" \
  --set certManager.email="your-email@example.com"
```

**Production Installation:**

```bash
# Use production values
helm install vibebox ../helm/vibebox \
  --namespace vibebox \
  --create-namespace \
  -f ../helm/vibebox/values.yaml \
  -f ../helm/vibebox/values-production.yaml \
  -f secrets.yaml \
  --wait \
  --timeout 10m
```

### Method 2: kubectl (Raw Manifests)

**Advantages:**
- Full control over resources
- No Helm dependency
- Easier debugging

**Installation:**

```bash
cd k8s/base

# 1. Create namespace
kubectl apply -f namespace.yaml

# 2. Create secrets (copy and edit example first)
cp secrets.yaml.example secrets.yaml
# Edit secrets.yaml with your values
kubectl apply -f secrets.yaml

# 3. Apply configuration
kubectl apply -f configmap.yaml

# 4. Create persistent volumes
kubectl apply -f pvc.yaml

# 5. Apply RBAC
kubectl apply -f rbac.yaml

# 6. Deploy PostgreSQL
kubectl apply -f postgresql-statefulset.yaml
kubectl apply -f postgresql-service.yaml

# Wait for PostgreSQL to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=database -n vibebox --timeout=300s

# 7. Deploy Docker-in-Docker
kubectl apply -f docker-dind-deployment.yaml

# 8. Deploy Backend
kubectl apply -f backend-deployment.yaml
kubectl apply -f backend-service.yaml

# 9. Deploy Frontend
kubectl apply -f frontend-deployment.yaml
kubectl apply -f frontend-service.yaml

# 10. Deploy Ingress
kubectl apply -f ingress.yaml

# 11. Deploy HPA and Network Policies
kubectl apply -f hpa.yaml
kubectl apply -f network-policies.yaml
```

---

## Configuration

### Environment-Specific Configuration

**Development:**
```bash
helm install vibebox ../helm/vibebox \
  -f values.yaml \
  --set backend.replicaCount=1 \
  --set frontend.replicaCount=1 \
  --set backend.env.LOG_LEVEL=debug
```

**Staging:**
```bash
helm install vibebox ../helm/vibebox \
  -f values.yaml \
  --set backend.replicaCount=2 \
  --set frontend.replicaCount=2 \
  --set ingress.annotations."cert-manager\.io/cluster-issuer"=letsencrypt-staging
```

**Production:**
```bash
helm install vibebox ../helm/vibebox \
  -f values.yaml \
  -f values-production.yaml \
  --set global.domain="vibebox.yourdomain.com" \
  --set certManager.email="ops@yourdomain.com"
```

### Secrets Management

**Option 1: Kubernetes Secrets (Basic)**

```bash
# Create secrets manually
kubectl create secret generic vibebox-secrets \
  --namespace=vibebox \
  --from-literal=POSTGRES_PASSWORD="your-password" \
  --from-literal=JWT_SECRET="your-jwt-secret" \
  --from-literal=JWT_REFRESH_SECRET="your-refresh-secret" \
  --from-literal=ENCRYPTION_KEY="your-encryption-key"
```

**Option 2: External Secrets Operator (Recommended)**

```bash
# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace

# Create SecretStore (AWS Secrets Manager example)
cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vibebox-secret-store
  namespace: vibebox
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: vibebox-backend
EOF

# Create ExternalSecret
cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: vibebox-secrets
  namespace: vibebox
spec:
  secretStoreRef:
    name: vibebox-secret-store
    kind: SecretStore
  target:
    name: vibebox-secrets
  data:
    - secretKey: POSTGRES_PASSWORD
      remoteRef:
        key: vibebox/postgres
        property: password
    - secretKey: JWT_SECRET
      remoteRef:
        key: vibebox/jwt
        property: secret
    - secretKey: JWT_REFRESH_SECRET
      remoteRef:
        key: vibebox/jwt
        property: refresh_secret
    - secretKey: ENCRYPTION_KEY
      remoteRef:
        key: vibebox/encryption
        property: key
EOF
```

**Option 3: Sealed Secrets**

```bash
# Install Sealed Secrets controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# Create sealed secret
kubeseal --format=yaml < secrets.yaml > sealed-secrets.yaml
kubectl apply -f sealed-secrets.yaml
```

### Storage Configuration

**AWS EKS (gp3):**
```yaml
postgresql:
  persistence:
    storageClass: gp3
    size: 100Gi

dockerDind:
  persistence:
    storageClass: gp3
    size: 200Gi
```

**GKE (standard-rwo):**
```yaml
postgresql:
  persistence:
    storageClass: standard-rwo
    size: 100Gi

dockerDind:
  persistence:
    storageClass: standard-rwo
    size: 200Gi
```

**Azure AKS (managed-premium):**
```yaml
postgresql:
  persistence:
    storageClass: managed-premium
    size: 100Gi

dockerDind:
  persistence:
    storageClass: managed-premium
    size: 200Gi
```

### Ingress Configuration

**nginx-ingress:**
```yaml
ingress:
  className: nginx
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"
```

**Traefik:**
```yaml
ingress:
  className: traefik
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: websecure
    traefik.ingress.kubernetes.io/router.tls: "true"
```

**AWS ALB:**
```yaml
ingress:
  className: alb
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:...
```

---

## Scaling

### Horizontal Scaling

**Manual Scaling:**

```bash
# Scale backend
kubectl scale deployment vibebox-backend -n vibebox --replicas=5

# Scale frontend
kubectl scale deployment vibebox-frontend -n vibebox --replicas=5
```

**Horizontal Pod Autoscaler (HPA):**

```bash
# HPA is enabled by default
kubectl get hpa -n vibebox

# View HPA details
kubectl describe hpa vibebox-backend-hpa -n vibebox

# Modify HPA thresholds
kubectl edit hpa vibebox-backend-hpa -n vibebox
```

**Custom HPA Configuration:**

```yaml
# Custom CPU/Memory targets
backend:
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 20
    targetCPUUtilizationPercentage: 60
    targetMemoryUtilizationPercentage: 70
```

### Vertical Scaling

**Vertical Pod Autoscaler (VPA):**

```bash
# Install VPA (if not already installed)
git clone https://github.com/kubernetes/autoscaler.git
cd autoscaler/vertical-pod-autoscaler
./hack/vpa-up.sh

# Create VPA for PostgreSQL
kubectl apply -f - <<EOF
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: vibebox-postgres-vpa
  namespace: vibebox
spec:
  targetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: vibebox-postgres
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
      - containerName: postgres
        minAllowed:
          cpu: 500m
          memory: 512Mi
        maxAllowed:
          cpu: 4000m
          memory: 8Gi
EOF
```

### Cluster Autoscaling

**AWS EKS:**

```bash
# Install Cluster Autoscaler
helm repo add autoscaler https://kubernetes.github.io/autoscaler
helm install cluster-autoscaler autoscaler/cluster-autoscaler \
  --namespace kube-system \
  --set autoDiscovery.clusterName=your-cluster-name \
  --set awsRegion=us-east-1
```

**GKE:**

```bash
# Enable cluster autoscaling
gcloud container clusters update your-cluster-name \
  --enable-autoscaling \
  --min-nodes=3 \
  --max-nodes=10
```

---

## Backup and Restore

### PostgreSQL Backup

**Automated Backup with CronJob:**

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: vibebox
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: postgres:16-alpine
              env:
                - name: PGHOST
                  value: vibebox-postgres
                - name: PGUSER
                  valueFrom:
                    secretKeyRef:
                      name: vibebox-secrets
                      key: POSTGRES_USER
                - name: PGPASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: vibebox-secrets
                      key: POSTGRES_PASSWORD
              command:
                - /bin/sh
                - -c
                - |
                  BACKUP_FILE="/backup/vibebox-$(date +%Y%m%d-%H%M%S).sql.gz"
                  pg_dump vibebox | gzip > $BACKUP_FILE
                  echo "Backup completed: $BACKUP_FILE"
              volumeMounts:
                - name: backup
                  mountPath: /backup
          volumes:
            - name: backup
              persistentVolumeClaim:
                claimName: postgres-backup-pvc
          restartPolicy: OnFailure
```

**Manual Backup:**

```bash
# Create backup directory
kubectl exec -n vibebox vibebox-postgres-0 -- mkdir -p /tmp/backup

# Run backup
kubectl exec -n vibebox vibebox-postgres-0 -- \
  pg_dump -U vibebox vibebox | gzip > vibebox-backup-$(date +%Y%m%d).sql.gz

# Copy backup to local machine
kubectl cp vibebox/vibebox-postgres-0:/tmp/backup/vibebox.sql.gz ./vibebox-backup.sql.gz
```

**Upload to S3:**

```bash
# Backup and upload to S3
kubectl exec -n vibebox vibebox-postgres-0 -- \
  pg_dump -U vibebox vibebox | gzip | \
  aws s3 cp - s3://your-bucket/backups/vibebox-$(date +%Y%m%d).sql.gz
```

### Restore from Backup

```bash
# Copy backup to pod
kubectl cp ./vibebox-backup.sql.gz vibebox/vibebox-postgres-0:/tmp/backup.sql.gz

# Restore database
kubectl exec -n vibebox vibebox-postgres-0 -- \
  bash -c "gunzip < /tmp/backup.sql.gz | psql -U vibebox vibebox"

# Verify restore
kubectl exec -n vibebox vibebox-postgres-0 -- \
  psql -U vibebox -d vibebox -c "SELECT COUNT(*) FROM users;"
```

### Velero Backup (Cluster-wide)

```bash
# Install Velero
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.8.0 \
  --bucket velero-backups \
  --secret-file ./credentials-velero

# Create backup schedule
velero schedule create vibebox-daily \
  --schedule="@daily" \
  --include-namespaces vibebox \
  --ttl 720h

# Manual backup
velero backup create vibebox-backup-$(date +%Y%m%d) \
  --include-namespaces vibebox

# Restore from backup
velero restore create --from-backup vibebox-backup-20250101
```

---

## Security

### Network Policies

Network policies are enabled by default to restrict traffic between components.

**View Network Policies:**

```bash
kubectl get networkpolicies -n vibebox
kubectl describe networkpolicy vibebox-backend-netpol -n vibebox
```

**Disable Network Policies (not recommended):**

```bash
helm upgrade vibebox ../helm/vibebox \
  --set networkPolicy.enabled=false
```

### Pod Security Standards

**Enforce Restricted PSS:**

```bash
# Label namespace with restricted policy
kubectl label namespace vibebox \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted
```

**Note:** Docker-in-Docker requires privileged mode and must run in a separate namespace with baseline policy.

### RBAC

RBAC is enabled by default with minimal permissions.

**View RBAC resources:**

```bash
kubectl get serviceaccounts -n vibebox
kubectl get roles -n vibebox
kubectl get rolebindings -n vibebox
```

### TLS/SSL Certificates

**Automatic with cert-manager:**

```bash
# cert-manager automatically provisions certificates
kubectl get certificate -n vibebox
kubectl describe certificate vibebox-tls-cert -n vibebox
```

**Manual certificate:**

```bash
# Create TLS secret manually
kubectl create secret tls vibebox-tls-cert \
  --namespace=vibebox \
  --cert=path/to/cert.pem \
  --key=path/to/key.pem
```

### Security Scanning

```bash
# Scan images with Trivy
trivy image vibebox/backend:latest
trivy image vibebox/frontend:latest

# Scan Kubernetes manifests
trivy config k8s/base/
```

---

## Monitoring

### Metrics Server

```bash
# Install metrics-server (if not already installed)
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# View resource usage
kubectl top nodes
kubectl top pods -n vibebox
```

### Prometheus & Grafana

**Install Prometheus Stack:**

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace
```

**Enable ServiceMonitors:**

```bash
helm upgrade vibebox ../helm/vibebox \
  --set monitoring.enabled=true \
  --set monitoring.prometheus.enabled=true \
  --set monitoring.prometheus.serviceMonitor.enabled=true
```

**Access Grafana:**

```bash
# Get Grafana password
kubectl get secret -n monitoring prometheus-grafana \
  -o jsonpath="{.data.admin-password}" | base64 --decode

# Port forward Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

# Open http://localhost:3000
```

### Application Logs

```bash
# View backend logs
kubectl logs -f deployment/vibebox-backend -n vibebox

# View frontend logs
kubectl logs -f deployment/vibebox-frontend -n vibebox

# View PostgreSQL logs
kubectl logs -f statefulset/vibebox-postgres -n vibebox

# View Docker-in-Docker logs
kubectl logs -f deployment/vibebox-docker-dind -n vibebox

# View logs from all pods
kubectl logs -f -l app.kubernetes.io/name=vibebox -n vibebox --all-containers
```

### Log Aggregation

**Install Loki:**

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm install loki grafana/loki-stack \
  --namespace monitoring \
  --set grafana.enabled=false \
  --set prometheus.enabled=false
```

---

## Upgrade Procedures

### Helm Upgrade

```bash
# Upgrade to new version
helm upgrade vibebox ../helm/vibebox \
  --namespace vibebox \
  -f values.yaml \
  -f values-production.yaml \
  -f secrets.yaml \
  --wait \
  --timeout 10m

# View upgrade history
helm history vibebox -n vibebox

# Rollback if needed
helm rollback vibebox -n vibebox
helm rollback vibebox 3 -n vibebox  # Rollback to specific revision
```

### kubectl Upgrade

```bash
# Update images
kubectl set image deployment/vibebox-backend \
  backend=vibebox/backend:v1.1.0 \
  -n vibebox

kubectl set image deployment/vibebox-frontend \
  frontend=vibebox/frontend:v1.1.0 \
  -n vibebox

# Apply updated manifests
kubectl apply -f backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml

# Monitor rollout
kubectl rollout status deployment/vibebox-backend -n vibebox
kubectl rollout status deployment/vibebox-frontend -n vibebox

# Rollback if needed
kubectl rollout undo deployment/vibebox-backend -n vibebox
```

### Zero-Downtime Upgrades

**Blue-Green Deployment:**

```bash
# Deploy new version alongside old
kubectl apply -f backend-deployment-v2.yaml

# Switch traffic to new version
kubectl patch service vibebox-backend -n vibebox \
  -p '{"spec":{"selector":{"version":"v2"}}}'

# Monitor and rollback if needed
kubectl patch service vibebox-backend -n vibebox \
  -p '{"spec":{"selector":{"version":"v1"}}}'
```

**Canary Deployment:**

```bash
# Install Flagger for canary deployments
helm repo add flagger https://flagger.app
helm install flagger flagger/flagger \
  --namespace ingress-nginx

# Create canary
kubectl apply -f - <<EOF
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: vibebox-backend
  namespace: vibebox
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: vibebox-backend
  service:
    port: 3000
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
EOF
```

---

## Disaster Recovery

### Disaster Recovery Plan

**RTO (Recovery Time Objective):** 2 hours
**RPO (Recovery Point Objective):** 24 hours (daily backups)

### Recovery Steps

**Scenario 1: Complete Cluster Failure**

```bash
# 1. Provision new cluster
# 2. Install prerequisites (ingress, cert-manager, etc.)

# 3. Restore from Velero backup
velero restore create --from-backup vibebox-backup-latest

# 4. Verify services
kubectl get pods -n vibebox
kubectl get svc -n vibebox

# 5. Test application
curl -k https://vibebox.yourdomain.com/health
```

**Scenario 2: Database Corruption**

```bash
# 1. Scale down backend to prevent writes
kubectl scale deployment vibebox-backend -n vibebox --replicas=0

# 2. Restore database from backup
kubectl cp ./vibebox-backup.sql.gz vibebox/vibebox-postgres-0:/tmp/backup.sql.gz
kubectl exec -n vibebox vibebox-postgres-0 -- \
  bash -c "gunzip < /tmp/backup.sql.gz | psql -U vibebox vibebox"

# 3. Scale backend back up
kubectl scale deployment vibebox-backend -n vibebox --replicas=2

# 4. Verify application
kubectl logs -f deployment/vibebox-backend -n vibebox
```

**Scenario 3: Persistent Volume Failure**

```bash
# 1. Create new PVC
kubectl apply -f pvc-new.yaml

# 2. Restore data from backup to new PVC
# (Use backup restoration procedure)

# 3. Update StatefulSet to use new PVC
kubectl patch statefulset vibebox-postgres -n vibebox \
  -p '{"spec":{"volumeClaimTemplates":[{"metadata":{"name":"postgres-data-new"}}]}}'

# 4. Restart StatefulSet
kubectl rollout restart statefulset/vibebox-postgres -n vibebox
```

### Multi-Region Deployment

**Active-Passive Setup:**

```bash
# Primary region
helm install vibebox ../helm/vibebox \
  --namespace vibebox \
  --set global.domain=vibebox.yourdomain.com

# Secondary region (standby)
helm install vibebox ../helm/vibebox \
  --namespace vibebox \
  --set global.domain=vibebox-dr.yourdomain.com \
  --set postgresql.replication.enabled=true
```

---

## Troubleshooting

### Common Issues

#### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n vibebox

# Describe pod for events
kubectl describe pod vibebox-backend-xxx -n vibebox

# Check logs
kubectl logs vibebox-backend-xxx -n vibebox

# Common causes:
# - Image pull errors (check image name and pull secrets)
# - Insufficient resources (check node capacity)
# - Volume mount issues (check PVC status)
# - Init container failures (check init container logs)
```

#### Database Connection Errors

```bash
# Check PostgreSQL pod
kubectl get pods -l app.kubernetes.io/component=database -n vibebox

# Test database connectivity
kubectl exec -it vibebox-backend-xxx -n vibebox -- \
  nc -zv vibebox-postgres 5432

# Check database logs
kubectl logs vibebox-postgres-0 -n vibebox

# Verify secrets
kubectl get secret vibebox-secrets -n vibebox -o yaml

# Common causes:
# - Incorrect DATABASE_URL
# - PostgreSQL not ready
# - Network policies blocking traffic
# - Incorrect credentials
```

#### Ingress Not Working

```bash
# Check ingress
kubectl get ingress -n vibebox
kubectl describe ingress vibebox-ingress -n vibebox

# Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller

# Check certificate
kubectl get certificate -n vibebox
kubectl describe certificate vibebox-tls-cert -n vibebox

# Common causes:
# - DNS not pointing to ingress IP
# - Certificate not ready
# - Ingress controller not installed
# - Incorrect ingress annotations
```

#### High Memory Usage

```bash
# Check resource usage
kubectl top pods -n vibebox

# Check memory limits
kubectl get deployment vibebox-backend -n vibebox -o yaml | grep -A 5 resources

# Scale horizontally
kubectl scale deployment vibebox-backend -n vibebox --replicas=5

# Increase memory limits
kubectl set resources deployment vibebox-backend -n vibebox \
  --limits=memory=2Gi \
  --requests=memory=1Gi
```

#### Docker-in-Docker Issues

```bash
# Check Docker daemon
kubectl exec -it vibebox-docker-dind-xxx -n vibebox -- docker info

# Check Docker logs
kubectl logs vibebox-docker-dind-xxx -n vibebox

# Restart Docker-in-Docker
kubectl rollout restart deployment/vibebox-docker-dind -n vibebox

# Common causes:
# - Insufficient storage
# - Memory pressure
# - Network policies blocking registry access
# - Privileged mode not enabled
```

### Debug Commands

```bash
# Get all resources in namespace
kubectl get all -n vibebox

# Get events
kubectl get events -n vibebox --sort-by='.lastTimestamp'

# Exec into pod
kubectl exec -it vibebox-backend-xxx -n vibebox -- /bin/sh

# Port forward for debugging
kubectl port-forward -n vibebox svc/vibebox-backend 3000:3000

# Run debug container
kubectl debug vibebox-backend-xxx -n vibebox -it --image=busybox

# Check DNS resolution
kubectl run -it --rm debug --image=busybox --restart=Never -- \
  nslookup vibebox-postgres.vibebox.svc.cluster.local

# Check network connectivity
kubectl run -it --rm debug --image=nicolaka/netshoot --restart=Never -- \
  curl -v http://vibebox-backend:3000/health
```

### Performance Tuning

**PostgreSQL:**

```yaml
# Increase connections and memory
postgresql:
  config:
    max_connections: 200
    shared_buffers: 2GB
    effective_cache_size: 6GB
    maintenance_work_mem: 512MB
    checkpoint_completion_target: 0.9
    wal_buffers: 16MB
    default_statistics_target: 100
    random_page_cost: 1.1
    effective_io_concurrency: 200
```

**Backend:**

```yaml
# Increase resources and replicas
backend:
  replicaCount: 5
  resources:
    requests:
      cpu: 1000m
      memory: 2Gi
    limits:
      cpu: 4000m
      memory: 4Gi
```

---

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Ingress                              │
│              (nginx-ingress + cert-manager)                  │
└─────────────┬───────────────────────────────┬───────────────┘
              │                               │
              │                               │
    ┌─────────▼─────────┐         ┌──────────▼──────────┐
    │    Frontend       │         │      Backend        │
    │   (React SPA)     │────────▶│   (Fastify API)     │
    │   2+ replicas     │         │    2+ replicas      │
    └───────────────────┘         └──────────┬──────────┘
                                             │
                             ┌───────────────┼───────────────┐
                             │               │               │
                  ┌──────────▼────────┐  ┌──▼─────────┐ ┌──▼─────────┐
                  │   PostgreSQL      │  │  Docker    │ │ External   │
                  │  (StatefulSet)    │  │   DinD     │ │  APIs      │
                  │   1 replica       │  │ 1 replica  │ │ (GitHub)   │
                  └───────────────────┘  └────────────┘ └────────────┘
```

### Network Flow

1. User → Ingress (HTTPS)
2. Ingress → Frontend (HTTP)
3. Frontend → Backend (HTTP)
4. Backend → PostgreSQL (TCP/5432)
5. Backend → Docker DinD (TCP/2375)
6. Backend → External APIs (HTTPS)

### Storage Architecture

- PostgreSQL: PersistentVolumeClaim (20Gi+)
- Docker DinD: PersistentVolumeClaim (50Gi+)
- Backend/Frontend: EmptyDir (ephemeral)

---

## Additional Resources

- [Security Guide](./security.md) - Security best practices
- [API Reference](./api_reference.md) - API documentation
- [Quick Start Guide](./quick_start.md) - Getting started
- [Development Workflow](./dev_workflow.md) - Development process

---

**Last Updated:** 2025-10-01
