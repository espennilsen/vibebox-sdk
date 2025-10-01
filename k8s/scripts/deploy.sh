#!/bin/bash
# VibeBox Kubernetes Deployment Script
# Automates the deployment of VibeBox to a Kubernetes cluster

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl not found. Please install kubectl."
        exit 1
    fi
    print_success "kubectl found: $(kubectl version --client --short 2>/dev/null || kubectl version --client)"

    # Check helm
    if ! command -v helm &> /dev/null; then
        print_error "helm not found. Please install helm."
        exit 1
    fi
    print_success "helm found: $(helm version --short)"

    # Check cluster connection
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster."
        exit 1
    fi
    print_success "Connected to cluster: $(kubectl config current-context)"

    echo
}

# Generate secrets
generate_secrets() {
    print_header "Generating Secrets"

    if [ -f "./secrets.yaml" ]; then
        print_warning "secrets.yaml already exists. Skipping generation."
        read -p "Do you want to regenerate secrets? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return
        fi
    fi

    print_info "Generating secure random secrets..."

    # Generate secrets
    POSTGRES_PASSWORD=$(openssl rand -base64 32)
    JWT_SECRET=$(openssl rand -base64 32)
    JWT_REFRESH_SECRET=$(openssl rand -base64 32)
    ENCRYPTION_KEY=$(openssl rand -base64 32)

    # Create secrets file
    cat > secrets.yaml <<EOF
# VibeBox Secrets
# IMPORTANT: Do NOT commit this file to version control!

secrets:
  postgresPassword: "${POSTGRES_PASSWORD}"
  jwtSecret: "${JWT_SECRET}"
  jwtRefreshSecret: "${JWT_REFRESH_SECRET}"
  encryptionKey: "${ENCRYPTION_KEY}"
EOF

    print_success "Secrets generated and saved to secrets.yaml"
    print_warning "IMPORTANT: Add secrets.yaml to .gitignore and store it securely!"
    echo
}

# Deploy with kubectl
deploy_kubectl() {
    print_header "Deploying with kubectl"

    NAMESPACE="${NAMESPACE:-vibebox}"

    # Create namespace
    print_info "Creating namespace: $NAMESPACE"
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    print_success "Namespace created"

    # Apply base manifests
    print_info "Applying base manifests..."
    kubectl apply -f ../base/namespace.yaml
    kubectl apply -f ../base/configmap.yaml
    kubectl apply -f ../base/pvc.yaml
    kubectl apply -f ../base/rbac.yaml
    print_success "Base manifests applied"

    # Check if secrets exist
    if ! kubectl get secret vibebox-secrets -n "$NAMESPACE" &> /dev/null; then
        print_warning "Secrets not found. Please create secrets manually."
        print_info "Copy and edit: cp ../base/secrets.yaml.example ../base/secrets.yaml"
        print_info "Then apply: kubectl apply -f ../base/secrets.yaml"
        exit 1
    fi
    print_success "Secrets found"

    # Deploy PostgreSQL
    print_info "Deploying PostgreSQL..."
    kubectl apply -f ../base/postgresql-statefulset.yaml
    kubectl apply -f ../base/postgresql-service.yaml
    print_success "PostgreSQL deployed"

    # Deploy Docker-in-Docker
    print_info "Deploying Docker-in-Docker..."
    kubectl apply -f ../base/docker-dind-deployment.yaml
    print_success "Docker-in-Docker deployed"

    # Wait for PostgreSQL to be ready
    print_info "Waiting for PostgreSQL to be ready..."
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=database -n "$NAMESPACE" --timeout=300s
    print_success "PostgreSQL is ready"

    # Deploy Backend
    print_info "Deploying Backend..."
    kubectl apply -f ../base/backend-deployment.yaml
    kubectl apply -f ../base/backend-service.yaml
    print_success "Backend deployed"

    # Deploy Frontend
    print_info "Deploying Frontend..."
    kubectl apply -f ../base/frontend-deployment.yaml
    kubectl apply -f ../base/frontend-service.yaml
    print_success "Frontend deployed"

    # Deploy Ingress
    print_info "Deploying Ingress..."
    kubectl apply -f ../base/ingress.yaml
    print_success "Ingress deployed"

    # Deploy HPA
    print_info "Deploying Horizontal Pod Autoscalers..."
    kubectl apply -f ../base/hpa.yaml
    print_success "HPA deployed"

    # Deploy Network Policies
    print_info "Deploying Network Policies..."
    kubectl apply -f ../base/network-policies.yaml
    print_success "Network Policies deployed"

    echo
    print_success "Deployment complete!"
    print_info "Check status: kubectl get pods -n $NAMESPACE"
}

# Deploy with Helm
deploy_helm() {
    print_header "Deploying with Helm"

    RELEASE_NAME="${RELEASE_NAME:-vibebox}"
    NAMESPACE="${NAMESPACE:-vibebox}"

    # Check if secrets.yaml exists
    if [ ! -f "./secrets.yaml" ]; then
        print_warning "secrets.yaml not found. Generating..."
        generate_secrets
    fi

    # Deploy with Helm
    print_info "Installing Helm chart..."
    helm upgrade --install "$RELEASE_NAME" ../helm/vibebox \
        --namespace "$NAMESPACE" \
        --create-namespace \
        -f ../helm/vibebox/values.yaml \
        -f ./secrets.yaml \
        --wait \
        --timeout 10m

    print_success "Helm deployment complete!"
    echo
    print_info "Check status: helm status $RELEASE_NAME -n $NAMESPACE"
    print_info "Get pods: kubectl get pods -n $NAMESPACE"
}

# Main menu
main() {
    echo
    print_header "VibeBox Kubernetes Deployment"
    echo

    check_prerequisites

    echo "Select deployment method:"
    echo "1) Deploy with kubectl (raw manifests)"
    echo "2) Deploy with Helm (recommended)"
    echo "3) Generate secrets only"
    echo "4) Exit"
    echo
    read -p "Enter choice [1-4]: " -n 1 -r
    echo

    case $REPLY in
        1)
            deploy_kubectl
            ;;
        2)
            deploy_helm
            ;;
        3)
            generate_secrets
            ;;
        4)
            print_info "Exiting."
            exit 0
            ;;
        *)
            print_error "Invalid option."
            exit 1
            ;;
    esac

    echo
    print_header "Next Steps"
    echo "1. Check pod status: kubectl get pods -n vibebox"
    echo "2. Check ingress: kubectl get ingress -n vibebox"
    echo "3. Access logs: kubectl logs -f deployment/vibebox-backend -n vibebox"
    echo "4. Access the application: https://vibebox.yourdomain.com"
    echo
}

# Run main
main
