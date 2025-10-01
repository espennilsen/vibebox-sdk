# Kubernetes Quick Reference

Quick reference for common VibeBox Kubernetes operations.

## Deployment

```bash
# Deploy with Helm
helm install vibebox helm/vibebox -f values.yaml -f secrets.yaml

# Deploy with kubectl
kubectl apply -k base/

# Deploy with script
cd scripts && ./deploy.sh
```

## Monitoring

```bash
# View all resources
kubectl get all -n vibebox

# View pods with details
kubectl get pods -n vibebox -o wide

# View logs
kubectl logs -f deployment/vibebox-backend -n vibebox
kubectl logs -f deployment/vibebox-frontend -n vibebox
kubectl logs -f statefulset/vibebox-postgres -n vibebox

# View events
kubectl get events -n vibebox --sort-by='.lastTimestamp'

# Resource usage
kubectl top nodes
kubectl top pods -n vibebox
```

## Scaling

```bash
# Manual scaling
kubectl scale deployment vibebox-backend -n vibebox --replicas=5

# View HPA status
kubectl get hpa -n vibebox

# Edit HPA
kubectl edit hpa vibebox-backend-hpa -n vibebox
```

## Troubleshooting

```bash
# Describe pod
kubectl describe pod <pod-name> -n vibebox

# Get pod logs
kubectl logs <pod-name> -n vibebox

# Previous container logs (if crashed)
kubectl logs <pod-name> -n vibebox --previous

# Exec into pod
kubectl exec -it <pod-name> -n vibebox -- /bin/sh

# Port forward for debugging
kubectl port-forward -n vibebox svc/vibebox-backend 3000:3000

# Check pod events
kubectl describe pod <pod-name> -n vibebox | grep -A 10 Events
```

## Database Operations

```bash
# Connect to PostgreSQL
kubectl exec -it vibebox-postgres-0 -n vibebox -- psql -U vibebox

# Backup database
kubectl exec vibebox-postgres-0 -n vibebox -- \
  pg_dump -U vibebox vibebox | gzip > backup.sql.gz

# Restore database
kubectl cp backup.sql.gz vibebox/vibebox-postgres-0:/tmp/
kubectl exec vibebox-postgres-0 -n vibebox -- \
  bash -c "gunzip < /tmp/backup.sql.gz | psql -U vibebox vibebox"
```

## Configuration

```bash
# View ConfigMap
kubectl get configmap vibebox-config -n vibebox -o yaml

# Edit ConfigMap
kubectl edit configmap vibebox-config -n vibebox

# View Secrets (base64 encoded)
kubectl get secret vibebox-secrets -n vibebox -o yaml

# Decode secret
kubectl get secret vibebox-secrets -n vibebox \
  -o jsonpath='{.data.POSTGRES_PASSWORD}' | base64 --decode
```

## Updates

```bash
# Update image
kubectl set image deployment/vibebox-backend \
  backend=vibebox/backend:v1.1.0 -n vibebox

# Rollout status
kubectl rollout status deployment/vibebox-backend -n vibebox

# Rollout history
kubectl rollout history deployment/vibebox-backend -n vibebox

# Rollback
kubectl rollout undo deployment/vibebox-backend -n vibebox

# Restart deployment
kubectl rollout restart deployment/vibebox-backend -n vibebox
```

## Helm Operations

```bash
# List releases
helm list -n vibebox

# Get release status
helm status vibebox -n vibebox

# View values
helm get values vibebox -n vibebox

# Upgrade
helm upgrade vibebox helm/vibebox -f values.yaml -f secrets.yaml

# Rollback
helm rollback vibebox -n vibebox

# Uninstall
helm uninstall vibebox -n vibebox
```

## Ingress & Networking

```bash
# View ingress
kubectl get ingress -n vibebox
kubectl describe ingress vibebox-ingress -n vibebox

# View services
kubectl get svc -n vibebox

# View network policies
kubectl get networkpolicies -n vibebox

# View certificates
kubectl get certificate -n vibebox
kubectl describe certificate vibebox-tls-cert -n vibebox
```

## Storage

```bash
# View PVCs
kubectl get pvc -n vibebox

# View PVs
kubectl get pv

# Describe PVC
kubectl describe pvc postgres-data-pvc -n vibebox

# Check storage usage
kubectl exec vibebox-postgres-0 -n vibebox -- df -h
```

## Security

```bash
# View service accounts
kubectl get sa -n vibebox

# View roles and role bindings
kubectl get role,rolebinding -n vibebox

# View pod security
kubectl auth can-i --list --namespace=vibebox

# Scan for vulnerabilities
trivy image vibebox/backend:latest
```

## Performance

```bash
# CPU and memory usage
kubectl top pods -n vibebox --sort-by=cpu
kubectl top pods -n vibebox --sort-by=memory

# View resource quotas
kubectl get resourcequota -n vibebox

# View limit ranges
kubectl get limitrange -n vibebox
```

## Cleanup

```bash
# Delete specific resources
kubectl delete deployment vibebox-backend -n vibebox

# Delete namespace (CAREFUL!)
kubectl delete namespace vibebox

# Delete with Helm
helm uninstall vibebox -n vibebox

# Delete PVCs (CAREFUL - DATA LOSS!)
kubectl delete pvc --all -n vibebox
```

## Emergency Commands

```bash
# Scale down backend (stop writes to DB)
kubectl scale deployment vibebox-backend -n vibebox --replicas=0

# Scale up backend
kubectl scale deployment vibebox-backend -n vibebox --replicas=2

# Delete crashing pod (force restart)
kubectl delete pod <pod-name> -n vibebox --force --grace-period=0

# Drain node for maintenance
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Uncordon node
kubectl uncordon <node-name>

# Get cluster info
kubectl cluster-info
kubectl get nodes
kubectl get componentstatuses
```

## Useful Aliases

```bash
# Add to ~/.bashrc or ~/.zshrc
alias k='kubectl'
alias kgp='kubectl get pods'
alias kgs='kubectl get svc'
alias kgd='kubectl get deployments'
alias kl='kubectl logs -f'
alias kex='kubectl exec -it'
alias kdesc='kubectl describe'
alias kn='kubectl config set-context --current --namespace'

# VibeBox specific
alias vb='kubectl -n vibebox'
alias vblogs='kubectl logs -f -n vibebox'
alias vbpods='kubectl get pods -n vibebox'
```

## Health Checks

```bash
# Check backend health
kubectl port-forward -n vibebox svc/vibebox-backend 3000:3000 &
curl http://localhost:3000/health

# Check database connectivity
kubectl exec -it vibebox-backend-xxx -n vibebox -- \
  nc -zv vibebox-postgres 5432

# Check all pod readiness
kubectl get pods -n vibebox -o json | \
  jq '.items[] | {name: .metadata.name, ready: .status.conditions[] | select(.type=="Ready") | .status}'
```

## Advanced Debugging

```bash
# Run debug container with networking tools
kubectl run -it --rm debug --image=nicolaka/netshoot \
  --restart=Never -n vibebox -- bash

# Copy files from pod
kubectl cp vibebox/<pod-name>:/path/to/file ./local-file -n vibebox

# Copy files to pod
kubectl cp ./local-file vibebox/<pod-name>:/path/to/file -n vibebox

# Watch resources in real-time
watch kubectl get pods -n vibebox

# Get resource YAML
kubectl get deployment vibebox-backend -n vibebox -o yaml

# Diff before apply
kubectl diff -f deployment.yaml
```

---

For detailed documentation, see [.claude/kubernetes.md](../.claude/kubernetes.md)
