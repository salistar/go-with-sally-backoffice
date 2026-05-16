#!/bin/bash

###############################################################################
# GoWithSally Hetzner CX21 Server Initialization
# Sets up:
#   - 2GB swap memory
#   - Firewall configuration
#   - Docker and Docker Compose installation
#   - System hardening
#   - Logging setup
#
# Usage: sudo bash init-server.sh
#
# Prerequisites:
#   - Root access (sudo or ssh as root)
#   - Ubuntu 20.04 LTS or later
#   - Internet connection
#
# Logging:
#   All operations logged to /var/log/gowithsally-init.log
#
###############################################################################

set -euo pipefail

# Configuration
LOG_FILE="/var/log/gowithsally-init.log"
SWAP_SIZE="2G"
DOCKER_VERSION="latest"
COMPOSE_VERSION="v2.21.0"

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
# Validation Functions
###############################################################################

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        exit 1
    fi
    log_success "Root access verified"
}

check_os() {
    if [[ ! -f /etc/os-release ]]; then
        log_error "Cannot determine OS"
        exit 1
    fi

    . /etc/os-release

    if [[ "$ID" != "ubuntu" ]]; then
        log_warn "This script is optimized for Ubuntu, but found: $ID"
    fi

    log_success "OS detected: $PRETTY_NAME"
}

###############################################################################
# System Configuration Functions
###############################################################################

update_system() {
    log_info "Updating system packages..."

    apt-get update || {
        log_error "Failed to update package lists"
        return 1
    }

    apt-get upgrade -y || {
        log_error "Failed to upgrade packages"
        return 1
    }

    log_success "System packages updated"
}

setup_swap() {
    log_info "Setting up swap memory (${SWAP_SIZE})..."

    # Check if swap already exists
    if [[ -f /swapfile ]]; then
        log_warn "Swap file already exists, skipping setup"
        return 0
    fi

    # Create swap file
    fallocate -l "$SWAP_SIZE" /swapfile || {
        log_error "Failed to allocate swap space"
        return 1
    }

    # Set correct permissions
    chmod 600 /swapfile || {
        log_error "Failed to set swap permissions"
        return 1
    }

    # Format as swap
    mkswap /swapfile || {
        log_error "Failed to format swap"
        return 1
    }

    # Enable swap
    swapon /swapfile || {
        log_error "Failed to enable swap"
        return 1
    }

    # Add to fstab for persistence
    if ! grep -q "/swapfile" /etc/fstab; then
        echo "/swapfile none swap sw 0 0" >> /etc/fstab || {
            log_error "Failed to add swap to fstab"
            return 1
        }
    fi

    # Set swappiness
    sysctl vm.swappiness=20 || true
    echo "vm.swappiness=20" >> /etc/sysctl.conf || true

    log_success "Swap setup completed ($(free -h | grep Swap | awk '{print $2}'))"
}

setup_firewall() {
    log_info "Configuring firewall..."

    # Install ufw if not present
    if ! command -v ufw &> /dev/null; then
        apt-get install -y ufw || {
            log_error "Failed to install ufw"
            return 1
        }
    fi

    # Enable firewall
    ufw --force enable || {
        log_error "Failed to enable firewall"
        return 1
    }

    # Allow SSH
    ufw allow 22/tcp || {
        log_warn "Failed to allow SSH"
    }

    # Allow HTTP
    ufw allow 80/tcp || {
        log_warn "Failed to allow HTTP"
    }

    # Allow HTTPS
    ufw allow 443/tcp || {
        log_warn "Failed to allow HTTPS"
    }

    # Application ports
    # Backend API
    ufw allow 3000/tcp || {
        log_warn "Failed to allow backend port"
    }

    # Face API
    ufw allow 5000/tcp || {
        log_warn "Failed to allow face API port"
    }

    # Docker (internal)
    ufw allow from 172.16.0.0/12 || true

    log_success "Firewall configured"
    ufw status || true
}

install_docker() {
    log_info "Installing Docker..."

    # Check if Docker is already installed
    if command -v docker &> /dev/null; then
        log_warn "Docker is already installed: $(docker --version)"
        return 0
    fi

    # Install required packages
    apt-get install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release || {
        log_error "Failed to install prerequisites"
        return 1
    }

    # Add Docker GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg || {
        log_error "Failed to add Docker GPG key"
        return 1
    }

    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
        https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
        tee /etc/apt/sources.list.d/docker.list > /dev/null || {
        log_error "Failed to add Docker repository"
        return 1
    }

    # Update and install Docker
    apt-get update || {
        log_error "Failed to update package lists"
        return 1
    }

    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin || {
        log_error "Failed to install Docker"
        return 1
    }

    log_success "Docker installed: $(docker --version)"
}

install_docker_compose() {
    log_info "Installing Docker Compose..."

    # Docker Compose is now part of docker-compose-plugin
    log_success "Docker Compose is included in Docker installation"
}

configure_docker() {
    log_info "Configuring Docker..."

    # Start Docker service
    systemctl enable docker || {
        log_warn "Failed to enable Docker service"
    }

    systemctl start docker || {
        log_warn "Failed to start Docker service"
    }

    # Create docker group and add users
    groupadd docker || true
    usermod -aG docker "$SUDO_USER" || {
        log_warn "Failed to add user to docker group"
    }

    # Configure Docker daemon
    mkdir -p /etc/docker

    cat > /etc/docker/daemon.json <<'EOF'
{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    },
    "storage-driver": "overlay2",
    "live-restore": true,
    "userland-proxy": false,
    "default-ulimits": {
        "nofile": {
            "Name": "nofile",
            "Hard": 65535,
            "Soft": 65535
        }
    }
}
EOF

    systemctl daemon-reload || true
    systemctl restart docker || {
        log_warn "Failed to restart Docker"
    }

    log_success "Docker configured"
}

setup_git() {
    log_info "Setting up Git..."

    if ! command -v git &> /dev/null; then
        apt-get install -y git || {
            log_error "Failed to install Git"
            return 1
        }
    fi

    log_success "Git installed: $(git --version)"
}

setup_monitoring() {
    log_info "Setting up monitoring..."

    # Install htop for system monitoring
    apt-get install -y htop || {
        log_warn "Failed to install htop"
    }

    # Install tree for file navigation
    apt-get install -y tree || {
        log_warn "Failed to install tree"
    }

    # Create log directory structure
    mkdir -p /var/log/gowithsally/{backend,faceapi,nginx}
    chmod 755 /var/log/gowithsally

    log_success "Monitoring tools installed"
}

setup_security() {
    log_info "Applying security hardening..."

    # Update SSH configuration
    sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config || true
    sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config || true

    # Restart SSH
    systemctl restart ssh || {
        log_warn "Failed to restart SSH"
    }

    # Update system limits
    cat >> /etc/security/limits.conf <<'EOF'
*       soft    nofile  65535
*       hard    nofile  65535
*       soft    nproc   65535
*       hard    nproc   65535
EOF

    log_success "Security hardening applied"
}

setup_cron_tasks() {
    log_info "Setting up cron tasks..."

    # Create logs backup script
    cat > /usr/local/bin/backup-logs.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/backups/logs"
mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_DIR/logs_$(date +%Y%m%d_%H%M%S).tar.gz" /var/log/gowithsally/
find "$BACKUP_DIR" -mtime +30 -delete
echo "[$(date)] Logs backed up" >> /var/log/gowithsally-backup.log
EOF

    chmod +x /usr/local/bin/backup-logs.sh

    # Add cron job for daily log backup
    (crontab -l 2>/dev/null | grep -v backup-logs.sh || true; echo "0 2 * * * /usr/local/bin/backup-logs.sh") | crontab - || {
        log_warn "Failed to setup cron job"
    }

    log_success "Cron tasks configured"
}

print_summary() {
    log_info "=========================================="
    log_success "Server initialization completed"
    log_info "=========================================="
    log_info ""
    log_info "Summary of changes:"
    log_info "  - Swap memory: $(free -h | grep Swap | awk '{print $2}')"
    log_info "  - Docker: $(docker --version)"
    log_info "  - Firewall: Enabled (UFW)"
    log_info "  - SSH: Hardened (key-based auth)"
    log_info "  - Monitoring: htop, tree installed"
    log_info ""
    log_info "Next steps:"
    log_info "  1. Clone GoWithSally repository"
    log_info "  2. Configure .env file"
    log_info "  3. Run deploy/deploy.sh"
    log_info ""
    log_info "Logs: $LOG_FILE"
    log_info "=========================================="
}

###############################################################################
# Main Execution
###############################################################################

main() {
    log_info "=========================================="
    log_info "GoWithSally Hetzner CX21 Initialization"
    log_info "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
    log_info "=========================================="

    check_root
    check_os

    update_system || exit 1
    setup_swap || exit 1
    setup_firewall || exit 1
    install_docker || exit 1
    install_docker_compose || exit 1
    configure_docker || exit 1
    setup_git || exit 1
    setup_monitoring || exit 1
    setup_security || exit 1
    setup_cron_tasks || exit 1

    print_summary
}

# Handle errors
trap 'log_error "Script failed at line $LINENO"; exit 1' ERR

# Run main function
main
