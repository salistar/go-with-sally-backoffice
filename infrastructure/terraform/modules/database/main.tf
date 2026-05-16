variable "environment" {
  description = "Environment name"
  type        = string
}

variable "app_name" {
  description = "Application name"
  type        = string
}

variable "db_engine" {
  description = "Database engine (docdb for DocumentDB)"
  type        = string
  default     = "docdb"
}

variable "db_engine_version" {
  description = "Database engine version"
  type        = string
}

variable "instance_class" {
  description = "Database instance class"
  type        = string
}

variable "num_db_instances" {
  description = "Number of database instances"
  type        = number
  default     = 3
}

variable "master_username" {
  description = "Master username"
  type        = string
  sensitive   = true
}

variable "master_password" {
  description = "Master password"
  type        = string
  sensitive   = true
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "db_subnet_ids" {
  description = "Subnet IDs for database"
  type        = list(string)
}

variable "db_security_group_id" {
  description = "Security group ID for database"
  type        = string
}

variable "backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 7
}

variable "preferred_backup_window" {
  description = "Preferred backup window"
  type        = string
  default     = "03:00-04:00"
}

variable "preferred_maintenance_window" {
  description = "Preferred maintenance window"
  type        = string
  default     = "mon:04:00-mon:05:00"
}

variable "enable_monitoring" {
  description = "Enable CloudWatch monitoring"
  type        = bool
  default     = true
}

variable "redis_node_type" {
  description = "Redis node type"
  type        = string
}

variable "redis_num_cache_nodes" {
  description = "Number of Redis cache nodes"
  type        = number
  default     = 3
}

variable "redis_automatic_failover" {
  description = "Enable automatic failover for Redis"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Tags for resources"
  type        = map(string)
}

# ============================================================================
# DOCUMENTDB CLUSTER
# ============================================================================

resource "aws_docdb_subnet_group" "gowithsally" {
  name       = "${var.environment}-gowithsally-docdb-sg"
  subnet_ids = var.db_subnet_ids

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-docdb-subnet-group"
    }
  )
}

resource "aws_docdb_cluster" "gowithsally" {
  cluster_identifier              = "${var.environment}-gowithsally-docdb"
  master_username                 = var.master_username
  master_password                 = var.master_password
  backup_retention_period         = var.backup_retention_period
  preferred_backup_window         = var.preferred_backup_window
  preferred_maintenance_window    = var.preferred_maintenance_window
  db_subnet_group_name            = aws_docdb_subnet_group.gowithsally.name
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.gowithsally.name
  skip_final_snapshot             = var.environment == "production" ? false : true
  final_snapshot_identifier       = var.environment == "production" ? "${var.environment}-gowithsally-docdb-final-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null
  storage_encrypted               = true
  kms_key_id                      = aws_kms_key.docdb.arn
  vpc_security_group_ids          = [var.db_security_group_id]
  enabled_cloudwatch_logs_exports = ["audit", "error", "general", "slowquery"]
  engine_version                  = var.db_engine_version
  engine                          = "docdb"

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-docdb-cluster"
    }
  )

  depends_on = [aws_docdb_cluster_parameter_group.gowithsally]
}

# DocumentDB Cluster Parameter Group
resource "aws_docdb_cluster_parameter_group" "gowithsally" {
  family      = "docdb4.0"
  name        = "${var.environment}-gowithsally-docdb-params"
  description = "DocumentDB cluster parameter group"

  parameter {
    name  = "audit_logs"
    value = "enabled"
  }

  parameter {
    name  = "profiler"
    value = "enabled"
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-docdb-param-group"
    }
  )
}

# DocumentDB Cluster Instances
resource "aws_docdb_cluster_instance" "gowithsally" {
  count              = var.num_db_instances
  cluster_identifier = aws_docdb_cluster.gowithsally.id
  instance_class     = var.instance_class
  engine              = aws_docdb_cluster.gowithsally.engine
  engine_version     = aws_docdb_cluster.gowithsally.engine_version

  publicly_accessible       = false
  auto_minor_version_upgrade = true
  promotion_tier            = count.index
  performance_insights_enabled = var.enable_monitoring

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-docdb-instance-${count.index + 1}"
    }
  )
}

# KMS Key for DocumentDB Encryption
resource "aws_kms_key" "docdb" {
  description             = "KMS key for DocumentDB encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = var.tags
}

resource "aws_kms_alias" "docdb" {
  name          = "alias/${var.environment}-docdb"
  target_key_id = aws_kms_key.docdb.key_id
}

# ============================================================================
# ELASTICACHE REDIS
# ============================================================================

resource "aws_elasticache_subnet_group" "gowithsally" {
  name       = "${var.environment}-gowithsally-redis-sg"
  subnet_ids = var.db_subnet_ids

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-redis-subnet-group"
    }
  )
}

resource "aws_elasticache_replication_group" "gowithsally" {
  replication_group_description = "Redis replication group for ${var.environment}"
  replication_group_id          = "${var.environment}-gowithsally-redis"
  engine                        = "redis"
  engine_version                = "7.0"
  node_type                     = var.redis_node_type
  num_cache_clusters            = var.redis_num_cache_nodes
  parameter_group_name          = aws_elasticache_parameter_group.gowithsally.name
  port                          = 6379
  automatic_failover_enabled    = var.redis_automatic_failover
  at_rest_encryption_enabled    = true
  transit_encryption_enabled    = true
  auth_token_enabled            = true
  auth_token                    = random_password.redis_auth_token.result
  security_group_ids            = [data.aws_security_group.redis.id]
  subnet_group_name             = aws_elasticache_subnet_group.gowithsally.name
  snapshot_retention_limit      = 5
  snapshot_window               = "03:00-05:00"
  maintenance_window            = "mon:05:00-mon:06:00"
  notification_topic_arn        = aws_sns_topic.redis_events.arn
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_engine_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "engine-log"
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-redis-cluster"
    }
  )
}

# Random password for Redis auth token
resource "random_password" "redis_auth_token" {
  length  = 32
  special = true
}

# Redis Parameter Group
resource "aws_elasticache_parameter_group" "gowithsally" {
  family = "redis7"
  name   = "${var.environment}-gowithsally-redis-params"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  tags = var.tags
}

# Redis Security Group (reference data source since it's created in networking module)
data "aws_security_group" "redis" {
  vpc_id = var.vpc_id

  filter {
    name   = "tag:Name"
    values = ["${var.environment}-redis-sg"]
  }
}

# CloudWatch Log Groups for Redis
resource "aws_cloudwatch_log_group" "redis_slow_log" {
  name              = "/aws/elasticache/${var.environment}/redis-slow-log"
  retention_in_days = 7

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-redis-slow-log"
    }
  )
}

resource "aws_cloudwatch_log_group" "redis_engine_log" {
  name              = "/aws/elasticache/${var.environment}/redis-engine-log"
  retention_in_days = 7

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-redis-engine-log"
    }
  )
}

# SNS Topic for Redis Events
resource "aws_sns_topic" "redis_events" {
  name = "${var.environment}-gowithsally-redis-events"

  tags = var.tags
}

# ============================================================================
# OUTPUTS
# ============================================================================

output "docdb_cluster_id" {
  value = aws_docdb_cluster.gowithsally.id
}

output "docdb_cluster_endpoint" {
  value = aws_docdb_cluster.gowithsally.endpoint
}

output "docdb_cluster_reader_endpoint" {
  value = aws_docdb_cluster.gowithsally.reader_endpoint
}

output "docdb_cluster_resource_id" {
  value = aws_docdb_cluster.gowithsally.cluster_resource_id
}

output "docdb_master_username" {
  value     = aws_docdb_cluster.gowithsally.master_username
  sensitive = true
}

output "redis_endpoint" {
  value = aws_elasticache_replication_group.gowithsally.primary_endpoint_address
}

output "redis_port" {
  value = aws_elasticache_replication_group.gowithsally.port
}

output "redis_node_type" {
  value = aws_elasticache_replication_group.gowithsally.node_type
}

output "redis_security_group_id" {
  value = data.aws_security_group.redis.id
}

output "redis_auth_token" {
  value     = random_password.redis_auth_token.result
  sensitive = true
}
