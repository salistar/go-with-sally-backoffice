#!/bin/bash

###############################################################################
# GoWithSally Production Deployment Script
# Deploys to Hetzner CX21 with health checks and rollback capability
#
# Usage: ./deploy/deploy.sh [--no-health-check] [--skip-backup]
#
# Environment variables:
#   DEPLOY_ENV: staging or production (default: production)
#   DOCKER_REGISTRY: Docker registry URL
#   SLACK_WEBHOOK: Optional Slack webhook for notifications
#
# Logging:
#   All operations logged to /var/log/gowithsally-deploy.log
#
###############################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/var/log/gowithsally-deploy.log"
BACKUP_DIR="/backups/gowithsally"
DEPLOY_ENV="${DEPLOY_ENV:-production}"
DOCKER_COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.prod.yml"
HEALTH_CHECK_TIMEOUT=300
HEALTH_CHECK_INTERVAL=10
MAX_RETRIES=3
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Flags
SKIP_HEALTH_CHECK=false
SKIP_BACKUP=false

###############################################################################
# Logging Functions
###############################################################################

log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $@" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $@" | tee -a "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $@" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $@" | tee -a "$LOG_FILE"
}

###############################################################################
# Helper Functions
###############################################################################

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --no-health-check)
                SKIP_HEALTH_CHECK=true
                shift
                ;;
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    local missing=0

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        missing=$((missing + 1))
    else
        log_success "Docker found: $(docker --version)"
    fi

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        missing=$((missing + 1))
    else
        log_success "Docker Compose found: $(docker-compose --version)"
    fi

    # Check .env file
    if [[ ! -f "$PROJECT_ROOT/.env" ]]; then
        log_error ".env file not found at $PROJECT_ROOT/.env"
        missing=$((missing + 1))
    else
        log_success ".env file exists"
    fi

    if [[ $missing -gt 0 ]]; then
        log_error "$missing prerequisite(s) missing"
        exit 1
    fi
}

backup_database() {
    if [[ "$SKIP_BACKUP" == true ]]; then
        log_warn "Skipping database backup (--skip-backup flag set)"
        return 0
    fi

    log_info "Creating database backup..."

    mkdir -p "$BACKUP_DIR"
    local backup_file="$BACKUP_DIR/mongodb_backup_$(date '+%Y%m%d_%H%M%S').tar.gz"

    # Run backup script
    if [[ -f "$SCRIPT_DIR/backup.sh" ]]; then
        bash "$SCRIPT_DIR/backup.sh" "$backup_file" || {
            log_error "Database backup failed"
            return 1
        }
        log_success "Database backed up to: $backup_file"
    else
        log_warn "Backup script not found at $SCRIPT_DIR/backup.sh"
    fi
}

pull_latest_code() {
    log_info "Pulling latest code from repository..."

    cd "$PROJECT_ROOT"
    git fetch origin || {
        log_error "Failed to fetch from remote"
        return 1
    }

    git pull origin main || {
        log_error "Failed to pull from main branch"
        return 1
    }

    local current_commit=$(git rev-parse --short HEAD)
    log_success "Code pulled successfully (commit: $current_commit)"
}

build_images() {
    log_info "Building Docker images..."

    cd "$PROJECT_ROOT"

    # Build specific services
    docker-compose -f "$DOCKER_COMPOSE_FILE" build backend faceapi || {
        log_error "Docker build failed"
        return 1
    }

    log_success "Docker images built successfully"
}

deploy_containers() {
    log_info "Deploying containers..."

    cd "$PROJECT_ROOT"

    # Stop running containers (keep volumes)
    log_info "Stopping existing containers..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" down --remove-orphans || true

    # Start new containers
    log_info "Starting new containers..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d || {
        log_error "Failed to start containers"
        return 1
    }

    log_success "Containers deployed successfully"
}

health_check() {
    if [[ "$SKIP_HEALTH_CHECK" == true ]]; then
        log_warn "Skipping health check (--no-health-check flag set)"
        return 0
    fi

    log_info "Running health checks (timeout: ${HEALTH_CHECK_TIMEOUT}s)..."

    local elapsed=0
    local backend_healthy=false
    local faceapi_healthy=false

    while [[ $elapsed -lt $HEALTH_CHECK_TIMEOUT ]]; do
        # Check backend health
        if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
            backend_healthy=true
            log_success "Backend health check passed"
        fi

        # Check face API health
        if curl -sf http://localhost:5000/health > /dev/null 2>&1; then
            faceapi_healthy=true
            log_success "Face API health check passed"
        fi

        if [[ "$backend_healthy" == true && "$faceapi_healthy" == true ]]; then
            log_success "All health checks passed"
            return 0
        fi

        sleep $HEALTH_CHECK_INTERVAL
        elapsed=$((elapsed + HEALTH_CHECK_INTERVAL))
        log_info "Health check in progress... (${elapsed}s/${HEALTH_CHECK_TIMEOUT}s)"
    done

    log_error "Health checks failed after ${HEALTH_CHECK_TIMEOUT}s"
    log_error "Backend healthy: $backend_healthy, Face API healthy: $faceapi_healthy"
    return 1
}

cleanup_old_images() {
    log_info "Cleaning up old Docker images..."

    docker image prune -af --filter "until=72h" || {
        log_warn "Failed to prune old images"
        return 0
    }

    log_success "Old images cleaned up"
}

send_notification() {
    local status=$1
    local message=$2

    if [[ -z "${SLACK_WEBHOOK:-}" ]]; then
        return 0
    fi

    local color="good"
    [[ "$status" == "error" ]] && color="danger"

    local payload=$(cat <<EOF
{
    "attachments": [
        {
            "color": "$color",
            "title": "GoWithSally Deployment - $DEPLOY_ENV",
            "text": "$message",
            "fields": [
                {
                    "title": "Timestamp",
                    "value": "$TIMESTAMP",
                    "short": true
                },
                {
                    "title": "Environment",
                    "value": "$DEPLOY_ENV",
                    "short": true
                }
            ]
        }
    ]
}
EOF
)

    curl -X POST -H 'Content-type: application/json' \
        --data "$payload" \
        "$SLACK_WEBHOOK" || true
}

rollback() {
    log_error "Deployment failed, attempting rollback..."

    cd "$PROJECT_ROOT"
    docker-compose -f "$DOCKER_COMPOSE_FILE" down --remove-orphans || true

    log_info "Rolling back to previous version..."
    git reset --hard HEAD~1 || {
        log_error "Rollback failed - manual intervention required"
        return 1
    }

    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d || {
        log_error "Failed to restore previous version"
        return 1
    }

    log_warn "Rollback completed"
}

###############################################################################
# Main Deployment Flow
###############################################################################

main() {
    parse_arguments "$@"

    log_info "=========================================="
    log_info "GoWithSally Deployment Started"
    log_info "Environment: $DEPLOY_ENV"
    log_info "Timestamp: $TIMESTAMP"
    log_info "=========================================="

    # Check prerequisites
    check_prerequisites || {
        log_error "Prerequisites check failed"
        send_notification "error" "Prerequisites check failed"
        exit 1
    }

    # Backup database
    backup_database || {
        log_error "Backup failed"
        send_notification "error" "Database backup failed"
        exit 1
    }

    # Pull latest code
    pull_latest_code || {
        log_error "Code pull failed"
        send_notification "error" "Failed to pull latest code"
        exit 1
    }

    # Build Docker images
    build_images || {
        log_error "Docker build failed"
        send_notification "error" "Docker build failed"
        rollback || true
        exit 1
    }

    # Deploy containers
    deploy_containers || {
        log_error "Container deployment failed"
        send_notification "error" "Container deployment failed"
        rollback || true
        exit 1
    }

    # Run health checks
    health_check || {
        log_error "Health checks failed"
        send_notification "error" "Health checks failed"
        rollback || true
        exit 1
    }

    # Cleanup
    cleanup_old_images || true

    log_success "=========================================="
    log_success "Deployment completed successfully"
    log_success "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
    log_success "=========================================="

    send_notification "success" "Deployment completed successfully to $DEPLOY_ENV"
}

# Handle errors
trap 'log_error "Script failed at line $LINENO"; exit 1' ERR

# Run main function
main "$@"
