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
