variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production."
  }
}

# ============================================================================
# NETWORKING VARIABLES
# ============================================================================

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
}

variable "availability_zones" {
  description = "Availability zones for the deployment"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# ============================================================================
# COMPUTE VARIABLES
# ============================================================================

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"

  validation {
    condition     = can(regex("^t[3-4]\\.(micro|small|medium|large|xlarge|2xlarge)$", var.instance_type))
    error_message = "Instance type must be a valid t3 or t4 type."
  }
}

variable "key_pair_name" {
  description = "EC2 Key Pair name for SSH access"
  type        = string
  sensitive   = true
}

variable "auto_scaling_config" {
  description = "Auto scaling configuration per environment"
  type = map(object({
    min_size         = number
    max_size         = number
    desired_capacity = number
  }))

  default = {
    development = {
      min_size         = 1
      max_size         = 2
      desired_capacity = 1
    }
    staging = {
      min_size         = 2
      max_size         = 4
      desired_capacity = 2
    }
    production = {
      min_size         = 3
      max_size         = 10
      desired_capacity = 3
    }
  }
}

# ============================================================================
# DATABASE VARIABLES
# ============================================================================

variable "db_engine_version" {
  description = "DocumentDB engine version"
  type        = string
  default     = "4.0.0"
}

variable "db_instance_class" {
  description = "DocumentDB instance class"
  type        = string
  default     = "db.t3.medium"

  validation {
    condition     = can(regex("^db\\.t[3-4]\\.", var.db_instance_class))
    error_message = "Instance class must be a valid DocumentDB instance type."
  }
}

variable "db_master_username" {
  description = "Master username for database"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.db_master_username) >= 1 && length(var.db_master_username) <= 63
    error_message = "Master username must be between 1 and 63 characters."
  }
}

variable "db_master_password" {
  description = "Master password for database"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.db_master_password) >= 8
    error_message = "Master password must be at least 8 characters long."
  }
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7

  validation {
    condition     = var.backup_retention_days >= 1 && var.backup_retention_days <= 35
    error_message = "Backup retention must be between 1 and 35 days."
  }
}

# Redis Variables
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"

  validation {
    condition     = can(regex("^cache\\.", var.redis_node_type))
    error_message = "Redis node type must be a valid ElastiCache node type."
  }
}

# ============================================================================
# STORAGE VARIABLES
# ============================================================================

variable "s3_bucket_prefix" {
  description = "Prefix for S3 bucket names"
  type        = string
  default     = "gowithsally"
}

variable "enable_s3_versioning" {
  description = "Enable S3 versioning"
  type        = bool
  default     = true
}

variable "enable_s3_encryption" {
  description = "Enable S3 server-side encryption"
  type        = bool
  default     = true
}

# ============================================================================
# MONITORING & LOGGING VARIABLES
# ============================================================================

variable "log_retention_days" {
  description = "CloudWatch log retention period in days"
  type        = number
  default     = 7

  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.log_retention_days)
    error_message = "Log retention must be a valid CloudWatch value."
  }
}

variable "alert_email_address" {
  description = "Email address for CloudWatch alerts"
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.alert_email_address))
    error_message = "Alert email must be a valid email address."
  }
}

# ============================================================================
# APPLICATION SECRETS
# ============================================================================

variable "jwt_secret" {
  description = "JWT secret for authentication"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.jwt_secret) >= 32
    error_message = "JWT secret must be at least 32 characters long."
  }
}

variable "sendgrid_api_key" {
  description = "SendGrid API key for email"
  type        = string
  sensitive   = true
  default     = ""
}

variable "stripe_public_key" {
  description = "Stripe public key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "stripe_secret_key" {
  description = "Stripe secret key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "twilio_account_sid" {
  description = "Twilio account SID"
  type        = string
  sensitive   = true
  default     = ""
}

variable "twilio_auth_token" {
  description = "Twilio authentication token"
  type        = string
  sensitive   = true
  default     = ""
}

# ============================================================================
# TAGGING VARIABLES
# ============================================================================

variable "project_name" {
  description = "Project name for tagging"
  type        = string
  default     = "GoWithSally"
}

variable "cost_center" {
  description = "Cost center for billing"
  type        = string
  default     = "engineering"
}

variable "owner_email" {
  description = "Owner email for notifications"
  type        = string
  default     = ""
}

# ============================================================================
# FEATURE FLAGS
# ============================================================================

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnet internet access"
  type        = bool
  default     = true
}

variable "enable_cloudtrail" {
  description = "Enable CloudTrail for audit logging"
  type        = bool
  default     = var.environment == "production" ? true : false
}

variable "enable_vpc_flow_logs" {
  description = "Enable VPC Flow Logs"
  type        = bool
  default     = var.environment == "production" ? true : false
}

variable "enable_enhanced_monitoring" {
  description = "Enable enhanced database monitoring"
  type        = bool
  default     = var.environment == "production" ? true : false
}

variable "enable_multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = var.environment == "production" ? true : false
}

# ============================================================================
# OPTIONAL CUSTOMIZATION
# ============================================================================

variable "additional_security_group_cidrs" {
  description = "Additional CIDR blocks to allow in security groups"
  type        = list(string)
  default     = []
}

variable "allowed_ssh_cidrs" {
  description = "CIDR blocks allowed for SSH access"
  type        = list(string)
  default     = ["0.0.0.0/0"] # Should be restricted in production

  validation {
    condition = alltrue([
      for cidr in var.allowed_ssh_cidrs : can(cidrhost(cidr, 0))
    ])
    error_message = "All SSH CIDR blocks must be valid CIDR notation."
  }
}

variable "enable_bastion_host" {
  description = "Enable bastion host for private subnet access"
  type        = bool
  default     = var.environment == "production" ? true : false
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
