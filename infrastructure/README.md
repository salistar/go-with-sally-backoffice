# GoWithSally Infrastructure Automation

This directory contains comprehensive infrastructure automation scripts using Ansible and Terraform for deploying and managing the GoWithSally application.

## Directory Structure

```
infrastructure/
├── ansible/
│   ├── inventory/
│   │   └── hosts.yml                    # Ansible inventory configuration
│   ├── playbooks/
│   │   ├── setup-server.yml             # Server setup and configuration
│   │   ├── deploy.yml                   # Application deployment
│   │   ├── setup-monitoring.yml         # Monitoring stack setup
│   │   └── backup.yml                   # Database and file backups
│   └── roles/
│       ├── docker/tasks/main.yml        # Docker installation and configuration
│       ├── nginx/tasks/main.yml         # Nginx setup and reverse proxy
│       └── app/tasks/main.yml           # Application deployment
└── terraform/
    ├── main.tf                          # Main infrastructure configuration
    ├── variables.tf                     # Variable definitions
    ├── outputs.tf                       # Output definitions
    ├── modules/
    │   ├── networking/main.tf           # VPC, subnets, security groups
    │   ├── compute/main.tf              # EC2, ASG, ALB
    │   ├── database/main.tf             # DocumentDB, Redis
    │   └── storage/main.tf              # S3, EFS, backups
    └── environments/
        ├── dev.tfvars                   # Development environment config
        ├── staging.tfvars               # Staging environment config
        └── prod.tfvars                  # Production environment config
```

## Quick Start

### Prerequisites

- Ansible 2.9+ installed
- Terraform 1.0+ installed
- AWS CLI configured with appropriate credentials
- SSH access to target servers

### Terraform Deployment

1. **Initialize Terraform:**
```bash
cd terraform
terraform init
```

2. **Select environment and plan:**
```bash
# For development
terraform plan -var-file="environments/dev.tfvars"

# For staging
terraform plan -var-file="environments/staging.tfvars"

# For production
terraform plan -var-file="environments/prod.tfvars"
```

3. **Apply infrastructure:**
```bash
terraform apply -var-file="environments/dev.tfvars"
```

### Ansible Deployment

1. **Update inventory:**
Edit `ansible/inventory/hosts.yml` with your server addresses and credentials.

2. **Run server setup playbook:**
```bash
cd ansible
ansible-playbook -i inventory/hosts.yml playbooks/setup-server.yml -u deploy --ask-become-pass
```

3. **Deploy application:**
```bash
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml -u deploy --ask-become-pass
```

4. **Setup monitoring:**
```bash
ansible-playbook -i inventory/hosts.yml playbooks/setup-monitoring.yml -u deploy --ask-become-pass
```

## Ansible Playbooks

### setup-server.yml
Configures base server infrastructure:
- System package updates
- Docker and Docker Compose installation
- Node.js installation
- Nginx installation
- Python setup
- Application user creation
- SSH key configuration
- Firewall (UFW) setup
- Fail2Ban configuration
- System monitoring tools (Node Exporter)

### deploy.yml
Deploys the GoWithSally application with zero-downtime:
- Git repository clone/update
- Docker image building
- Database migrations
- Container deployment
- Health checks
- Automatic rollback on failure
- Deployment logging

**Usage:**
```bash
ansible-playbook playbooks/deploy.yml -e "deploy_target=staging git_branch=main"
```

### setup-monitoring.yml
Installs complete monitoring and logging stack:
- Prometheus time-series database
- Grafana dashboards
- Alertmanager for alerts
- ELK Stack (Elasticsearch, Logstash, Kibana)
- CloudWatch integration
- Backup automation

### backup.yml
Manages database and file backups:
- MongoDB backups to local/S3
- Redis snapshots
- Application logs archival
- Elasticsearch snapshots
- Backup retention policies
- S3 upload with encryption

**Usage:**
```bash
ansible-playbook playbooks/backup.yml -e "backup_target=production"
```

## Ansible Roles

### docker
Ensures Docker and Docker Compose are installed, configured, and running.

### nginx
Configures Nginx as reverse proxy with:
- SSL/TLS termination
- Rate limiting
- Gzip compression
- Health checks
- Auto-renewal of certificates

### app
Handles application deployment:
- Repository cloning
- Environment configuration
- PM2 process management
- Health check scripts
- Systemd service setup

## Terraform Modules

### networking
Creates VPC infrastructure:
- VPC with configurable CIDR
- Public and private subnets across multiple AZs
- Internet Gateway
- NAT Gateways
- Route tables
- Security groups for ALB, EC2, RDS, Redis, EFS

### compute
Manages application servers:
- Application Load Balancer (ALB) with HTTPS
- EC2 launch template with custom user data
- Auto Scaling Group with dynamic scaling
- CloudWatch alarms for CPU utilization
- Auto-scaling policies

### database
Sets up data stores:
- DocumentDB cluster (MongoDB-compatible)
- ElastiCache Redis cluster
- Automated backups
- Encryption at rest
- CloudWatch monitoring
- Parameter groups

### storage
Manages storage services:
- S3 bucket with versioning and encryption
- S3 lifecycle policies (archive to Glacier)
- S3 access logging
- EFS for shared file storage
- AWS Backup for disaster recovery
- Encryption with KMS

## Environment Variables & Secrets

### Terraform Variables

Create a `terraform.tfvars` file (not committed to git):

```hcl
aws_region            = "us-east-1"
environment           = "production"
key_pair_name         = "your-keypair"
db_master_username    = "admin"
db_master_password    = "YOUR-STRONG-PASSWORD"
jwt_secret            = "YOUR-JWT-SECRET"
sendgrid_api_key      = "YOUR-SENDGRID-KEY"
stripe_public_key     = "YOUR-STRIPE-PUBLIC"
stripe_secret_key     = "YOUR-STRIPE-SECRET"
twilio_account_sid    = "YOUR-TWILIO-SID"
twilio_auth_token     = "YOUR-TWILIO-TOKEN"
alert_email_address   = "alerts@gowithsally.ma"
```

### Ansible Vault

Encrypt sensitive variables:

```bash
# Create encrypted vault file
ansible-vault create inventory/group_vars/all/vault.yml

# Edit vault file
ansible-vault edit inventory/group_vars/all/vault.yml

# Use vault when running playbooks
ansible-playbook playbooks/deploy.yml --ask-vault-pass
```

## Scaling Configuration

Auto-scaling is configured per environment in `environments/*.tfvars`:

- **Development**: 1-2 instances
- **Staging**: 2-4 instances
- **Production**: 3-10 instances

Scaling triggers:
- CPU > 70% = scale up
- CPU < 30% = scale down
- Cooldown: 5 minutes

## Monitoring & Alerts

### CloudWatch
- Application logs: `/aws/ecs/{environment}/gowithsally-app`
- Infrastructure logs: `/aws/ec2/{environment}/gowithsally`
- Alarms for ALB health, target response time, ASG CPU

### Prometheus
- Access: `http://<server>:9090`
- Metrics scrape interval: 15s
- Data retention: 30 days

### Grafana
- Access: `http://<server>:3000` (default: admin/admin)
- Pre-configured Prometheus datasource
- Custom dashboards for GoWithSally

### ELK Stack
- Elasticsearch: Port 9200
- Kibana: `http://<server>:5601`
- Logstash: Port 5000

## Backup Strategy

### Automated Backups

**MongoDB**: Daily at 2 AM UTC
- Retention: 30 days (production), 7 days (staging)
- Location: S3 + local `/backups`

**Redis**: Daily snapshots
- Retention: 7 days
- Compression: gzip

**Logs**: Daily archival
- Retention: 14 days (staging), 90 days (production)
- Format: tar.gz

**Elasticsearch**: Daily snapshots
- Retention: 30 days

### Manual Backup

```bash
ansible-playbook playbooks/backup.yml -e "backup_target=production local_backup_only=false"
```

## Security

### IAM Roles
- EC2 instances: S3 access, CloudWatch Logs, Secrets Manager
- Database: Encrypted backups, automated snapshots
- S3: Public access blocked, SSL enforced

### Encryption
- S3: AES256 or KMS
- EBS volumes: Encrypted
- RDS/DocumentDB: Encrypted at rest
- ElastiCache Redis: Encryption in transit and at rest

### Networking
- ALB: HTTPS only (HTTP redirects to HTTPS)
- Security groups: Least privilege access
- VPC: Private subnets for databases
- NAT Gateway: Egress for private instances

### SSH Hardening
- Key-based auth only
- Root login disabled
- SSH banner configured
- Fail2Ban: Auto-ban after 3 failed attempts

## Disaster Recovery

### Backup Locations
- S3 with versioning enabled
- Cross-region replication available
- EFS point-in-time recovery
- DocumentDB automated backups (35 days max)

### Recovery Procedures
1. **Application Recovery**: Redeploy from `deploy.yml`
2. **Database Recovery**: Restore from DocumentDB snapshots
3. **File Recovery**: Mount EFS from backup snapshot
4. **Full Infrastructure**: `terraform apply` to recreate

### RTO & RPO
- **Development**: 24 hours RTO, 24 hours RPO
- **Staging**: 4 hours RTO, 4 hours RPO
- **Production**: 1 hour RTO, 1 hour RPO

## Maintenance

### Updates
```bash
# Patch OS
ansible-playbook playbooks/setup-server.yml --tags "os-updates"

# Update Docker images
ansible-playbook playbooks/deploy.yml -e "deploy_target=staging"

# Update monitoring stack
ansible-playbook playbooks/setup-monitoring.yml
```

### Scaling
```bash
# Increase production capacity
terraform apply -var-file=environments/prod.tfvars \
  -var="desired_capacity=5" -var="max_size=15"
```

## Troubleshooting

### Terraform Issues
```bash
# Validate configuration
terraform validate

# Format code
terraform fmt -recursive

# Show resource state
terraform show

# Plan with detailed output
terraform plan -var-file=environments/prod.tfvars -json | jq
```

### Ansible Issues
```bash
# Dry run (no changes)
ansible-playbook playbooks/deploy.yml --check

# Verbose output
ansible-playbook playbooks/deploy.yml -vvv

# Specific task
ansible-playbook playbooks/deploy.yml --tags "docker-build"

# Syntax check
ansible-playbook --syntax-check playbooks/deploy.yml
```

### Logs
```bash
# Application logs
ssh deploy@<server> tail -f /var/log/gowithsally/*.log

# Docker logs
docker logs gowithsally-app

# Ansible logs
export ANSIBLE_LOG_PATH=ansible.log

# Terraform logs
export TF_LOG=DEBUG
```

## CI/CD Integration

### GitLab CI Example
```yaml
deploy:
  stage: deploy
  script:
    - ansible-playbook infrastructure/ansible/playbooks/deploy.yml
      -e "deploy_target=$ENVIRONMENT" --vault-password-file=$VAULT_FILE
  only:
    - main
```

### GitHub Actions Example
```yaml
- name: Deploy Application
  run: |
    ansible-playbook infrastructure/ansible/playbooks/deploy.yml \
      -e "deploy_target=${{ env.ENVIRONMENT }}"
```

## Best Practices

1. **Always test in non-prod first**: Use dev/staging environments
2. **Use version control**: Tag production deployments
3. **Audit logs**: Enable CloudTrail for compliance
4. **Secrets management**: Use AWS Secrets Manager or Ansible Vault
5. **Cost optimization**: Review CloudWatch metrics regularly
6. **Documentation**: Keep runbooks updated
7. **Regular backups**: Test restore procedures
8. **Change management**: Document all infrastructure changes

## Support & Troubleshooting

For issues or questions:
1. Check logs in `/var/log/gowithsally/` on target servers
2. Review CloudWatch logs for application errors
3. Check Prometheus/Grafana for metrics
4. Review Ansible inventory and variables
5. Validate Terraform configuration with `terraform validate`

## License

These infrastructure scripts are part of the GoWithSally project.
