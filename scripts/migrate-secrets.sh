#!/bin/bash

###############################################################################
# Secrets Migration Script for VibeBox
#
# Migrates secrets from .env files to a secret manager.
# Supports:
# - AWS Secrets Manager
# - Google Cloud Secret Manager
# - Azure Key Vault
# - HashiCorp Vault
# - Kubernetes Secrets
#
# Usage:
#   ./scripts/migrate-secrets.sh [provider] [options]
#
# Examples:
#   ./scripts/migrate-secrets.sh aws
#   ./scripts/migrate-secrets.sh gcp --env-file=.env.production
#   ./scripts/migrate-secrets.sh vault --dry-run
#
# Environment Variables:
#   SECRET_PROVIDER - Target secret manager (aws, gcp, azure, vault, k8s)
#   ENV_FILE - Path to .env file (default: .env)
#   DRY_RUN - Set to "true" for dry run mode
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Default values
DRY_RUN="${DRY_RUN:-false}"
ENV_FILE="${ENV_FILE:-$PROJECT_ROOT/backend/.env}"
SECRET_PROVIDER="${1:-}"

###############################################################################
# Helper Functions
###############################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

confirm() {
    if [ "$DRY_RUN" = "true" ]; then
        return 0
    fi

    read -p "$1 (y/N): " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

# Parse .env file and extract secrets
parse_env_file() {
    local env_file="$1"

    if [ ! -f "$env_file" ]; then
        log_error "Environment file not found: $env_file"
        exit 1
    fi

    # Read .env file, skip comments and empty lines
    grep -v '^#' "$env_file" | grep -v '^$' || true
}

# Determine secret name from environment variable name
get_secret_name() {
    local env_var="$1"

    # Convert ENV_VAR to env-var format
    echo "$env_var" | tr '[:upper:]' '[:lower:]' | sed 's/_/-/g'
}

###############################################################################
# Migration Functions
###############################################################################

migrate_to_aws() {
    log_info "Migrating secrets to AWS Secrets Manager..."

    if [ "$DRY_RUN" = "true" ]; then
        log_warning "DRY RUN: Would migrate secrets to AWS Secrets Manager"
    fi

    cd "$PROJECT_ROOT/backend" || exit 1

    # Build backend if not already built
    if [ ! -d "dist" ]; then
        log_info "Building backend..."
        npm run build
    fi

    # Parse .env file
    while IFS='=' read -r key value; do
        [ -z "$key" ] && continue

        # Remove quotes from value
        value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")

        # Determine secret name
        secret_name=$(get_secret_name "$key")

        if [ "$DRY_RUN" = "true" ]; then
            log_warning "DRY RUN: Would create secret: vibebox/$secret_name"
        else
            log_info "Creating secret: vibebox/$secret_name"

            # Use Node.js script to create secret
            node -e "
                const { getSecretManager, SecretManagerFactory } = require('./dist/lib/secrets');
                process.env.SECRET_PROVIDER = 'aws';
                (async () => {
                    const secretManager = await SecretManagerFactory.create();
                    await secretManager.set('$secret_name', '$value', {
                        description: 'Migrated from .env on $(date -u +"%Y-%m-%dT%H:%M:%SZ")',
                        tags: { 'migrated-from': 'env-file', 'environment': 'production' }
                    });
                    console.log('Created secret: $secret_name');
                })().catch(error => {
                    console.error('Failed to create secret:', error.message);
                    process.exit(1);
                });
            "
        fi
    done < <(parse_env_file "$ENV_FILE")

    log_success "Migration to AWS Secrets Manager completed"
}

migrate_to_gcp() {
    log_info "Migrating secrets to Google Cloud Secret Manager..."

    if [ "$DRY_RUN" = "true" ]; then
        log_warning "DRY RUN: Would migrate secrets to GCP Secret Manager"
    fi

    cd "$PROJECT_ROOT/backend" || exit 1

    if [ ! -d "dist" ]; then
        log_info "Building backend..."
        npm run build
    fi

    while IFS='=' read -r key value; do
        [ -z "$key" ] && continue

        value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
        secret_name=$(get_secret_name "$key")

        if [ "$DRY_RUN" = "true" ]; then
            log_warning "DRY RUN: Would create secret: vibebox-$secret_name"
        else
            log_info "Creating secret: vibebox-$secret_name"

            node -e "
                const { getSecretManager, SecretManagerFactory } = require('./dist/lib/secrets');
                process.env.SECRET_PROVIDER = 'gcp';
                (async () => {
                    const secretManager = await SecretManagerFactory.create();
                    await secretManager.set('$secret_name', '$value', {
                        description: 'Migrated from .env on $(date -u +"%Y-%m-%dT%H:%M:%SZ")',
                        tags: { 'migrated-from': 'env-file', 'environment': 'production' }
                    });
                    console.log('Created secret: $secret_name');
                })().catch(error => {
                    console.error('Failed to create secret:', error.message);
                    process.exit(1);
                });
            "
        fi
    done < <(parse_env_file "$ENV_FILE")

    log_success "Migration to GCP Secret Manager completed"
}

migrate_to_azure() {
    log_info "Migrating secrets to Azure Key Vault..."

    if [ "$DRY_RUN" = "true" ]; then
        log_warning "DRY RUN: Would migrate secrets to Azure Key Vault"
    fi

    cd "$PROJECT_ROOT/backend" || exit 1

    if [ ! -d "dist" ]; then
        log_info "Building backend..."
        npm run build
    fi

    while IFS='=' read -r key value; do
        [ -z "$key" ] && continue

        value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
        secret_name=$(get_secret_name "$key")

        if [ "$DRY_RUN" = "true" ]; then
            log_warning "DRY RUN: Would create secret: vibebox-$secret_name"
        else
            log_info "Creating secret: vibebox-$secret_name"

            node -e "
                const { getSecretManager, SecretManagerFactory } = require('./dist/lib/secrets');
                process.env.SECRET_PROVIDER = 'azure';
                (async () => {
                    const secretManager = await SecretManagerFactory.create();
                    await secretManager.set('$secret_name', '$value', {
                        description: 'Migrated from .env on $(date -u +"%Y-%m-%dT%H:%M:%SZ")',
                        tags: { 'migrated-from': 'env-file', 'environment': 'production' }
                    });
                    console.log('Created secret: $secret_name');
                })().catch(error => {
                    console.error('Failed to create secret:', error.message);
                    process.exit(1);
                });
            "
        fi
    done < <(parse_env_file "$ENV_FILE")

    log_success "Migration to Azure Key Vault completed"
}

migrate_to_vault() {
    log_info "Migrating secrets to HashiCorp Vault..."

    if [ "$DRY_RUN" = "true" ]; then
        log_warning "DRY RUN: Would migrate secrets to Vault"
    fi

    cd "$PROJECT_ROOT/backend" || exit 1

    if [ ! -d "dist" ]; then
        log_info "Building backend..."
        npm run build
    fi

    while IFS='=' read -r key value; do
        [ -z "$key" ] && continue

        value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
        secret_name=$(get_secret_name "$key")

        if [ "$DRY_RUN" = "true" ]; then
            log_warning "DRY RUN: Would create secret: vibebox/$secret_name"
        else
            log_info "Creating secret: vibebox/$secret_name"

            node -e "
                const { getSecretManager, SecretManagerFactory } = require('./dist/lib/secrets');
                process.env.SECRET_PROVIDER = 'vault';
                (async () => {
                    const secretManager = await SecretManagerFactory.create();
                    await secretManager.set('$secret_name', '$value', {
                        description: 'Migrated from .env on $(date -u +"%Y-%m-%dT%H:%M:%SZ")'
                    });
                    console.log('Created secret: $secret_name');
                })().catch(error => {
                    console.error('Failed to create secret:', error.message);
                    process.exit(1);
                });
            "
        fi
    done < <(parse_env_file "$ENV_FILE")

    log_success "Migration to HashiCorp Vault completed"
}

migrate_to_kubernetes() {
    log_info "Migrating secrets to Kubernetes..."

    if [ "$DRY_RUN" = "true" ]; then
        log_warning "DRY RUN: Would create Kubernetes secret: vibebox-secrets"
    fi

    cd "$PROJECT_ROOT/backend" || exit 1

    if [ ! -d "dist" ]; then
        log_info "Building backend..."
        npm run build
    fi

    while IFS='=' read -r key value; do
        [ -z "$key" ] && continue

        value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
        secret_name=$(get_secret_name "$key")

        if [ "$DRY_RUN" = "true" ]; then
            log_warning "DRY RUN: Would add key to secret: $secret_name"
        else
            log_info "Adding secret key: $secret_name"

            node -e "
                const { getSecretManager, SecretManagerFactory } = require('./dist/lib/secrets');
                process.env.SECRET_PROVIDER = 'k8s';
                (async () => {
                    const secretManager = await SecretManagerFactory.create();
                    await secretManager.set('$secret_name', '$value', {
                        description: 'Migrated from .env on $(date -u +"%Y-%m-%dT%H:%M:%SZ")'
                    });
                    console.log('Added secret key: $secret_name');
                })().catch(error => {
                    console.error('Failed to add secret key:', error.message);
                    process.exit(1);
                });
            "
        fi
    done < <(parse_env_file "$ENV_FILE")

    log_success "Migration to Kubernetes completed"
}

###############################################################################
# Validation Functions
###############################################################################

validate_migration() {
    log_info "Validating migrated secrets..."

    cd "$PROJECT_ROOT/backend" || exit 1

    node -e "
        const { getSecretManager } = require('./dist/lib/secrets');
        (async () => {
            const secretManager = await getSecretManager();
            const secrets = await secretManager.list();
            console.log('Total secrets migrated:', secrets.length);
            console.log('');
            console.log('Secret names:');
            for (const secret of secrets) {
                console.log('  -', secret.name);
            }
        })().catch(error => {
            console.error('Validation failed:', error.message);
            process.exit(1);
        });
    "

    log_success "Validation completed"
}

###############################################################################
# Rollback Functions
###############################################################################

create_backup() {
    log_info "Creating backup of .env file..."

    local backup_file="${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"

    if [ -f "$ENV_FILE" ]; then
        cp "$ENV_FILE" "$backup_file"
        log_success "Backup created: $backup_file"
    else
        log_warning "No .env file found to backup"
    fi
}

rollback_migration() {
    log_error "Migration rollback requested"

    if ! confirm "Delete all migrated secrets from secret manager?"; then
        log_info "Rollback cancelled"
        return 1
    fi

    cd "$PROJECT_ROOT/backend" || exit 1

    node -e "
        const { getSecretManager } = require('./dist/lib/secrets');
        (async () => {
            const secretManager = await getSecretManager();
            const secrets = await secretManager.list();

            for (const secret of secrets) {
                try {
                    await secretManager.delete(secret.name);
                    console.log('Deleted secret:', secret.name);
                } catch (error) {
                    console.error('Failed to delete secret:', secret.name, error.message);
                }
            }

            console.log('Rollback completed');
        })().catch(console.error);
    "

    log_success "Rollback completed"
}

###############################################################################
# Main Script
###############################################################################

show_usage() {
    cat << EOF
Usage: $0 [provider] [options]

Providers:
  aws        Migrate to AWS Secrets Manager
  gcp        Migrate to Google Cloud Secret Manager
  azure      Migrate to Azure Key Vault
  vault      Migrate to HashiCorp Vault
  k8s        Migrate to Kubernetes Secrets

Options:
  --dry-run           Perform a dry run (no changes)
  --env-file=PATH     Path to .env file (default: backend/.env)
  --validate          Validate migrated secrets
  --rollback          Rollback migration (delete all secrets)

Environment Variables:
  SECRET_PROVIDER     Target secret manager
  ENV_FILE           Path to .env file
  DRY_RUN            Set to "true" for dry run mode

Examples:
  $0 aws
  $0 gcp --env-file=.env.production
  $0 vault --dry-run
  $0 aws --validate
  $0 aws --rollback
EOF
}

main() {
    log_info "VibeBox Secrets Migration Script"
    log_info "================================="

    # Parse options
    VALIDATE=false
    ROLLBACK=false

    for arg in "$@"; do
        case $arg in
            --dry-run)
                DRY_RUN="true"
                ;;
            --env-file=*)
                ENV_FILE="${arg#*=}"
                ;;
            --validate)
                VALIDATE=true
                ;;
            --rollback)
                ROLLBACK=true
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
        esac
    done

    if [ "$DRY_RUN" = "true" ]; then
        log_warning "DRY RUN MODE - No changes will be made"
    fi

    # Handle validation
    if [ "$VALIDATE" = "true" ]; then
        validate_migration
        exit 0
    fi

    # Handle rollback
    if [ "$ROLLBACK" = "true" ]; then
        rollback_migration
        exit 0
    fi

    # Check provider specified
    if [ -z "$SECRET_PROVIDER" ]; then
        log_error "No secret provider specified"
        show_usage
        exit 1
    fi

    # Check if .env file exists
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file not found: $ENV_FILE"
        exit 1
    fi

    log_info "Environment file: $ENV_FILE"
    log_info "Target provider: $SECRET_PROVIDER"

    # Create backup
    if [ "$DRY_RUN" != "true" ]; then
        create_backup
    fi

    # Confirm migration
    if ! confirm "Proceed with migration to $SECRET_PROVIDER?"; then
        log_error "Migration cancelled"
        exit 1
    fi

    # Perform migration
    case "$SECRET_PROVIDER" in
        aws)
            migrate_to_aws
            ;;
        gcp)
            migrate_to_gcp
            ;;
        azure)
            migrate_to_azure
            ;;
        vault)
            migrate_to_vault
            ;;
        k8s|kubernetes)
            migrate_to_kubernetes
            ;;
        *)
            log_error "Unknown secret provider: $SECRET_PROVIDER"
            show_usage
            exit 1
            ;;
    esac

    # Validate migration
    if [ "$DRY_RUN" != "true" ]; then
        log_info ""
        validate_migration
    fi

    log_success "Migration completed successfully"
    log_warning "Next steps:"
    log_warning "1. Update your deployment configuration to use secret references"
    log_warning "2. Test your application with the new secrets"
    log_warning "3. Remove or secure your .env file"
}

main "$@"
