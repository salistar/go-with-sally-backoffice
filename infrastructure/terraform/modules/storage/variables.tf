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
