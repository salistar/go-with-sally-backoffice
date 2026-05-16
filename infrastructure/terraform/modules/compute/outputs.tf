output "alb_arn" {
  value = aws_lb.gowithsally.arn
}

output "alb_dns_name" {
  value = aws_lb.gowithsally.dns_name
}

output "alb_name" {
  value = aws_lb.gowithsally.name
}

output "target_group_arn" {
  value = aws_lb_target_group.gowithsally.arn
}

output "asg_name" {
  value = aws_autoscaling_group.gowithsally.name
}

output "asg_arn" {
  value = aws_autoscaling_group.gowithsally.arn
}

output "launch_template_id" {
  value = aws_launch_template.gowithsally.id
}

output "launch_template_latest_version" {
  value = aws_launch_template.gowithsally.latest_version_number
}

output "app_server_ips" {
  value = aws_autoscaling_group.gowithsally.availability_zones
}
