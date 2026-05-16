# Development Environment Configuration

environment = "development"
aws_region  = "us-east-1"

# Networking
vpc_cidr             = "10.0.0.0/16"
availability_zones   = ["us-east-1a", "us-east-1b"]
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = ["10.0.11.0/24", "10.0.12.0/24"]

# Compute
instance_type = "t3.small"
key_pair_name = "gowithsally-dev"

# Database
db_engine_version   = "4.0.0"
db_instance_class   = "db.t3.small"
db_master_username  = "admin"
# db_master_password is set via environment variable or secrets file
backup_retention_days = 3

# Redis
redis_node_type = "cache.t3.micro"

# Storage
s3_bucket_prefix      = "gowithsally-dev"
enable_s3_versioning  = false
enable_s3_encryption  = true

# Monitoring & Logging
log_retention_days = 3
alert_email_address = "devops@gowithsally.ma"

# Features
enable_nat_gateway        = true
enable_cloudtrail         = false
enable_vpc_flow_logs      = false
enable_enhanced_monitoring = false
enable_multi_az           = false
enable_bastion_host       = false

# Security
allowed_ssh_cidrs = ["0.0.0.0/0"] # Allow all for development

# Tagging
project_name  = "GoWithSally"
cost_center   = "engineering"
owner_email   = "devops@gowithsally.ma"

# Auto Scaling (uses defaults from variable)
# min_size = 1, max_size = 2, desired_capacity = 1
