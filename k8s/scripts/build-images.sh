#!/bin/bash
# Build and push Docker images for VibeBox

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REGISTRY="${REGISTRY:-your-registry.io}"
PROJECT="${PROJECT:-vibebox}"
VERSION="${VERSION:-latest}"

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

    if ! command -v docker &> /dev/null; then
        print_error "Docker not found. Please install Docker."
        exit 1
    fi
    print_success "Docker found: $(docker --version)"

    if ! docker info &> /dev/null; then
        print_error "Docker daemon not running."
        exit 1
    fi
    print_success "Docker daemon is running"

    echo
}

# Build backend image
build_backend() {
    print_header "Building Backend Image"

    cd ../../backend

    print_info "Building backend image..."
    docker build \
        --platform linux/amd64 \
        -t "${REGISTRY}/${PROJECT}/backend:${VERSION}" \
        -t "${REGISTRY}/${PROJECT}/backend:latest" \
        -f Dockerfile \
        .

    print_success "Backend image built: ${REGISTRY}/${PROJECT}/backend:${VERSION}"
    echo
}

# Build frontend image
build_frontend() {
    print_header "Building Frontend Image"

    cd ../../frontend

    print_info "Building frontend image..."
    docker build \
        --platform linux/amd64 \
        -t "${REGISTRY}/${PROJECT}/frontend:${VERSION}" \
        -t "${REGISTRY}/${PROJECT}/frontend:latest" \
        -f Dockerfile \
        .

    print_success "Frontend image built: ${REGISTRY}/${PROJECT}/frontend:${VERSION}"
    echo
}

# Push images
push_images() {
    print_header "Pushing Images to Registry"

    # Check if logged in
    if ! docker info 2>/dev/null | grep -q "Username:"; then
        print_warning "Not logged in to Docker registry."
        read -p "Do you want to login? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker login "${REGISTRY}"
        else
            print_info "Skipping push. Login manually with: docker login ${REGISTRY}"
            return
        fi
    fi

    print_info "Pushing backend image..."
    docker push "${REGISTRY}/${PROJECT}/backend:${VERSION}"
    docker push "${REGISTRY}/${PROJECT}/backend:latest"
    print_success "Backend image pushed"

    print_info "Pushing frontend image..."
    docker push "${REGISTRY}/${PROJECT}/frontend:${VERSION}"
    docker push "${REGISTRY}/${PROJECT}/frontend:latest"
    print_success "Frontend image pushed"

    echo
}

# Scan images for vulnerabilities
scan_images() {
    print_header "Scanning Images for Vulnerabilities"

    if ! command -v trivy &> /dev/null; then
        print_warning "Trivy not found. Skipping security scan."
        print_info "Install Trivy: https://aquasecurity.github.io/trivy/"
        return
    fi

    print_info "Scanning backend image..."
    trivy image --severity HIGH,CRITICAL "${REGISTRY}/${PROJECT}/backend:${VERSION}"

    print_info "Scanning frontend image..."
    trivy image --severity HIGH,CRITICAL "${REGISTRY}/${PROJECT}/frontend:${VERSION}"

    echo
}

# Display image information
show_info() {
    print_header "Image Information"

    echo "Backend Image:"
    echo "  Name: ${REGISTRY}/${PROJECT}/backend:${VERSION}"
    echo "  Size: $(docker images --format '{{.Size}}' ${REGISTRY}/${PROJECT}/backend:${VERSION})"
    echo

    echo "Frontend Image:"
    echo "  Name: ${REGISTRY}/${PROJECT}/frontend:${VERSION}"
    echo "  Size: $(docker images --format '{{.Size}}' ${REGISTRY}/${PROJECT}/frontend:${VERSION})"
    echo
}

# Main menu
main() {
    echo
    print_header "VibeBox Image Builder"
    echo

    check_prerequisites

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --registry)
                REGISTRY="$2"
                shift 2
                ;;
            --version)
                VERSION="$2"
                shift 2
                ;;
            --push)
                PUSH=true
                shift
                ;;
            --scan)
                SCAN=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo
                echo "Options:"
                echo "  --registry REGISTRY  Docker registry (default: your-registry.io)"
                echo "  --version VERSION    Image version tag (default: latest)"
                echo "  --push               Push images after building"
                echo "  --scan               Scan images for vulnerabilities"
                echo "  --help               Show this help message"
                echo
                echo "Example:"
                echo "  $0 --registry docker.io/myuser --version v1.0.0 --push --scan"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    print_info "Registry: ${REGISTRY}"
    print_info "Project: ${PROJECT}"
    print_info "Version: ${VERSION}"
    echo

    # Build images
    build_backend
    build_frontend

    # Show image info
    show_info

    # Scan if requested
    if [ "$SCAN" = true ]; then
        scan_images
    fi

    # Push if requested
    if [ "$PUSH" = true ]; then
        push_images
    else
        echo
        print_info "Images built successfully but not pushed."
        print_info "To push images, run:"
        echo "  docker push ${REGISTRY}/${PROJECT}/backend:${VERSION}"
        echo "  docker push ${REGISTRY}/${PROJECT}/frontend:${VERSION}"
        echo
        print_info "Or run this script with --push flag"
    fi

    echo
    print_success "Build complete!"
    print_info "Update Helm values or Kustomization with new image tags"
}

# Run main
main "$@"
