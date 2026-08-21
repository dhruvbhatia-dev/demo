output "rds_endpoint" {
  value = aws_db_instance.mysql_rds.endpoint
}

output "secrets_manager_arn" {
  value = aws_secretsmanager_secret.db_secret.arn
}

output "ec2_instance_profile_name" {
  value = aws_iam_instance_profile.ec2_profile.name
}