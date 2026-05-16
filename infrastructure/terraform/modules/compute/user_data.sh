#!/bin/bash
set -e

# GoWithSally EC2 Instance User Data Script
echo "Starting GoWithSally instance setup..."

# Update system
apt-get update
apt-get upgrade -y

# Install CloudWatch Agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
dpkg -i -E ./amazon-cloudwatch-agent.deb
rm amazon-cloudwatch-agent.deb

# Install Docker
apt-get install -y docker.io docker-compose

# Install AWS CLI
apt-get install -y awscli

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install Python and dependencies
apt-get install -y python3 python3-pip python3-venv

# Create application user
useradd -m -s /bin/bash gowithsally || true

# Add gowithsally to docker group
usermod -aG docker gowithsally

# Create application directories
mkdir -p /home/gowithsally/app
mkdir -p /var/log/gowithsally
mkdir -p /backups

chown -R gowithsally:gowithsally /home/gowithsally/app
chown -R gowithsally:gowithsally /var/log/gowithsally
chown -R gowithsally:gowithsally /backups

# Start Docker service
systemctl start docker
systemctl enable docker

# Create CloudWatch Agent configuration
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json <<'EOF'
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "cwagent"
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/syslog",
            "log_group_name": "/aws/ec2/${environment}/gowithsally",
            "log_stream_name": "{instance_id}-syslog"
          },
          {
            "file_path": "/var/log/gowithsally/*.log",
            "log_group_name": "/aws/ec2/${environment}/gowithsally",
            "log_stream_name": "{instance_id}-app"
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "GoWithSally/${environment}",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          {
            "name": "cpu_usage_idle",
            "rename": "CPU_IDLE",
            "unit": "Percent"
          },
          {
            "name": "cpu_usage_iowait",
            "rename": "CPU_IOWAIT",
            "unit": "Percent"
          },
          "cpu_time_guest"
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "*"
        ],
        "totalcpu": false
      },
      "disk": {
        "measurement": [
          {
            "name": "used_percent",
            "rename": "DISK_USED",
            "unit": "Percent"
          },
          {
            "name": "inodes_free",
            "rename": "DISK_INODES_FREE",
            "unit": "Count"
          }
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "*"
        ]
      },
      "mem": {
        "measurement": [
          {
            "name": "mem_used_percent",
            "rename": "MEM_USED",
            "unit": "Percent"
          }
        ],
        "metrics_collection_interval": 60
      },
      "netstat": {
        "measurement": [
          {
            "name": "tcp_established",
            "rename": "TCP_CONN",
            "unit": "Count"
          },
          {
            "name": "tcp_time_wait",
            "rename": "TCP_TIME_WAIT",
            "unit": "Count"
          }
        ],
        "metrics_collection_interval": 60
      }
    }
  }
}
EOF

# Start CloudWatch Agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

# Setup log rotation
cat > /etc/logrotate.d/gowithsally <<'EOF'
/var/log/gowithsally/*.log {
  daily
  rotate 7
  compress
  delaycompress
  notifempty
  create 0640 gowithsally gowithsally
  sharedscripts
  postrotate
    systemctl reload-or-restart docker > /dev/null 2>&1 || true
  endscript
}
EOF

# Create a simple health check script
cat > /usr/local/bin/health-check.sh <<'EOF'
#!/bin/bash
curl -f http://localhost:3000/health || exit 1
EOF

chmod +x /usr/local/bin/health-check.sh

# Setup cron for periodic tasks
crontab -u gowithsally - <<'EOF'
# Daily backups at 2 AM
0 2 * * * /home/gowithsally/app/backup.sh >> /var/log/gowithsally/backup.log 2>&1

# Cleanup old logs daily
0 3 * * * find /var/log/gowithsally -name "*.log" -mtime +30 -delete
EOF

echo "GoWithSally instance setup completed successfully"
