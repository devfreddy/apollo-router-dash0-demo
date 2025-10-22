variable "dash0_auth_token" {
  description = "Dash0 authorization token for API access"
  type        = string
  sensitive   = true
}

variable "dataset" {
  description = "Dash0 dataset name for storing resources"
  type        = string
  default     = "default"
}

variable "project_name" {
  description = "Project name for naming conventions"
  type        = string
  default     = "apollo-router"
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
  default     = "demo"
}

variable "router_service_name" {
  description = "Apollo Router service name in Dash0"
  type        = string
  default     = "apollo-router-demo"
}

variable "subgraph_service_names" {
  description = "Subgraph service names in Dash0"
  type        = list(string)
  default = [
    "accounts-subgraph",
    "products-subgraph-python",
    "reviews-subgraph",
    "inventory-subgraph"
  ]
}

variable "enable_checks" {
  description = "Enable creation of alert checks"
  type        = bool
  default     = true
}

variable "enable_dashboards" {
  description = "Enable creation of dashboards"
  type        = bool
  default     = true
}

variable "enable_synthetic_checks" {
  description = "Enable creation of synthetic checks"
  type        = bool
  default     = true
}

variable "enable_views" {
  description = "Enable creation of custom views"
  type        = bool
  default     = true
}

variable "alert_thresholds" {
  description = "Alert thresholds for checks"
  type = object({
    error_rate_threshold_percent = number
    latency_p95_ms              = number
    latency_p99_ms              = number
  })
  default = {
    error_rate_threshold_percent = 5.0
    latency_p95_ms              = 500
    latency_p99_ms              = 1000
  }
}

variable "synthetic_check_interval_seconds" {
  description = "Interval for synthetic checks in seconds"
  type        = number
  default     = 60
}

variable "synthetic_check_timeout_seconds" {
  description = "Timeout for synthetic checks in seconds"
  type        = number
  default     = 10
}
