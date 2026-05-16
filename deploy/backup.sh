#!/bin/bash

###############################################################################
# GoWithSally MongoDB Backup Script
# Creates compressed MongoDB backups with logging and retention policy
#
# Usage: ./deploy/backup.sh [output_path]
#
# Default output path: /backups/gowithsally/mongodb_backup_$(date +%Y%m%d_%H%M%S).tar.gz
#
# Logging:
#   All operations logged to /var/log/gowithsally-backup.log
#
# Features:
#   - Automatic compression
#   - Retention policy (30 days)
#   - Database integrity verification
#   - Email notifications (if configured)
#
###############################################################################

set -euo pipefail

# Configuration
BACKUP_DIR="${1:- /backups/gowithsally}"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_FILE="${BACKUP_DIR}/mongodb_backup_${TIMESTAMP}.tar.gz"
LOG_FILE="/var/log/gowithsally-backup.log"
RETENTION_DAYS=30
MONGODB_CONTAINER="gowithsally-mongodb"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

###############################################################################
# Logging Functions
###############################################################################

log() {
    local level=$1
    shift
    local message="$@"
    local log_timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$log_timestamp] [$level] $message" | tee -a "$LOG_FILE"
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
# Validation Functions
###############################################################################

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

    # Check mongodump or docker-compose
    if ! command -v mongodump &> /dev/null && ! docker exec "$MONGODB_CONTAINER" mongodump --version &>/dev/null 2>&1; then
        log_warn "mongodump not found locally or in MongoDB container"
    fi

    if [[ $missing -gt 0 ]]; then
        log_error "$missing prerequisite(s) missing"
        return 1
    fi

    return 0
}

verify_mongodb_connection() {
    log_info "Verifying MongoDB connection..."

    if ! docker exec "$MONGODB_CONTAINER" mongosh --eval "db.adminCommand('ping')" --quiet &>/dev/null; then
        log_error "MongoDB connection failed"
        return 1
    fi

    log_success "MongoDB connection verified"
    return 0
}

###############################################################################
# Backup Functions
###############################################################################

create_backup_directory() {
    log_info "Creating backup directory: $BACKUP_DIR"

    mkdir -p "$BACKUP_DIR" || {
        log_error "Failed to create backup directory"
        return 1
    }

    chmod 700 "$BACKUP_DIR"
    log_success "Backup directory ready"
}

backup_mongodb() {
    log_info "Starting MongoDB backup..."

    local temp_backup_dir="/tmp/mongodb_backup_${TIMESTAMP}"
    mkdir -p "$temp_backup_dir"

    log_info "Dumping MongoDB databases to $temp_backup_dir..."

    # Use mongodump through docker exec
    docker exec "$MONGODB_CONTAINER" mongodump \
        --uri="mongodb://localhost:27017" \
        --out="$temp_backup_dir" \
        --quiet \
        2>&1 | while read line; do
            log_info "mongodump: $line"
        done || {
        log_error "MongoDB dump failed"
        rm -rf "$temp_backup_dir"
        return 1
    }

    # Check if dump was successful
    if [[ ! -d "$temp_backup_dir" ]] || [[ -z "$(ls -A "$temp_backup_dir")" ]]; then
        log_error "MongoDB dump produced no data"
        rm -rf "$temp_backup_dir"
        return 1
    fi

    # Compress backup
    log_info "Compressing backup to $BACKUP_FILE..."

    tar -czf "$BACKUP_FILE" -C /tmp "mongodb_backup_${TIMESTAMP}" 2>&1 | head -20 || {
        log_error "Backup compression failed"
        rm -rf "$temp_backup_dir"
        return 1
    }

    # Verify compressed backup
    if [[ ! -f "$BACKUP_FILE" ]]; then
        log_error "Backup file not created"
        rm -rf "$temp_backup_dir"
        return 1
    fi

    local backup_size=$(du -h "$BACKUP_FILE" | cut -f1)
    log_success "Backup created successfully: $BACKUP_FILE ($backup_size)"

    # Cleanup temp directory
    rm -rf "$temp_backup_dir"

    return 0
}

verify_backup() {
    log_info "Verifying backup integrity..."

    if ! tar -tzf "$BACKUP_FILE" > /dev/null 2>&1; then
        log_error "Backup verification failed - corrupted tar file"
        rm -f "$BACKUP_FILE"
        return 1
    fi

    log_success "Backup verification passed"
    return 0
}

cleanup_old_backups() {
    log_info "Cleaning up backups older than $RETENTION_DAYS days..."

    local count=$(find "$BACKUP_DIR" -name "mongodb_backup_*.tar.gz" -mtime +$RETENTION_DAYS -type f | wc -l)

    if [[ $count -gt 0 ]]; then
        find "$BACKUP_DIR" -name "mongodb_backup_*.tar.gz" -mtime +$RETENTION_DAYS -type f -delete || {
            log_warn "Failed to delete some old backups"
            return 1
        }
        log_success "Deleted $count old backup file(s)"
    else
        log_info "No backups older than $RETENTION_DAYS days found"
    fi

    return 0
}

generate_backup_report() {
    log_info "Generating backup report..."

    cat >> "$LOG_FILE" <<EOF

========================================
Backup Report
========================================
Timestamp: $(date '+%Y-%m-%d %H:%M:%S')
Backup File: $BACKUP_FILE
Backup Size: $(du -h "$BACKUP_FILE" | cut -f1)
Location: $BACKUP_DIR

Recent Backups:
$(ls -lh "$BACKUP_DIR"/mongodb_backup_*.tar.gz 2>/dev/null | tail -5)

Backup Directory Usage:
$(du -sh "$BACKUP_DIR")

Storage Location:
$(df -h "$BACKUP_DIR" | tail -1)

========================================
EOF

    log_success "Backup report generated"
}

###############################################################################
# Main Execution
###############################################################################

main() {
    log_info "=========================================="
    log_info "GoWithSally MongoDB Backup"
    log_info "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
    log_info "=========================================="

    check_prerequisites || exit 1
    verify_mongodb_connection || exit 1
    create_backup_directory || exit 1
    backup_mongodb || exit 1
    verify_backup || exit 1
    cleanup_old_backups || true

    generate_backup_report

    log_success "=========================================="
    log_success "Backup completed successfully"
    log_success "File: $BACKUP_FILE"
    log_success "=========================================="
}

# Handle errors
trap 'log_error "Backup failed at line $LINENO"; exit 1' ERR

# Run main function
main "$@"
