variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDR blocks"
  type        = list(string)
}

variable "private_subnet_cidrs" {
  description = "Private subnet CIDR blocks"
  type        = list(string)
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
}

variable "tags" {
  description = "Tags for resources"
  type        = map(string)
}

# ============================================================================
# VPC
# ============================================================================

resource "aws_vpc" "gowithsally" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-gowithsally-vpc"
    }
  )
}

# ============================================================================
# INTERNET GATEWAY
# ============================================================================

resource "aws_internet_gateway" "gowithsally" {
  vpc_id = aws_vpc.gowithsally.id

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-gowithsally-igw"
    }
  )
}

# ============================================================================
# PUBLIC SUBNETS
# ============================================================================

resource "aws_subnet" "public" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.gowithsally.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index % length(var.availability_zones)]
  map_public_ip_on_launch = true

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-public-subnet-${count.index + 1}"
      Type = "Public"
    }
  )
}

# ============================================================================
# PRIVATE SUBNETS
# ============================================================================

resource "aws_subnet" "private" {
  count             = length(var.private_subnet_cidrs)
  vpc_id            = aws_vpc.gowithsally.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index % length(var.availability_zones)]

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-private-subnet-${count.index + 1}"
      Type = "Private"
    }
  )
}

# ============================================================================
# ELASTIC IPs FOR NAT GATEWAYS
# ============================================================================

resource "aws_eip" "nat" {
  count  = length(var.public_subnet_cidrs)
  domain = "vpc"

  depends_on = [aws_internet_gateway.gowithsally]

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-nat-eip-${count.index + 1}"
    }
  )
}

# ============================================================================
# NAT GATEWAYS
# ============================================================================

resource "aws_nat_gateway" "gowithsally" {
  count         = length(var.public_subnet_cidrs)
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  depends_on = [aws_internet_gateway.gowithsally]

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-nat-gateway-${count.index + 1}"
    }
  )
}

# ============================================================================
# PUBLIC ROUTE TABLE
# ============================================================================

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.gowithsally.id

  route {
    cidr_block      = "0.0.0.0/0"
    gateway_id      = aws_internet_gateway.gowithsally.id
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-public-rt"
    }
  )
}

# Public Route Table Association
resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# ============================================================================
# PRIVATE ROUTE TABLES
# ============================================================================

resource "aws_route_table" "private" {
  count  = length(var.private_subnet_cidrs)
  vpc_id = aws_vpc.gowithsally.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.gowithsally[count.index % length(aws_nat_gateway.gowithsally)].id
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-private-rt-${count.index + 1}"
    }
  )
}

# Private Route Table Association
resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# ============================================================================
# SECURITY GROUPS
# ============================================================================

# ALB Security Group
resource "aws_security_group" "alb" {
  name        = "${var.environment}-gowithsally-alb-sg"
  description = "Security group for ALB"
  vpc_id      = aws_vpc.gowithsally.id

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-alb-sg"
    }
  )
}

resource "aws_security_group_rule" "alb_http" {
  type              = "ingress"
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.alb.id
}

resource "aws_security_group_rule" "alb_https" {
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.alb.id
}

resource "aws_security_group_rule" "alb_egress" {
  type              = "egress"
  from_port         = 0
  to_port           = 65535
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.alb.id
}

# Application Security Group
resource "aws_security_group" "app" {
  name        = "${var.environment}-gowithsally-app-sg"
  description = "Security group for application servers"
  vpc_id      = aws_vpc.gowithsally.id

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-app-sg"
    }
  )
}

resource "aws_security_group_rule" "app_from_alb" {
  type                     = "ingress"
  from_port                = 3000
  to_port                  = 3001
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.alb.id
  security_group_id        = aws_security_group.app.id
}

resource "aws_security_group_rule" "app_ssh" {
  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = [var.vpc_cidr]
  security_group_id = aws_security_group.app.id
}

resource "aws_security_group_rule" "app_egress" {
  type              = "egress"
  from_port         = 0
  to_port           = 65535
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.app.id
}

# Database Security Group
resource "aws_security_group" "database" {
  name        = "${var.environment}-gowithsally-db-sg"
  description = "Security group for database"
  vpc_id      = aws_vpc.gowithsally.id

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-db-sg"
    }
  )
}

resource "aws_security_group_rule" "db_from_app" {
  type                     = "ingress"
  from_port                = 27017
  to_port                  = 27017
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.app.id
  security_group_id        = aws_security_group.database.id
}

resource "aws_security_group_rule" "db_egress" {
  type              = "egress"
  from_port         = 0
  to_port           = 65535
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.database.id
}

# Redis Security Group
resource "aws_security_group" "redis" {
  name        = "${var.environment}-gowithsally-redis-sg"
  description = "Security group for Redis"
  vpc_id      = aws_vpc.gowithsally.id

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-redis-sg"
    }
  )
}

resource "aws_security_group_rule" "redis_from_app" {
  type                     = "ingress"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.app.id
  security_group_id        = aws_security_group.redis.id
}

resource "aws_security_group_rule" "redis_egress" {
  type              = "egress"
  from_port         = 0
  to_port           = 65535
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.redis.id
}

# EFS Security Group
resource "aws_security_group" "efs" {
  name        = "${var.environment}-gowithsally-efs-sg"
  description = "Security group for EFS"
  vpc_id      = aws_vpc.gowithsally.id

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-efs-sg"
    }
  )
}

resource "aws_security_group_rule" "efs_from_app" {
  type                     = "ingress"
  from_port                = 2049
  to_port                  = 2049
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.app.id
  security_group_id        = aws_security_group.efs.id
}

resource "aws_security_group_rule" "efs_egress" {
  type              = "egress"
  from_port         = 0
  to_port           = 65535
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.efs.id
}

# ============================================================================
# OUTPUTS
# ============================================================================

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
