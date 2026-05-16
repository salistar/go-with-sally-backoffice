variable "environment" {
  description = "Environment name"
  type        = string
}

variable "app_name" {
  description = "Application name"
  type        = string
}

variable "s3_versioning_enabled" {
  description = "Enable S3 versioning"
  type        = bool
  default     = true
}

variable "s3_server_side_encryption" {
  description = "S3 server-side encryption method"
  type        = string
  default     = "AES256"
}

variable "s3_force_ssl" {
  description = "Force SSL/TLS for S3 access"
  type        = bool
  default     = true
}

variable "vpc_id" {
  description = "VPC ID for EFS"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for EFS mount targets"
  type        = list(string)
}

variable "efs_security_group_id" {
  description = "Security group ID for EFS"
  type        = string
}

variable "enable_backup" {
  description = "Enable EFS backup"
  type        = bool
  default     = true
}

variable "backup_retention_days" {
  description = "Backup retention period in days"
  type        = number
  default     = 7
}

variable "tags" {
  description = "Tags for resources"
  type        = map(string)
}

# ============================================================================
# S3 BUCKET FOR UPLOADS & BACKUPS
# ============================================================================

resource "aws_s3_bucket" "gowithsally" {
  bucket = "${var.environment}-gowithsally-${data.aws_caller_identity.current.account_id}"

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-gowithsally-storage"
    }
  )
}

data "aws_caller_identity" "current" {}

# S3 Bucket Versioning
resource "aws_s3_bucket_versioning" "gowithsally" {
  bucket = aws_s3_bucket.gowithsally.id

  versioning_configuration {
    status     = var.s3_versioning_enabled ? "Enabled" : "Suspended"
    mfa_delete = var.environment == "production" ? "Enabled" : "Disabled"
  }
}

# S3 Bucket Server-Side Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "gowithsally" {
  bucket = aws_s3_bucket.gowithsally.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = var.s3_server_side_encryption == "aws:kms" ? null : "AES256"
      kms_master_key_id = var.s3_server_side_encryption == "aws:kms" ? aws_kms_key.s3.arn : null
    }
    bucket_key_enabled = true
  }
}

# KMS Key for S3 Encryption
resource "aws_kms_key" "s3" {
  description             = "KMS key for S3 encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = var.tags
}

resource "aws_kms_alias" "s3" {
  name          = "alias/${var.environment}-s3"
  target_key_id = aws_kms_key.s3.key_id
}

# S3 Bucket Public Access Block
resource "aws_s3_bucket_public_access_block" "gowithsally" {
  bucket = aws_s3_bucket.gowithsally.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket Logging
resource "aws_s3_bucket_logging" "gowithsally" {
  bucket = aws_s3_bucket.gowithsally.id

  target_bucket = aws_s3_bucket.logs.id
  target_prefix = "s3-access-logs/"
}

# S3 Bucket for Logs
resource "aws_s3_bucket" "logs" {
  bucket = "${var.environment}-gowithsally-logs-${data.aws_caller_identity.current.account_id}"

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-gowithsally-logs"
    }
  )
}

resource "aws_s3_bucket_public_access_block" "logs" {
  bucket = aws_s3_bucket.logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket Lifecycle Policy (archive old versions)
resource "aws_s3_bucket_lifecycle_configuration" "gowithsally" {
  bucket = aws_s3_bucket.gowithsally.id

  rule {
    id     = "delete-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = var.backup_retention_days
    }
  }

  rule {
    id     = "archive-to-glacier"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "GLACIER"
    }

    transition {
      days          = 90
      storage_class = "DEEP_ARCHIVE"
    }
  }

  rule {
    id     = "delete-incomplete-multipart"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# S3 Bucket Policy - Force SSL
resource "aws_s3_bucket_policy" "gowithsally_force_ssl" {
  bucket = aws_s3_bucket.gowithsally.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyUnencryptedObjectUploads"
        Effect = "Deny"
        Principal = "*"
        Action = "s3:PutObject"
        Resource = "${aws_s3_bucket.gowithsally.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = "AES256"
          }
        }
      },
      {
        Sid    = "DenyInsecureTransport"
        Effect = "Deny"
        Principal = "*"
        Action = "s3:*"
        Resource = [
          aws_s3_bucket.gowithsally.arn,
          "${aws_s3_bucket.gowithsally.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })
}

# ============================================================================
# EFS (ELASTIC FILE SYSTEM)
# ============================================================================

resource "aws_efs_file_system" "gowithsally" {
  creation_token   = "${var.environment}-gowithsally-efs"
  encrypted        = true
  kms_key_id       = aws_kms_key.efs.arn
  performance_mode = "generalPurpose"
  throughput_mode  = "bursting"

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-gowithsally-efs"
    }
  )
}

# KMS Key for EFS Encryption
resource "aws_kms_key" "efs" {
  description             = "KMS key for EFS encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = var.tags
}

resource "aws_kms_alias" "efs" {
  name          = "alias/${var.environment}-efs"
  target_key_id = aws_kms_key.efs.key_id
}

# EFS Mount Targets
resource "aws_efs_mount_target" "gowithsally" {
  count           = length(var.subnet_ids)
  file_system_id  = aws_efs_file_system.gowithsally.id
  subnet_id       = var.subnet_ids[count.index]
  security_groups = [var.efs_security_group_id]
}

# EFS Backup Policy
resource "aws_efs_backup_policy" "gowithsally" {
  count          = var.enable_backup ? 1 : 0
  file_system_id = aws_efs_file_system.gowithsally.id

  backup_policy {
    status = "ENABLED"
  }
}

# EFS Lifecycle Management
resource "aws_efs_file_system_policy" "gowithsally" {
  file_system_id = aws_efs_file_system.gowithsally.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyUnencryptedTransport"
        Effect = "Deny"
        Principal = "*"
        Action = "elasticfilesystem:*"
        Resource = "*"
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      },
      {
        Sid    = "AllowVPCAccess"
        Effect = "Allow"
        Principal = "*"
        Action = [
          "elasticfilesystem:ClientMount",
          "elasticfilesystem:ClientWrite"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:SourceVpc" = var.vpc_id
          }
        }
      }
    ]
  })
}

# ============================================================================
# AWS BACKUP FOR EFS
# ============================================================================

resource "aws_backup_vault" "gowithsally" {
  count       = var.enable_backup ? 1 : 0
  name        = "${var.environment}-gowithsally-backup-vault"
  kms_key_arn = aws_kms_key.backup[0].arn

  tags = var.tags
}

resource "aws_kms_key" "backup" {
  count                   = var.enable_backup ? 1 : 0
  description             = "KMS key for Backup encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = var.tags
}

resource "aws_backup_plan" "gowithsally" {
  count = var.enable_backup ? 1 : 0
  name  = "${var.environment}-gowithsally-backup-plan"

  rule {
    rule_name         = "daily_backup"
    target_backup_vault_name = aws_backup_vault.gowithsally[0].name
    schedule          = "cron(0 5 ? * * *)" # Daily at 5 AM UTC

    lifecycle {
      delete_after = var.backup_retention_days
    }
  }

  tags = var.tags
}

resource "aws_backup_selection" "gowithsally" {
  count        = var.enable_backup ? 1 : 0
  name         = "${var.environment}-gowithsally-efs-backup"
  plan_id      = aws_backup_plan.gowithsally[0].id
  iam_role_arn = aws_iam_role.backup[0].arn
  resources    = [aws_efs_file_system.gowithsally.arn]
}

resource "aws_iam_role" "backup" {
  count = var.enable_backup ? 1 : 0
  name  = "${var.environment}-gowithsally-backup-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "backup" {
  count      = var.enable_backup ? 1 : 0
  role       = aws_iam_role.backup[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

# ============================================================================
# OUTPUTS
# ============================================================================

output "s3_bucket_name" {
  value = aws_s3_bucket.gowithsally.id
}

output "s3_bucket_arn" {
  value = aws_s3_bucket.gowithsally.arn
}

output "s3_bucket_regional_domain_name" {
  value = aws_s3_bucket.gowithsally.bucket_regional_domain_name
}

output "efs_id" {
  value = aws_efs_file_system.gowithsally.id
}

output "efs_arn" {
  value = aws_efs_file_system.gowithsally.arn
}

output "efs_dns_name" {
  value = aws_efs_file_system.gowithsally.dns_name
}

output "efs_mount_targets" {
  value = aws_efs_mount_target.gowithsally[*].id
}

output "efs_security_group_id" {
  value = var.efs_security_group_id
}

output "backup_vault_arn" {
  value = try(aws_backup_vault.gowithsally[0].arn, null)
}
