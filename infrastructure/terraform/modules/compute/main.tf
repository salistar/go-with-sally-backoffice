variable "environment" {
  description = "Environment name"
  type        = string
}

variable "app_name" {
  description = "Application name"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
}

variable "key_pair_name" {
  description = "EC2 Key Pair name"
  type        = string
  sensitive   = true
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "Private subnet IDs"
  type        = list(string)
}

variable "alb_security_group_id" {
  description = "ALB security group ID"
  type        = string
}

variable "app_security_group_id" {
  description = "Application security group ID"
  type        = string
}

variable "min_size" {
  description = "Minimum number of instances"
  type        = number
}

variable "max_size" {
  description = "Maximum number of instances"
  type        = number
}

variable "desired_capacity" {
  description = "Desired number of instances"
  type        = number
}

variable "health_check_path" {
  description = "ALB health check path"
  type        = string
  default     = "/health"
}

variable "health_check_protocol" {
  description = "ALB health check protocol"
  type        = string
  default     = "HTTP"
}

variable "tags" {
  description = "Tags for resources"
  type        = map(string)
}

# ============================================================================
# DATA SOURCES
# ============================================================================

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ============================================================================
# APPLICATION LOAD BALANCER
# ============================================================================

resource "aws_lb" "gowithsally" {
  name               = "${var.environment}-gowithsally-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group_id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = var.environment == "production" ? true : false
  enable_http2              = true
  enable_cross_zone_load_balancing = true

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-gowithsally-alb"
    }
  )
}

# ALB Target Group
resource "aws_lb_target_group" "gowithsally" {
  name        = "${var.environment}-gowithsally-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "instance"

  health_check {
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = var.health_check_path
    matcher             = "200-399"
    protocol            = var.health_check_protocol
  }

  stickiness {
    type            = "lb_cookie"
    enabled         = true
    cookie_duration = 86400
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-gowithsally-tg"
    }
  )
}

# HTTP Listener (redirect to HTTPS)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.gowithsally.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# HTTPS Listener (requires SSL certificate)
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.gowithsally.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = "arn:aws:acm:${data.aws_caller_identity.current.region}:${data.aws_caller_identity.current.account_id}:certificate/YOUR-CERT-ID"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.gowithsally.arn
  }
}

data "aws_caller_identity" "current" {}

# ============================================================================
# EC2 LAUNCH TEMPLATE
# ============================================================================

resource "aws_launch_template" "gowithsally" {
  name_prefix            = "${var.environment}-gowithsally-"
  image_id               = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = var.key_pair_name
  vpc_security_group_ids = [var.app_security_group_id]

  block_device_mappings {
    device_name = "/dev/sda1"

    ebs {
      volume_type           = "gp3"
      volume_size           = 50
      delete_on_termination = true
      encrypted             = true
    }
  }

  iam_instance_profile {
    arn = aws_iam_instance_profile.ec2.arn
  }

  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    environment = var.environment
    app_name    = var.app_name
  }))

  monitoring {
    enabled = true
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  tag_specifications {
    resource_type = "instance"

    tags = merge(
      var.tags,
      {
        Name = "${var.environment}-gowithsally-instance"
      }
    )
  }

  tag_specifications {
    resource_type = "volume"

    tags = merge(
      var.tags,
      {
        Name = "${var.environment}-gowithsally-volume"
      }
    )
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ============================================================================
# AUTO SCALING GROUP
# ============================================================================

resource "aws_autoscaling_group" "gowithsally" {
  name                = "${var.environment}-gowithsally-asg"
  vpc_zone_identifier = var.private_subnet_ids
  target_group_arns   = [aws_lb_target_group.gowithsally.arn]
  health_check_type   = "ELB"
  health_check_grace_period = 300

  min_size         = var.min_size
  max_size         = var.max_size
  desired_capacity = var.desired_capacity

  instance_warmup_period = 300

  launch_template {
    id      = aws_launch_template.gowithsally.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "${var.environment}-gowithsally-asg"
    propagate_at_launch = true
  }

  dynamic "tag" {
    for_each = var.tags
    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = true
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ============================================================================
# AUTO SCALING POLICIES
# ============================================================================

# Target Tracking Scaling Policy - CPU Utilization
resource "aws_autoscaling_policy" "target_tracking_cpu" {
  name                   = "${var.environment}-gowithsally-target-tracking-cpu"
  autoscaling_group_name = aws_autoscaling_group.gowithsally.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 70.0
  }
}

# Target Tracking Scaling Policy - ALB Request Count
resource "aws_autoscaling_policy" "target_tracking_requests" {
  name                   = "${var.environment}-gowithsally-target-tracking-requests"
  autoscaling_group_name = aws_autoscaling_group.gowithsally.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${aws_lb.gowithsally.arn_suffix}/${aws_lb_target_group.gowithsally.arn_suffix}"
    }
    target_value = 1000.0
  }
}

# Step Scaling Policy for rapid scale-up (CPU-based)
resource "aws_autoscaling_policy" "scale_up_step" {
  name                   = "${var.environment}-gowithsally-scale-up-step"
  autoscaling_group_name = aws_autoscaling_group.gowithsally.name
  adjustment_type        = "PercentChangeInCapacity"
  policy_type            = "StepScaling"
  metric_aggregation_type = "Average"
  estimated_warmup_seconds = 300

  step_adjustment {
    metric_interval_lower_bound = 0
    metric_interval_upper_bound = 10
    scaling_adjustment          = 10
  }

  step_adjustment {
    metric_interval_lower_bound = 10
    scaling_adjustment          = 30
  }
}

# Step Scaling Policy for rapid scale-down (CPU-based)
resource "aws_autoscaling_policy" "scale_down_step" {
  name                   = "${var.environment}-gowithsally-scale-down-step"
  autoscaling_group_name = aws_autoscaling_group.gowithsally.name
  adjustment_type        = "PercentChangeInCapacity"
  policy_type            = "StepScaling"
  metric_aggregation_type = "Average"
  estimated_warmup_seconds = 300

  step_adjustment {
    metric_interval_upper_bound = 0
    scaling_adjustment          = -10
  }
}

# CPU Utilization Alarms for step scaling
resource "aws_cloudwatch_metric_alarm" "cpu_high_step" {
  alarm_name          = "${var.environment}-gowithsally-cpu-high-step"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "300"
  statistic           = "Average"
  threshold           = "70"
  alarm_description   = "Scale up when CPU exceeds 70%"
  alarm_actions       = [aws_autoscaling_policy.scale_up_step.arn]

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.gowithsally.name
  }
}

resource "aws_cloudwatch_metric_alarm" "cpu_low_step" {
  alarm_name          = "${var.environment}-gowithsally-cpu-low-step"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "300"
  statistic           = "Average"
  threshold           = "30"
  alarm_description   = "Scale down when CPU is below 30%"
  alarm_actions       = [aws_autoscaling_policy.scale_down_step.arn]

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.gowithsally.name
  }
}

# Memory Utilization Alarm (requires CloudWatch agent metrics)
resource "aws_cloudwatch_metric_alarm" "memory_high" {
  alarm_name          = "${var.environment}-gowithsally-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "MemoryUtilization"
  namespace           = "CWAgent"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "Alert when memory usage exceeds 85%"
  treat_missing_data  = "notBreaching"

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.gowithsally.name
  }
}

# ALB Response Time Alarm
resource "aws_cloudwatch_metric_alarm" "alb_response_time" {
  alarm_name          = "${var.environment}-gowithsally-alb-response-time"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Average"
  threshold           = "1"
  alarm_description   = "Alert when response time exceeds 1 second"

  dimensions = {
    LoadBalancer = aws_lb.gowithsally.arn_suffix
  }
}

# ============================================================================
# SCHEDULED SCALING (Morocco timezone: UTC+1)
# ============================================================================

# Scale up for peak hours (9 AM - 6 PM Morocco time)
resource "aws_autoscaling_schedule" "scale_up_peak_hours" {
  scheduled_action_name  = "${var.environment}-gowithsally-scale-up-peak"
  min_size               = var.min_size
  max_size               = var.max_size
  desired_capacity       = var.max_size
  recurrence             = "0 8 * * 1-5"  # 8 AM UTC = 9 AM Morocco (Mon-Fri)
  time_zone              = "Africa/Casablanca"
  autoscaling_group_name = aws_autoscaling_group.gowithsally.name
}

# Scale down after peak hours (6 PM - 9 AM next day)
resource "aws_autoscaling_schedule" "scale_down_off_peak" {
  scheduled_action_name  = "${var.environment}-gowithsally-scale-down-off-peak"
  min_size               = var.min_size
  max_size               = var.max_size
  desired_capacity       = var.desired_capacity
  recurrence             = "0 17 * * 1-5"  # 5 PM UTC = 6 PM Morocco (Mon-Fri)
  time_zone              = "Africa/Casablanca"
  autoscaling_group_name = aws_autoscaling_group.gowithsally.name
}

# Weekend scaling (reduced capacity on weekends)
resource "aws_autoscaling_schedule" "scale_down_weekend" {
  scheduled_action_name  = "${var.environment}-gowithsally-scale-down-weekend"
  min_size               = var.min_size
  max_size               = var.max_size
  desired_capacity       = ceil(var.desired_capacity * 0.66)
  recurrence             = "0 0 * * 6"  # Saturday midnight Morocco time
  time_zone              = "Africa/Casablanca"
  autoscaling_group_name = aws_autoscaling_group.gowithsally.name
}

# Ramp up on Monday morning
resource "aws_autoscaling_schedule" "scale_up_monday" {
  scheduled_action_name  = "${var.environment}-gowithsally-scale-up-monday"
  min_size               = var.min_size
  max_size               = var.max_size
  desired_capacity       = var.desired_capacity
  recurrence             = "0 8 * * 1"  # Monday 8 AM UTC
  time_zone              = "Africa/Casablanca"
  autoscaling_group_name = aws_autoscaling_group.gowithsally.name
}

# ============================================================================
# IAM ROLES & POLICIES FOR EC2
# ============================================================================

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

  tags = var.tags
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${var.environment}-gowithsally-ec2-profile"
  role = aws_iam_role.ec2_role.name
}

resource "aws_iam_role_policy_attachment" "ssm_policy" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "cloudwatch_policy" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

# ============================================================================
# OUTPUTS
# ============================================================================

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
