# Deployment Architecture

## Kubernetes Cluster Overview

```mermaid
graph TB
    subgraph "External"
        Users[Users/Clients]
        CDN[CDN<br/>Static Assets]
    end

    subgraph "Ingress Layer"
        LB[Load Balancer<br/>SSL Termination]
        Ingress[Nginx Ingress<br/>Controller]
    end

    subgraph "Kubernetes Cluster"
        subgraph "Frontend Namespace"
            FrontDeploy[Frontend Deployment<br/>Replicas: 3]
            FrontPod1[Frontend Pod 1<br/>React App]
            FrontPod2[Frontend Pod 2<br/>React App]
            FrontPod3[Frontend Pod 3<br/>React App]
            FrontSvc[Frontend Service<br/>ClusterIP]
        end

        subgraph "Backend Namespace"
            BackDeploy[Backend Deployment<br/>Replicas: 3]
            BackPod1[Backend Pod 1<br/>API Server]
            BackPod2[Backend Pod 2<br/>API Server]
            BackPod3[Backend Pod 3<br/>API Server]
            BackSvc[Backend Service<br/>ClusterIP]
        end

        subgraph "Database Namespace"
            PGStateful[PostgreSQL StatefulSet<br/>Replicas: 1]
            PGPod[PostgreSQL Pod<br/>Primary]
            PGSvc[PostgreSQL Service<br/>ClusterIP]
            PGPvc[PVC: postgres-data<br/>100Gi]

            RedisStateful[Redis StatefulSet<br/>Replicas: 1]
            RedisPod[Redis Pod<br/>Cache]
            RedisSvc[Redis Service<br/>ClusterIP]
            RedisPvc[PVC: redis-data<br/>10Gi]
        end

        subgraph "Docker Namespace"
            DockerDaemon1[Docker DaemonSet<br/>Node 1]
            DockerDaemon2[Docker DaemonSet<br/>Node 2]
        end
    end

    subgraph "Storage"
        PV1[PersistentVolume<br/>postgres-pv<br/>100Gi]
        PV2[PersistentVolume<br/>redis-pv<br/>10Gi]
        PV3[PersistentVolume<br/>docker-volumes-pv<br/>500Gi]
    end

    subgraph "Secrets"
        SecretMgr[Secret Manager<br/>External KMS]
        K8sSecrets[Kubernetes Secrets]
    end

    Users --> CDN
    Users --> LB
    CDN --> LB
    LB --> Ingress

    Ingress --> FrontSvc
    Ingress --> BackSvc

    FrontSvc --> FrontPod1
    FrontSvc --> FrontPod2
    FrontSvc --> FrontPod3

    FrontDeploy -.manages.-> FrontPod1
    FrontDeploy -.manages.-> FrontPod2
    FrontDeploy -.manages.-> FrontPod3

    BackSvc --> BackPod1
    BackSvc --> BackPod2
    BackSvc --> BackPod3

    BackDeploy -.manages.-> BackPod1
    BackDeploy -.manages.-> BackPod2
    BackDeploy -.manages.-> BackPod3

    BackPod1 --> PGSvc
    BackPod2 --> PGSvc
    BackPod3 --> PGSvc

    BackPod1 --> RedisSvc
    BackPod2 --> RedisSvc
    BackPod3 --> RedisSvc

    BackPod1 --> DockerDaemon1
    BackPod2 --> DockerDaemon2
    BackPod3 --> DockerDaemon1

    PGSvc --> PGPod
    RedisSvc --> RedisPod

    PGStateful -.manages.-> PGPod
    RedisStateful -.manages.-> RedisPod

    PGPod --> PGPvc
    RedisPod --> RedisPvc

    PGPvc --> PV1
    RedisPvc --> PV2
    DockerDaemon1 --> PV3
    DockerDaemon2 --> PV3

    SecretMgr --> K8sSecrets
    K8sSecrets --> BackPod1
    K8sSecrets --> BackPod2
    K8sSecrets --> BackPod3
    K8sSecrets --> PGPod

    classDef external fill:#95a5a6,stroke:#333,stroke-width:2px,color:#000
    classDef ingress fill:#e74c3c,stroke:#333,stroke-width:2px,color:#fff
    classDef frontend fill:#61dafb,stroke:#333,stroke-width:2px,color:#000
    classDef backend fill:#68a063,stroke:#333,stroke-width:2px,color:#fff
    classDef database fill:#336791,stroke:#333,stroke-width:2px,color:#fff
    classDef storage fill:#f39c12,stroke:#333,stroke-width:2px,color:#000
    classDef secrets fill:#9b59b6,stroke:#333,stroke-width:2px,color:#fff

    class Users,CDN external
    class LB,Ingress ingress
    class FrontDeploy,FrontPod1,FrontPod2,FrontPod3,FrontSvc frontend
    class BackDeploy,BackPod1,BackPod2,BackPod3,BackSvc backend
    class PGStateful,PGPod,PGSvc,RedisStateful,RedisPod,RedisSvc,DockerDaemon1,DockerDaemon2 database
    class PV1,PV2,PV3,PGPvc,RedisPvc storage
    class SecretMgr,K8sSecrets secrets
```

## Pod Resource Allocation

```mermaid
graph LR
    subgraph "Frontend Pod"
        FPod[nginx:alpine<br/>Serves static files]
        FRes[Resources:<br/>CPU: 100m/500m<br/>Memory: 128Mi/512Mi]
    end

    subgraph "Backend Pod"
        BPod[node:20-alpine<br/>Fastify API Server]
        BRes[Resources:<br/>CPU: 500m/2000m<br/>Memory: 512Mi/2Gi]
    end

    subgraph "PostgreSQL Pod"
        PGPod[postgres:16-alpine<br/>Primary Database]
        PGRes[Resources:<br/>CPU: 1000m/4000m<br/>Memory: 2Gi/8Gi<br/>Storage: 100Gi]
    end

    subgraph "Redis Pod"
        RedisPod[redis:7-alpine<br/>Cache & Sessions]
        RedisRes[Resources:<br/>CPU: 100m/500m<br/>Memory: 256Mi/1Gi<br/>Storage: 10Gi]
    end

    subgraph "Docker DaemonSet"
        DPod[docker:dind<br/>Container Runtime]
        DRes[Resources:<br/>CPU: 2000m/8000m<br/>Memory: 4Gi/16Gi<br/>Storage: 500Gi]
    end

    FPod --- FRes
    BPod --- BRes
    PGPod --- PGRes
    RedisPod --- RedisRes
    DPod --- DRes

    classDef pod fill:#3498db,stroke:#333,stroke-width:2px,color:#fff
    classDef resources fill:#27ae60,stroke:#333,stroke-width:2px,color:#fff

    class FPod,BPod,PGPod,RedisPod,DPod pod
    class FRes,BRes,PGRes,RedisRes,DRes resources
```

## Network Policies

```mermaid
graph TB
    Internet[Internet]

    subgraph "Ingress Layer"
        Ingress[Nginx Ingress]
    end

    subgraph "Application Layer"
        Frontend[Frontend Pods]
        Backend[Backend Pods]
    end

    subgraph "Data Layer"
        PostgreSQL[PostgreSQL Pods]
        Redis[Redis Pods]
    end

    subgraph "Runtime Layer"
        Docker[Docker Daemon]
    end

    Internet -->|HTTPS:443| Ingress
    Ingress -->|HTTP:80| Frontend
    Ingress -->|HTTP:3000| Backend

    Frontend -.->|Denied| PostgreSQL
    Frontend -.->|Denied| Redis
    Frontend -.->|Denied| Docker

    Backend -->|TCP:5432| PostgreSQL
    Backend -->|TCP:6379| Redis
    Backend -->|TCP:2375| Docker

    Note1[Network Policy: frontend<br/>Allow: Ingress only<br/>Deny: All egress to data layer]

    Note2[Network Policy: backend<br/>Allow: From Ingress & Frontend<br/>Allow: To PostgreSQL, Redis, Docker]

    Note3[Network Policy: database<br/>Allow: From Backend only<br/>Deny: All other traffic]

    classDef internet fill:#95a5a6,stroke:#333,stroke-width:2px,color:#000
    classDef ingress fill:#e74c3c,stroke:#333,stroke-width:2px,color:#fff
    classDef app fill:#3498db,stroke:#333,stroke-width:2px,color:#fff
    classDef data fill:#27ae60,stroke:#333,stroke-width:2px,color:#fff
    classDef runtime fill:#f39c12,stroke:#333,stroke-width:2px,color:#000

    class Internet internet
    class Ingress ingress
    class Frontend,Backend app
    class PostgreSQL,Redis data
    class Docker runtime
```

## Service Mesh (Optional)

```mermaid
graph TB
    subgraph "Control Plane"
        Istio[Istio Control Plane<br/>Policy & Config]
    end

    subgraph "Data Plane"
        subgraph "Frontend Pod"
            FApp[React App]
            FProxy[Envoy Proxy]
        end

        subgraph "Backend Pod"
            BApp[API Server]
            BProxy[Envoy Proxy]
        end

        subgraph "Database Pod"
            PGApp[PostgreSQL]
            PGProxy[Envoy Proxy]
        end
    end

    Istio -.configures.-> FProxy
    Istio -.configures.-> BProxy
    Istio -.configures.-> PGProxy

    FApp <--> FProxy
    BApp <--> BProxy
    PGApp <--> PGProxy

    FProxy <-->|mTLS| BProxy
    BProxy <-->|mTLS| PGProxy

    Note[Features:<br/>• Mutual TLS<br/>• Traffic Management<br/>• Observability<br/>• Circuit Breaking<br/>• Retry Logic]

    classDef control fill:#9b59b6,stroke:#333,stroke-width:2px,color:#fff
    classDef app fill:#3498db,stroke:#333,stroke-width:2px,color:#fff
    classDef proxy fill:#f39c12,stroke:#333,stroke-width:2px,color:#000

    class Istio control
    class FApp,BApp,PGApp app
    class FProxy,BProxy,PGProxy proxy
```

## Deployment Strategy: Rolling Update

```mermaid
sequenceDiagram
    participant CI/CD
    participant K8s as Kubernetes
    participant Old1 as Old Pod 1
    participant Old2 as Old Pod 2
    participant Old3 as Old Pod 3
    participant New1 as New Pod 1
    participant New2 as New Pod 2
    participant New3 as New Pod 3
    participant LB as Load Balancer

    CI/CD->>K8s: Deploy New Version
    K8s->>K8s: Update Deployment Spec

    Note over K8s,New1: Create New Pod 1

    K8s->>New1: Create & Start
    New1->>New1: Pull Image
    New1->>New1: Health Check
    New1-->>K8s: Ready

    K8s->>LB: Add New1 to Pool
    K8s->>Old1: Terminate
    Old1-->>K8s: Graceful Shutdown (30s)

    Note over K8s,New2: Create New Pod 2

    K8s->>New2: Create & Start
    New2->>New2: Pull Image
    New2->>New2: Health Check
    New2-->>K8s: Ready

    K8s->>LB: Add New2 to Pool
    K8s->>Old2: Terminate
    Old2-->>K8s: Graceful Shutdown (30s)

    Note over K8s,New3: Create New Pod 3

    K8s->>New3: Create & Start
    New3->>New3: Pull Image
    New3->>New3: Health Check
    New3-->>K8s: Ready

    K8s->>LB: Add New3 to Pool
    K8s->>Old3: Terminate
    Old3-->>K8s: Graceful Shutdown (30s)

    Note over CI/CD,LB: Deployment Complete: Zero Downtime
```

## Health Checks & Probes

```mermaid
graph TB
    Pod[Pod Running]

    subgraph "Startup Probe"
        Startup[Check: /health/startup<br/>Initial Delay: 0s<br/>Period: 3s<br/>Failure Threshold: 30<br/>Timeout: 5s]
    end

    subgraph "Liveness Probe"
        Liveness[Check: /health/live<br/>Initial Delay: 30s<br/>Period: 10s<br/>Failure Threshold: 3<br/>Timeout: 5s]
    end

    subgraph "Readiness Probe"
        Readiness[Check: /health/ready<br/>Initial Delay: 10s<br/>Period: 5s<br/>Failure Threshold: 3<br/>Timeout: 5s]
    end

    Pod --> Startup
    Startup -->|Success| Liveness
    Startup -->|Failure| Kill1[Kill & Restart Pod]

    Liveness -->|Success| Check[Periodic Check]
    Liveness -->|Failure| Kill2[Kill & Restart Pod]
    Check --> Liveness

    Readiness -->|Success| AddToLB[Add to Load Balancer]
    Readiness -->|Failure| RemoveFromLB[Remove from Load Balancer]

    AddToLB --> ServeTraffic[Serve Traffic]
    ServeTraffic --> Readiness

    classDef probe fill:#3498db,stroke:#333,stroke-width:2px,color:#fff
    classDef action fill:#27ae60,stroke:#333,stroke-width:2px,color:#fff
    classDef error fill:#e74c3c,stroke:#333,stroke-width:2px,color:#fff

    class Startup,Liveness,Readiness probe
    class AddToLB,ServeTraffic,Check action
    class Kill1,Kill2,RemoveFromLB error
```

## Autoscaling Configuration

```mermaid
graph LR
    subgraph "Horizontal Pod Autoscaler (HPA)"
        HPA[HPA Controller]
        Metrics[Metrics Server]
    end

    subgraph "Backend Deployment"
        BackDeploy[Backend Deployment<br/>Min: 3, Max: 10]
        BackPods[Backend Pods<br/>Current: 3]
    end

    Metrics -->|CPU: 45%<br/>Memory: 60%| HPA

    HPA -->|Current < 70%| NoScale[No Action]
    HPA -->|Current > 70%| ScaleUp[Scale Up<br/>+1 Pod]
    HPA -->|Current < 30%| ScaleDown[Scale Down<br/>-1 Pod]

    ScaleUp --> BackDeploy
    ScaleDown --> BackDeploy
    BackDeploy -.manages.-> BackPods

    Note[Scaling Metrics:<br/>• CPU Utilization > 70%<br/>• Memory Utilization > 70%<br/>• Custom: Active WS Connections > 1000<br/>• Scale Up: +1 pod every 30s<br/>• Scale Down: -1 pod every 5m]

    classDef autoscale fill:#f39c12,stroke:#333,stroke-width:2px,color:#000
    classDef deployment fill:#3498db,stroke:#333,stroke-width:2px,color:#fff
    classDef action fill:#27ae60,stroke:#333,stroke-width:2px,color:#fff

    class HPA,Metrics autoscale
    class BackDeploy,BackPods deployment
    class NoScale,ScaleUp,ScaleDown action
```

## Persistent Storage Architecture

```mermaid
graph TB
    subgraph "StorageClass"
        SC[StorageClass: fast-ssd<br/>Provisioner: AWS EBS<br/>Type: gp3<br/>IOPS: 3000]
    end

    subgraph "PersistentVolumeClaim"
        PVC1[PVC: postgres-data<br/>Size: 100Gi<br/>AccessMode: ReadWriteOnce]

        PVC2[PVC: redis-data<br/>Size: 10Gi<br/>AccessMode: ReadWriteOnce]

        PVC3[PVC: docker-volumes<br/>Size: 500Gi<br/>AccessMode: ReadWriteMany]
    end

    subgraph "PersistentVolume"
        PV1[PV: postgres-pv<br/>100Gi<br/>Retained]

        PV2[PV: redis-pv<br/>10Gi<br/>Retained]

        PV3[PV: docker-pv<br/>500Gi<br/>Retained]
    end

    subgraph "Physical Storage"
        EBS1[AWS EBS Volume<br/>gp3, 100Gi<br/>Encrypted]

        EBS2[AWS EBS Volume<br/>gp3, 10Gi<br/>Encrypted]

        EBS3[AWS EFS Volume<br/>500Gi<br/>Encrypted]
    end

    SC -.provisions.-> PV1
    SC -.provisions.-> PV2
    SC -.provisions.-> PV3

    PVC1 --> PV1
    PVC2 --> PV2
    PVC3 --> PV3

    PV1 --> EBS1
    PV2 --> EBS2
    PV3 --> EBS3

    PostgreSQL[PostgreSQL Pod] --> PVC1
    Redis[Redis Pod] --> PVC2
    Docker1[Docker Daemon 1] --> PVC3
    Docker2[Docker Daemon 2] --> PVC3

    classDef storage fill:#f39c12,stroke:#333,stroke-width:2px,color:#000
    classDef claim fill:#3498db,stroke:#333,stroke-width:2px,color:#fff
    classDef volume fill:#27ae60,stroke:#333,stroke-width:2px,color:#fff
    classDef physical fill:#95a5a6,stroke:#333,stroke-width:2px,color:#000

    class SC storage
    class PVC1,PVC2,PVC3 claim
    class PV1,PV2,PV3 volume
    class EBS1,EBS2,EBS3 physical
```

## Backup & Disaster Recovery

```mermaid
sequenceDiagram
    participant Cron as CronJob
    participant Backup as Backup Script
    participant PG as PostgreSQL
    participant S3 as S3 Bucket
    participant Monitor as Monitoring

    Note over Cron,S3: Daily Backup (3 AM UTC)

    Cron->>Backup: Trigger Daily Backup
    Backup->>PG: pg_dump --format=custom
    PG-->>Backup: Database Dump (SQL)

    Backup->>Backup: Compress (gzip)
    Backup->>Backup: Encrypt (AES-256)

    Backup->>S3: Upload to S3<br/>vibebox-backups/2025-10-01.sql.gz.enc
    S3-->>Backup: Upload Complete

    Backup->>Monitor: Log Success
    Monitor->>Monitor: Alert if backup > 2 hours old

    Note over Cron,S3: Retention Policy

    Backup->>S3: List Old Backups
    S3-->>Backup: Backups > 30 days
    Backup->>S3: Delete Old Backups
    S3-->>Backup: Deleted

    Note over Cron,S3: Disaster Recovery

    Backup->>S3: Download Latest Backup
    S3-->>Backup: Backup File
    Backup->>Backup: Decrypt & Decompress
    Backup->>PG: pg_restore
    PG-->>Backup: Database Restored
```

## Monitoring & Observability Stack

```mermaid
graph TB
    subgraph "Application"
        App[VibeBox Pods]
        AppMetrics[Prometheus Metrics<br/>/metrics endpoint]
        AppLogs[Structured Logs<br/>JSON format]
    end

    subgraph "Collection"
        Prometheus[Prometheus<br/>Metrics Collection]
        Loki[Loki<br/>Log Aggregation]
        Jaeger[Jaeger<br/>Distributed Tracing]
    end

    subgraph "Visualization"
        Grafana[Grafana<br/>Dashboards]
    end

    subgraph "Alerting"
        AlertManager[AlertManager<br/>Alert Routing]
        PagerDuty[PagerDuty<br/>On-Call]
        Slack[Slack<br/>Notifications]
    end

    App --> AppMetrics
    App --> AppLogs

    AppMetrics --> Prometheus
    AppLogs --> Loki
    App --> Jaeger

    Prometheus --> Grafana
    Loki --> Grafana
    Jaeger --> Grafana

    Prometheus --> AlertManager
    AlertManager --> PagerDuty
    AlertManager --> Slack

    classDef app fill:#3498db,stroke:#333,stroke-width:2px,color:#fff
    classDef collection fill:#f39c12,stroke:#333,stroke-width:2px,color:#000
    classDef viz fill:#27ae60,stroke:#333,stroke-width:2px,color:#fff
    classDef alert fill:#e74c3c,stroke:#333,stroke-width:2px,color:#fff

    class App,AppMetrics,AppLogs app
    class Prometheus,Loki,Jaeger collection
    class Grafana viz
    class AlertManager,PagerDuty,Slack alert
```

## CI/CD Pipeline

```mermaid
graph LR
    Dev[Developer]
    Git[GitHub Repo]
    CI[GitHub Actions]
    Build[Build & Test]
    Registry[Container Registry<br/>ECR/DockerHub]
    Deploy[ArgoCD]
    K8s[Kubernetes Cluster]
    Notify[Slack Notification]

    Dev -->|Push Code| Git
    Git -->|Webhook| CI
    CI --> Build
    Build -->|Tests Pass| Registry
    Build -->|Tests Fail| Notify

    Registry -->|New Image| Deploy
    Deploy -->|GitOps Sync| K8s
    K8s -->|Deployment Success| Notify

    classDef dev fill:#61dafb,stroke:#333,stroke-width:2px,color:#000
    classDef ci fill:#f39c12,stroke:#333,stroke-width:2px,color:#000
    classDef deploy fill:#27ae60,stroke:#333,stroke-width:2px,color:#fff
    classDef notify fill:#e74c3c,stroke:#333,stroke-width:2px,color:#fff

    class Dev,Git dev
    class CI,Build ci
    class Registry,Deploy,K8s deploy
    class Notify notify
```

## Resource Requirements Summary

| Component | Min CPU | Max CPU | Min Memory | Max Memory | Storage |
|-----------|---------|---------|------------|------------|---------|
| Frontend Pod | 100m | 500m | 128Mi | 512Mi | - |
| Backend Pod | 500m | 2000m | 512Mi | 2Gi | - |
| PostgreSQL | 1000m | 4000m | 2Gi | 8Gi | 100Gi |
| Redis | 100m | 500m | 256Mi | 1Gi | 10Gi |
| Docker Daemon | 2000m | 8000m | 4Gi | 16Gi | 500Gi |
| **Total (3 replicas)** | **6.8 CPU** | **27.5 CPU** | **13.4Gi** | **53.5Gi** | **610Gi** |

## High Availability Configuration

- **Frontend**: 3 replicas, rolling updates
- **Backend**: 3 replicas, rolling updates
- **PostgreSQL**: 1 primary (HA with replication recommended)
- **Redis**: 1 instance (Redis Sentinel for HA recommended)
- **Ingress**: Multi-AZ load balancer
- **Storage**: Cross-AZ replication enabled
- **Backups**: Daily to S3, 30-day retention
