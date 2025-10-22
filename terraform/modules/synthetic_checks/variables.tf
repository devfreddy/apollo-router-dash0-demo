variable "dataset" {
  description = "Dash0 dataset name"
  type        = string
}

variable "router_service_name" {
  description = "Apollo Router service name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "check_interval_seconds" {
  description = "Interval for synthetic checks in seconds"
  type        = number
  default     = 60
}

variable "check_timeout_seconds" {
  description = "Timeout for synthetic checks in seconds"
  type        = number
  default     = 10
}

variable "router_endpoint" {
  description = "Apollo Router GraphQL endpoint URL"
  type        = string
  default     = "http://localhost:4000/graphql"
}

# NOTE: Synthetic checks are disabled by default (TERRAFORM_ENABLE_SYNTHETIC_CHECKS=false)
# This is intentional for local-only deployments because:
# - Dash0 synthetic checks run from external monitoring locations
# - They cannot reach localhost endpoints from their external probes
#
# To enable synthetic checks:
# 1. Expose your local router publicly (e.g., using ngrok or Cloudflare Tunnel)
# 2. Update router_endpoint to point to the public URL
# 3. Set TERRAFORM_ENABLE_SYNTHETIC_CHECKS=true in .env
# 4. Re-run: ./terraform.sh apply
