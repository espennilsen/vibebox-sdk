#!/bin/bash
# VibeBox Kubernetes Uninstall Script
# Removes VibeBox from a Kubernetes cluster

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

# Uninstall with kubectl
uninstall_kubectl() {
    print_header "Uninstalling with kubectl"

    NAMESPACE="${NAMESPACE:-vibebox}"

    print_warning "This will delete all VibeBox resources in namespace: $NAMESPACE"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Cancelled."
        exit 0
    fi

    # Delete resources in reverse order
    print_info "Deleting Network Policies..."
    kubectl delete -f ../base/network-policies.yaml --ignore-not-found=true

    print_info "Deleting HPA..."
    kubectl delete -f ../base/hpa.yaml --ignore-not-found=true

    print_info "Deleting Ingress..."
    kubectl delete -f ../base/ingress.yaml --ignore-not-found=true

    print_info "Deleting Frontend..."
    kubectl delete -f ../base/frontend-service.yaml --ignore-not-found=true
    kubectl delete -f ../base/frontend-deployment.yaml --ignore-not-found=true

    print_info "Deleting Backend..."
    kubectl delete -f ../base/backend-service.yaml --ignore-not-found=true
    kubectl delete -f ../base/backend-deployment.yaml --ignore-not-found=true

    print_info "Deleting Docker-in-Docker..."
    kubectl delete -f ../base/docker-dind-deployment.yaml --ignore-not-found=true

    print_info "Deleting PostgreSQL..."
    kubectl delete -f ../base/postgresql-service.yaml --ignore-not-found=true
    kubectl delete -f ../base/postgresql-statefulset.yaml --ignore-not-found=true

    print_info "Deleting RBAC..."
    kubectl delete -f ../base/rbac.yaml --ignore-not-found=true

    print_info "Deleting ConfigMap..."
    kubectl delete -f ../base/configmap.yaml --ignore-not-found=true

    # Ask about PVCs
    echo
    print_warning "Do you want to delete Persistent Volume Claims? This will DELETE ALL DATA!"
    read -p "Delete PVCs? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Deleting PVCs..."
        kubectl delete pvc --all -n "$NAMESPACE"
        print_success "PVCs deleted"
    else
        print_info "PVCs preserved. Delete manually if needed: kubectl delete pvc --all -n $NAMESPACE"
    fi

    # Ask about secrets
    echo
    print_warning "Do you want to delete Secrets?"
    read -p "Delete Secrets? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Deleting Secrets..."
        kubectl delete secret vibebox-secrets -n "$NAMESPACE" --ignore-not-found=true
        print_success "Secrets deleted"
    else
        print_info "Secrets preserved."
    fi

    # Ask about namespace
    echo
    print_warning "Do you want to delete the namespace?"
    read -p "Delete namespace $NAMESPACE? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Deleting namespace..."
        kubectl delete namespace "$NAMESPACE" --ignore-not-found=true
        print_success "Namespace deleted"
    else
        print_info "Namespace preserved."
    fi

    print_success "Uninstall complete!"
}

# Uninstall with Helm
uninstall_helm() {
    print_header "Uninstalling with Helm"

    RELEASE_NAME="${RELEASE_NAME:-vibebox}"
    NAMESPACE="${NAMESPACE:-vibebox}"

    print_warning "This will delete the Helm release: $RELEASE_NAME"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Cancelled."
        exit 0
    fi

    # Check if release exists
    if ! helm list -n "$NAMESPACE" | grep -q "$RELEASE_NAME"; then
        print_error "Release $RELEASE_NAME not found in namespace $NAMESPACE"
        exit 1
    fi

    # Uninstall Helm release
    print_info "Uninstalling Helm release..."
    helm uninstall "$RELEASE_NAME" -n "$NAMESPACE"
    print_success "Helm release uninstalled"

    # Ask about PVCs
    echo
    print_warning "Do you want to delete Persistent Volume Claims? This will DELETE ALL DATA!"
    read -p "Delete PVCs? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Deleting PVCs..."
        kubectl delete pvc --all -n "$NAMESPACE"
        print_success "PVCs deleted"
    else
        print_info "PVCs preserved. Delete manually if needed: kubectl delete pvc --all -n $NAMESPACE"
    fi

    # Ask about namespace
    echo
    print_warning "Do you want to delete the namespace?"
    read -p "Delete namespace $NAMESPACE? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Deleting namespace..."
        kubectl delete namespace "$NAMESPACE" --ignore-not-found=true
        print_success "Namespace deleted"
    else
        print_info "Namespace preserved."
    fi

    print_success "Uninstall complete!"
}

# Main menu
main() {
    echo
    print_header "VibeBox Kubernetes Uninstall"
    echo

    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl not found. Please install kubectl."
        exit 1
    fi

    echo "Select uninstall method:"
    echo "1) Uninstall kubectl deployment"
    echo "2) Uninstall Helm deployment"
    echo "3) Exit"
    echo
    read -p "Enter choice [1-3]: " -n 1 -r
    echo

    case $REPLY in
        1)
            uninstall_kubectl
            ;;
        2)
            # Check helm
            if ! command -v helm &> /dev/null; then
                print_error "helm not found. Please install helm."
                exit 1
            fi
            uninstall_helm
            ;;
        3)
            print_info "Exiting."
            exit 0
            ;;
        *)
            print_error "Invalid option."
            exit 1
            ;;
    esac

    echo
    print_info "Uninstall complete. You may need to manually clean up:"
    print_info "- PersistentVolumes: kubectl get pv"
    print_info "- LoadBalancer IPs: kubectl get svc --all-namespaces"
    print_info "- DNS records for your domain"
    echo
}

# Run main
main
