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
