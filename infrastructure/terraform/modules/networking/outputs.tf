output "vpc_id" {
  value = aws_vpc.gowithsally.id
}

output "vpc_cidr" {
  value = aws_vpc.gowithsally.cidr_block
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

output "nat_gateway_ids" {
  value = aws_nat_gateway.gowithsally[*].id
}

output "nat_gateway_ips" {
  value = aws_eip.nat[*].public_ip
}

output "alb_security_group_id" {
  value = aws_security_group.alb.id
}

output "app_security_group_id" {
  value = aws_security_group.app.id
}

output "db_security_group_id" {
  value = aws_security_group.database.id
}

output "redis_security_group_id" {
  value = aws_security_group.redis.id
}

output "efs_security_group_id" {
  value = aws_security_group.efs.id
}
