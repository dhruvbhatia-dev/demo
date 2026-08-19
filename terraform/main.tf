terraform {
    required_version = ">= 1.5.0"
    required_providers {
        aws = {
            source = "hashicorp/aws"
            version = "~> 5.0"
        }
    }
}

provider "aws" {
    region = var.region 
}

resource "aws_security_group" "ec2_sg" {
    name = "app-ec2-sg"
    description = "Allow inbound http traffic to Node.js app"

    ingress {
        from_port = 80
        to_port = 80
        protocol = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
    }

    ingress {
        from_port = 22
        to_port = 22
        protocol = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
    }

    egress {
        from_port = 0
        to_port = 0
        protocol = "-1"
        cidr_blocks = ["0.0.0.0/0"]
    }
} 

resource "aws_security_group" "rds_sg" {
    name = "app-rds-sg"
    description = "Allow db access strictly from ec2 security group"

    ingress {
        from_port = 3306
        to_port = 3306
        protocol = "tcp"
        security_groups = [aws_security_group.ec2_sg.id]
    }

    egress {
        from_port = 0
        to_port = 0
        protocol = "-1"
        cidr_blocks = ["0.0.0.0/0"]
    }
}

resource "aws_db_instance" "mysql_rds" {
    identifier           = "my-mysql-db"
    engine               = "mysql"
    engine_version       = "8.0"
    instance_class       = "db.t3.micro"
    allocated_storage     = 20

    db_name              = var.db_name
    username             = var.db_username
    password             = var.db_password
    parameter_group_name = "default.mysql8.0"
    vpc_security_group_ids = [aws_security_group.rds_sg.id]
    publicly_accessible  = false
    skip_final_snapshot  = true
}

resource "aws_secretsmanager_secret" "db_secret" {
  name        = "prod/myapp/db"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "db_secret_val" {
  secret_id     = aws_secretsmanager_secret.db_secret.id
  secret_string = jsonencode({
    host = aws_db_instance.mysql_rds.address
    username = var.db_name
    password = var.db_password
    dbname = var.db_name
    port = 3306
  })
}

resource "aws_iam_role" "ec2_role" {
    name = "app_ec2_secrets_role"

    assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_policy" "secret_policy" {
    name = "app_read-secrets_policy"

    policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "secretsmanager:GetSecretValue"
        Effect    = "Allow"
        Resource = aws_secretsmanager_secret.db_secret.arn
        }
       ]
    }) 
  }

  resource "aws_iam_role_policy_attachment" "attach_secret_policy" {
    role = aws_iam_role.ec2_role.name
    policy_arn = aws_iam_policy.secret_policy.arn
  }

  resource "aws_iam_instance_profile" "ec2_profile" {
  name = "app-ec2-instance-profile"
  role = aws_iam_role.ec2_role.name
 }



