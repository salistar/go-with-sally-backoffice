terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    # Commented alternatives for other cloud providers
    # google = {
    #   source  = "hashicorp/google"
    #   version = "~> 5.0"
    # }
    # azurerm = {
    #   source  = "hashicorp/azurerm"
    #   version = "~> 3.0"
    # }
  }

  # Backend configuration for remote state
  backend "s3" {
    bucket         = "gowithsally-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

# AWS Provider Configuration
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = "GoWithSally"
      ManagedBy   = "Terraform"
      CreatedAt   = timestamp()
    }
  }
}

# GCP Provider Configuration (commented for alternative)
# provider "google" {
#   project = var.gcp_project_id
#   region  = var.gcp_region
# }

# Azure Provider Configuration (commented for alternative)
# provider "azurerm" {
#   features {}
#
#   subscription_id = var.azure_subscription_id
# }

# Local data source for configuration
locals {
  common_tags = {
    Environment = var.environment
    Project     = "GoWithSally"
    ManagedBy   = "Terraform"
  }

  app_name = "gowithsally"

  # Auto scaling configuration
  auto_scaling_config = {
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

  instance_config = var.auto_scaling_config[var.environment]
}

# ============================================================================
# NETWORKING MODULE
# ============================================================================

module "networking" {
  source = "./modules/networking"

  environment         = var.environment
  vpc_cidr            = var.vpc_cidr
  availability_zones  = var.availability_zones
  private_subnet_cidrs = var.private_subnet_cidrs
  public_subnet_cidrs = var.public_subnet_cidrs

  tags = local.common_tags
}

# ============================================================================
# COMPUTE MODULE (EC2, ASG, ALB)
# ============================================================================

module "compute" {
  source = "./modules/compute"

  environment            = var.environment
  app_name              = local.app_name
  instance_type         = var.instance_type
  key_pair_name         = var.key_pair_name

  # Auto scaling configuration
  min_size              = local.instance_config.min_size
  max_size              = local.instance_config.max_size
  desired_capacity      = local.instance_config.desired_capacity

  # Network configuration
  vpc_id                = module.networking.vpc_id
  private_subnet_ids    = module.networking.private_subnet_ids
  public_subnet_ids     = module.networking.public_subnet_ids
  alb_security_group_id = module.networking.alb_security_group_id
  app_security_group_id = module.networking.app_security_group_id

  # Health check configuration
  health_check_path     = "/health"
  health_check_protocol = "HTTP"

  # Tagging
  tags = local.common_tags

  depends_on = [module.networking]
}

# ============================================================================
# DATABASE MODULE (DocumentDB/MongoDB alternative)
# ============================================================================

module "database" {
  source = "./modules/database"

  environment          = var.environment
  app_name            = local.app_name

  # Database configuration
  db_engine           = "docdb"
  db_engine_version   = var.db_engine_version
  instance_class      = var.db_instance_class

  # Scaling
  num_db_instances    = local.instance_config.desired_capacity

  # Master user credentials
  master_username     = var.db_master_username
  master_password     = var.db_master_password

  # Network configuration
  vpc_id              = module.networking.vpc_id
  db_subnet_ids       = module.networking.private_subnet_ids
  db_security_group_id = module.networking.db_security_group_id

  # Backup configuration
  backup_retention_period = var.backup_retention_days
  preferred_backup_window = "03:00-04:00"
  preferred_maintenance_window = "mon:04:00-mon:05:00"

  # Monitoring
  enable_monitoring   = true

  # ElastiCache (Redis)
  redis_node_type     = var.redis_node_type
  redis_num_cache_nodes = local.instance_config.desired_capacity
  redis_automatic_failover = var.environment == "production" ? true : false

  tags = local.common_tags

  depends_on = [module.networking]
}

# ============================================================================
# STORAGE MODULE (S3, EFS)
# ============================================================================

module "storage" {
  source = "./modules/storage"

  environment          = var.environment
  app_name            = local.app_name

  # S3 configuration
  s3_versioning_enabled = true
  s3_server_side_encryption = "AES256"
  s3_force_ssl         = true

  # EFS configuration
  vpc_id               = module.networking.vpc_id
  subnet_ids           = module.networking.private_subnet_ids
  efs_security_group_id = module.networking.efs_security_group_id

  # Backup configuration
  enable_backup        = true
  backup_retention_days = var.backup_retention_days

  tags = local.common_tags

  depends_on = [module.networking]
}

# ============================================================================
# MONITORING & LOGGING
# ============================================================================

# CloudWatch Log Group for application logs
resource "aws_cloudwatch_log_group" "gowithsally_app" {
  name              = "/aws/ecs/${var.environment}/gowithsally-app"
  retention_in_days = var.log_retention_days

  tags = merge(
    local.common_tags,
    {
      Name = "${var.environment}-gowithsally-app-logs"
    }
  )
}

# CloudWatch Log Group for infrastructure logs
resource "aws_cloudwatch_log_group" "gowithsally_infra" {
  name              = "/aws/ec2/${var.environment}/gowithsally"
  retention_in_days = var.log_retention_days

  tags = merge(
    local.common_tags,
    {
      Name = "${var.environment}-gowithsally-infra-logs"
    }
  )
}

# CloudWatch Alarms for monitoring
resource "aws_cloudwatch_metric_alarm" "alb_unhealthy_hosts" {
  alarm_name          = "${var.environment}-gowithsally-alb-unhealthy-hosts"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "2"
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Average"
  threshold           = "1"
  alarm_description   = "Alert when ALB has unhealthy hosts"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = module.compute.alb_name
    TargetGroup  = module.compute.target_group_arn
  }
}

resource "aws_cloudwatch_metric_alarm" "alb_target_response_time" {
  alarm_name          = "${var.environment}-gowithsally-alb-response-time"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Average"
  threshold           = "1"
  alarm_description   = "Alert when ALB response time is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = module.compute.alb_name
  }
}

resource "aws_cloudwatch_metric_alarm" "asg_cpu_utilization" {
  alarm_name          = "${var.environment}-gowithsally-asg-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "Alert when ASG average CPU exceeds 80%"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    AutoScalingGroupName = module.compute.asg_name
  }
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "${var.environment}-gowithsally-alerts"

  tags = merge(
    local.common_tags,
    {
      Name = "${var.environment}-gowithsally-alerts"
    }
  )
}

resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email_address
}

# ============================================================================
# IAM ROLES & POLICIES
# ============================================================================

# EC2 Instance Role
resource "aws_iam_role" "ec2_role" {
  name = "${var.environment}-gowithsally-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

# EC2 Instance Profile
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "${var.environment}-gowithsally-ec2-profile"
  role = aws_iam_role.ec2_role.name
}

# S3 Access Policy
resource "aws_iam_role_policy" "s3_access" {
  name = "${var.environment}-gowithsally-s3-policy"
  role = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          module.storage.s3_bucket_arn,
          "${module.storage.s3_bucket_arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::gowithsally-backups",
          "arn:aws:s3:::gowithsally-backups/*"
        ]
      }
    ]
  })
}

# CloudWatch Logs Policy
resource "aws_iam_role_policy" "cloudwatch_logs" {
  name = "${var.environment}-gowithsally-cloudwatch-logs-policy"
  role = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:*:*"
      }
    ]
  })
}

# Secrets Manager Policy
resource "aws_iam_role_policy" "secrets_manager" {
  name = "${var.environment}-gowithsally-secrets-policy"
  role = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = "arn:aws:secretsmanager:${var.aws_region}:*:secret:gowithsally/*"
      }
    ]
  })
}

# ============================================================================
# SECRETS MANAGEMENT
# ============================================================================

# Database Master User Secret
resource "aws_secretsmanager_secret" "db_master_credentials" {
  name_prefix             = "${var.environment}-gowithsally-db-"
  recovery_window_in_days = 7

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "db_master_credentials" {
  secret_id = aws_secretsmanager_secret.db_master_credentials.id
  secret_string = jsonencode({
    username = var.db_master_username
    password = var.db_master_password
    engine   = "docdb"
    host     = module.database.docdb_cluster_endpoint
    port     = 27017
    dbname   = "gowithsally"
  })
}

# Application Secrets
resource "aws_secretsmanager_secret" "app_secrets" {
  name_prefix             = "${var.environment}-gowithsally-app-"
  recovery_window_in_days = 7

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    jwt_secret        = var.jwt_secret
    sendgrid_api_key  = var.sendgrid_api_key
    stripe_public_key = var.stripe_public_key
    stripe_secret_key = var.stripe_secret_key
    twilio_account_sid = var.twilio_account_sid
    twilio_auth_token = var.twilio_auth_token
  })
}

# ============================================================================
# OUTPUTS
# ============================================================================

# Export outputs for use by Ansible
resource "local_file" "ansible_inventory" {
  filename = "${path.module}/../ansible/inventory/aws_inventory.yml"
  content = templatefile("${path.module}/templates/ansible_inventory.tpl", {
    alb_dns_name        = module.compute.alb_dns_name
    app_servers         = module.compute.app_server_ips
    db_endpoint         = module.database.docdb_cluster_endpoint
    redis_endpoint      = module.database.redis_endpoint
    environment         = var.environment
  })
}

# Export Terraform outputs
output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = module.compute.alb_dns_name
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = module.compute.alb_arn
}

output "asg_name" {
  description = "Name of the Auto Scaling Group"
  value       = module.compute.asg_name
}

output "docdb_cluster_endpoint" {
  description = "DocumentDB cluster endpoint"
  value       = module.database.docdb_cluster_endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis endpoint"
  value       = module.database.redis_endpoint
  sensitive   = true
}

output "s3_bucket_name" {
  description = "S3 bucket for uploads and backups"
  value       = module.storage.s3_bucket_name
}

output "efs_id" {
  description = "EFS file system ID"
  value       = module.storage.efs_id
}

output "sns_topic_arn" {
  description = "SNS topic ARN for alerts"
  value       = aws_sns_topic.alerts.arn
}

output "log_group_names" {
  description = "CloudWatch log group names"
  value = {
    app   = aws_cloudwatch_log_group.gowithsally_app.name
    infra = aws_cloudwatch_log_group.gowithsally_infra.name
  }
}

output "environment" {
  description = "Deployment environment"
  value       = var.environment
}

output "region" {
  description = "AWS region"
  value       = var.aws_region
}
