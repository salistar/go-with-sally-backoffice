# Production Environment Configuration

environment = "production"
aws_region  = "us-east-1"

# Networking
vpc_cidr             = "10.2.0.0/16"
availability_zones   = ["us-east-1a", "us-east-1b", "us-east-1c"]
public_subnet_cidrs  = ["10.2.1.0/24", "10.2.2.0/24", "10.2.3.0/24"]
private_subnet_cidrs = ["10.2.11.0/24", "10.2.12.0/24", "10.2.13.0/24"]

# Compute
instance_type = "t3.large"
key_pair_name = "gowithsally-prod"

# Database
db_engine_version   = "4.0.0"
db_instance_class   = "db.r6g.large"
db_master_username  = "admin"
# db_master_password is set via environment variable or secrets file (MUST BE STRONG)
backup_retention_days = 30

# Redis
redis_node_type = "cache.r6g.large"

# Storage
s3_bucket_prefix      = "gowithsally-prod"
enable_s3_versioning  = true
enable_s3_encryption  = true

# Monitoring & Logging
log_retention_days = 90
alert_email_address = "alerts@gowithsally.ma"

# Features
enable_nat_gateway        = true
enable_cloudtrail         = true
enable_vpc_flow_logs      = true
enable_enhanced_monitoring = true
enable_multi_az           = true
enable_bastion_host       = true

# Security
allowed_ssh_cidrs = ["10.2.0.0/16"] # VPC only, accessed via bastion

# Tagging
project_name  = "GoWithSally"
cost_center   = "operations"
owner_email   = "ops@gowithsally.ma"

# Auto Scaling (uses defaults from variable)
# min_size = 3, max_size = 10, desired_capacity = 3
