# ============================================================================
# APPLICATION OUTPUTS
# ============================================================================

output "application_url" {
  description = "URL to access the GoWithSally application"
  value       = "https://${module.compute.alb_dns_name}"
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = module.compute.alb_dns_name
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = module.compute.alb_arn
}

output "alb_security_group_id" {
  description = "Security group ID of the ALB"
  value       = module.networking.alb_security_group_id
}

# ============================================================================
# COMPUTE OUTPUTS
# ============================================================================

output "asg_name" {
  description = "Name of the Auto Scaling Group"
  value       = module.compute.asg_name
}

output "asg_arn" {
  description = "ARN of the Auto Scaling Group"
  value       = module.compute.asg_arn
}

output "app_server_ips" {
  description = "Private IP addresses of application servers"
  value       = module.compute.app_server_ips
}

output "launch_template_id" {
  description = "ID of the launch template"
  value       = module.compute.launch_template_id
}

output "launch_template_latest_version" {
  description = "Latest version of the launch template"
  value       = module.compute.launch_template_latest_version
}

# ============================================================================
# DATABASE OUTPUTS
# ============================================================================

output "docdb_cluster_endpoint" {
  description = "DocumentDB cluster endpoint for read/write operations"
  value       = module.database.docdb_cluster_endpoint
  sensitive   = true
}

output "docdb_cluster_reader_endpoint" {
  description = "DocumentDB cluster reader endpoint"
  value       = module.database.docdb_cluster_reader_endpoint
  sensitive   = true
}

output "docdb_cluster_id" {
  description = "DocumentDB cluster ID"
  value       = module.database.docdb_cluster_id
}

output "docdb_cluster_resource_id" {
  description = "DocumentDB cluster resource ID"
  value       = module.database.docdb_cluster_resource_id
}

output "docdb_security_group_id" {
  description = "Security group ID for DocumentDB"
  value       = module.networking.db_security_group_id
}

output "redis_endpoint" {
  description = "Redis (ElastiCache) endpoint for application access"
  value       = module.database.redis_endpoint
  sensitive   = true
}

output "redis_port" {
  description = "Redis port"
  value       = module.database.redis_port
}

output "redis_node_type" {
  description = "Redis node type"
  value       = module.database.redis_node_type
}

output "redis_security_group_id" {
  description = "Security group ID for Redis"
  value       = module.database.redis_security_group_id
}

# ============================================================================
# STORAGE OUTPUTS
# ============================================================================

output "s3_bucket_name" {
  description = "Name of the S3 bucket for uploads and backups"
  value       = module.storage.s3_bucket_name
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = module.storage.s3_bucket_arn
}

output "s3_bucket_regional_domain_name" {
  description = "Regional domain name of the S3 bucket"
  value       = module.storage.s3_bucket_regional_domain_name
}

output "efs_id" {
  description = "EFS file system ID for shared storage"
  value       = module.storage.efs_id
}

output "efs_dns_name" {
  description = "DNS name for mounting EFS"
  value       = module.storage.efs_dns_name
}

output "efs_security_group_id" {
  description = "Security group ID for EFS"
  value       = module.storage.efs_security_group_id
}

output "efs_mount_targets" {
  description = "EFS mount target IDs"
  value       = module.storage.efs_mount_targets
}

# ============================================================================
# NETWORKING OUTPUTS
# ============================================================================

output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = module.networking.vpc_cidr
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = module.networking.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = module.networking.private_subnet_ids
}

output "nat_gateway_ids" {
  description = "IDs of NAT Gateways"
  value       = module.networking.nat_gateway_ids
}

output "nat_gateway_ips" {
  description = "Elastic IP addresses of NAT Gateways"
  value       = module.networking.nat_gateway_ips
}

output "app_security_group_id" {
  description = "Security group ID for application servers"
  value       = module.networking.app_security_group_id
}

# ============================================================================
# MONITORING & LOGGING OUTPUTS
# ============================================================================

output "cloudwatch_log_group_app" {
  description = "CloudWatch log group for application logs"
  value       = aws_cloudwatch_log_group.gowithsally_app.name
}

output "cloudwatch_log_group_infra" {
  description = "CloudWatch log group for infrastructure logs"
  value       = aws_cloudwatch_log_group.gowithsally_infra.name
}

output "sns_topic_arn" {
  description = "SNS topic ARN for CloudWatch alarms"
  value       = aws_sns_topic.alerts.arn
}

output "sns_topic_name" {
  description = "SNS topic name for CloudWatch alarms"
  value       = aws_sns_topic.alerts.name
}

# ============================================================================
# SECRETS MANAGEMENT OUTPUTS
# ============================================================================

output "db_secret_arn" {
  description = "ARN of the database credentials secret"
  value       = aws_secretsmanager_secret.db_master_credentials.arn
}

output "db_secret_name" {
  description = "Name of the database credentials secret"
  value       = aws_secretsmanager_secret.db_master_credentials.name
}

output "app_secret_arn" {
  description = "ARN of the application secrets"
  value       = aws_secretsmanager_secret.app_secrets.arn
}

output "app_secret_name" {
  description = "Name of the application secrets"
  value       = aws_secretsmanager_secret.app_secrets.name
}

# ============================================================================
# IAM OUTPUTS
# ============================================================================

output "ec2_instance_role_arn" {
  description = "ARN of the EC2 instance role"
  value       = aws_iam_role.ec2_role.arn
}

output "ec2_instance_role_name" {
  description = "Name of the EC2 instance role"
  value       = aws_iam_role.ec2_role.name
}

output "ec2_instance_profile_arn" {
  description = "ARN of the EC2 instance profile"
  value       = aws_iam_instance_profile.ec2_profile.arn
}

# ============================================================================
# ENVIRONMENT & METADATA OUTPUTS
# ============================================================================

output "environment" {
  description = "Environment name"
  value       = var.environment
}

output "region" {
  description = "AWS region"
  value       = var.aws_region
}

output "availability_zones" {
  description = "Availability zones in use"
  value       = var.availability_zones
}

output "deployment_timestamp" {
  description = "Timestamp of deployment"
  value       = timestamp()
}

# ============================================================================
# DEPLOYMENT GUIDE OUTPUT
# ============================================================================

output "deployment_guide" {
  description = "Guide for accessing and managing the infrastructure"
  value = {
    application_url = "https://${module.compute.alb_dns_name}"
    alb_endpoint    = module.compute.alb_dns_name

    database = {
      host     = module.database.docdb_cluster_endpoint
      port     = 27017
      user     = var.db_master_username
      database = "gowithsally"
      secret   = aws_secretsmanager_secret.db_master_credentials.name
    }

    cache = {
      host           = split(":", module.database.redis_endpoint)[0]
      port           = module.database.redis_port
      secret         = aws_secretsmanager_secret.app_secrets.name
    }

    storage = {
      s3_bucket       = module.storage.s3_bucket_name
      efs_mount_point = module.storage.efs_dns_name
    }

    monitoring = {
      sns_topic     = aws_sns_topic.alerts.arn
      log_group_app = aws_cloudwatch_log_group.gowithsally_app.name
      log_group_ops = aws_cloudwatch_log_group.gowithsally_infra.name
    }

    management = {
      asg_name              = module.compute.asg_name
      launch_template       = module.compute.launch_template_id
      ec2_instance_profile  = aws_iam_instance_profile.ec2_profile.arn
      min_instances         = lookup(var.auto_scaling_config[var.environment], "min_size", 1)
      max_instances         = lookup(var.auto_scaling_config[var.environment], "max_size", 2)
      desired_instances     = lookup(var.auto_scaling_config[var.environment], "desired_capacity", 1)
    }
  }
}

# ============================================================================
# TERRAFORM STATE OUTPUTS
# ============================================================================

output "terraform_version" {
  description = "Terraform version used"
  value       = terraform.version.version
}

output "terraform_workspace" {
  description = "Terraform workspace"
  value       = terraform.workspace
}
