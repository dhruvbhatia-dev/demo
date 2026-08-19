variable "region" {
    type = string
    default = "ap-south-1"
}

variable "db_name" {
    type = string
    default = "mydb"
}

variable "db_username" {
    type = string
    default = "appuser"
}

variable "db_password" {
    type = string
    description = "Master password for RDS Database"
    sensitive = true
}