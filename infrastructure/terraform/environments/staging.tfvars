# Staging Environment Configuration

environment = "staging"
aws_region  = "us-east-1"

# Networking
vpc_cidr             = "10.1.0.0/16"
availability_zones   = ["us-east-1a", "us-east-1b", "us-east-1c"]
public_subnet_cidrs  = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
private_subnet_cidrs = ["10.1.11.0/24", "10.1.12.0/24", "10.1.13.0/24"]

# Compute
instance_type = "t3.medium"
key_pair_name = "gowithsally-staging"

# Database
db_engine_version   = "4.0.0"
db_instance_class   = "db.t3.medium"
db_master_username  = "admin"
# db_master_password is set via environment variable or secrets file
backup_retention_days = 7

# Redis
redis_node_type = "cache.t3.small"

# Storage
s3_bucket_prefix      = "gowithsally-staging"
enable_s3_versioning  = true
enable_s3_encryption  = true

# Monitoring & Logging
log_retention_days = 14
alert_email_address = "devops@gowithsally.ma"

# Features
enable_nat_gateway        = true
enable_cloudtrail         = false
enable_vpc_flow_logs      = false
enable_enhanced_monitoring = true
enable_multi_az           = false
enable_bastion_host       = false

# Security
allowed_ssh_cidrs = ["10.0.0.0/8"] # Internal only

# Tagging
project_name  = "GoWithSally"
cost_center   = "engineering"
owner_email   = "devops@gowithsally.ma"

# Auto Scaling (uses defaults from variable)
# min_size = 2, max_size = 4, desired_capacity = 2
