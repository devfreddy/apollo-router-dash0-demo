variable "dataset" {
  description = "Dash0 dataset name"
  type        = string
}

variable "router_service_name" {
  description = "Apollo Router service name"
  type        = string
}

variable "subgraph_services" {
  description = "List of subgraph service names"
  type        = list(string)
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "error_rate_threshold" {
  description = "Error rate threshold as percentage"
  type        = number
  default     = 5.0
}

variable "latency_p95_threshold" {
  description = "P95 latency threshold in milliseconds"
  type        = number
  default     = 500
}

variable "latency_p99_threshold" {
  description = "P99 latency threshold in milliseconds"
  type        = number
  default     = 1000
}
