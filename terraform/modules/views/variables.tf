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
