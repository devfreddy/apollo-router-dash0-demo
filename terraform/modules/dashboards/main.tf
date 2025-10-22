# Apollo Router Performance Dashboard
resource "dash0_dashboard" "router_performance" {
  dataset = var.dataset

  dashboard_yaml = yamlencode({
    apiVersion = "v1"
    kind       = "Dashboard"
    metadata = {
      name = "${var.project_name}-router-performance"
    }
    spec = {
      displayName = "${var.project_name} - Router Performance"
      description = "Comprehensive Apollo Router performance metrics"
      variables   = []
      layouts = [
        {
          key     = "grid"
          type    = "grid"
          columns = 24
        }
      ]
      panels = [
        {
          kind = "Panel"
          spec = {
            displayName = "Request Volume (RPS)"
            panelType   = "LineChart"
            targets = [
              {
                expr = "sum(rate(http_server_request_duration_bucket{service_name=\"${var.router_service_name}\"}[1m]))"
              }
            ]
          }
        },
        {
          kind = "Panel"
          spec = {
            displayName = "Error Rate (%)"
            panelType   = "LineChart"
            targets = [
              {
                expr = "((sum(rate(http_server_request_duration_bucket{service_name=\"${var.router_service_name}\",http_response_status_code=~\"[45]..\"}[5m])) or on() vector(0))) / ((sum(rate(http_server_request_duration_bucket{service_name=\"${var.router_service_name}\"}[5m])) or on() vector(1))) * 100"
              }
            ]
          }
        },
        {
          kind = "Panel"
          spec = {
            displayName = "P95 Latency (ms)"
            panelType   = "LineChart"
            targets = [
              {
                expr = "histogram_quantile(0.95, rate(http_server_request_duration_bucket{service_name=\"${var.router_service_name}\"}[5m])) * 1000"
              }
            ]
          }
        },
        {
          kind = "Panel"
          spec = {
            displayName = "P99 Latency (ms)"
            panelType   = "LineChart"
            targets = [
              {
                expr = "histogram_quantile(0.99, rate(http_server_request_duration_bucket{service_name=\"${var.router_service_name}\"}[5m])) * 1000"
              }
            ]
          }
        }
      ]
    }
  })
}

# Subgraph Performance Dashboard
resource "dash0_dashboard" "subgraph_performance" {
  dataset = var.dataset

  dashboard_yaml = yamlencode({
    apiVersion = "v1"
    kind       = "Dashboard"
    metadata = {
      name = "${var.project_name}-subgraph-performance"
    }
    spec = {
      displayName = "${var.project_name} - Subgraph Performance"
      description = "Subgraph request latency and error rates"
      variables   = []
      layouts = [
        {
          key     = "grid"
          type    = "grid"
          columns = 24
        }
      ]
      panels = [
        {
          kind = "Panel"
          spec = {
            displayName = "Subgraph Throughput (RPS)"
            panelType   = "LineChart"
            targets = [
              {
                expr = "sum by (server_address) (rate(http_client_request_duration_bucket{service_name=\"${var.router_service_name}\"}[1m]))"
              }
            ]
          }
        },
        {
          kind = "Panel"
          spec = {
            displayName = "Subgraph P95 Latency (ms)"
            panelType   = "LineChart"
            targets = [
              {
                expr = "histogram_quantile(0.95, sum by (server_address) (rate(http_client_request_duration_bucket{service_name=\"${var.router_service_name}\"}[5m]))) * 1000"
              }
            ]
          }
        },
        {
          kind = "Panel"
          spec = {
            displayName = "Subgraph Error Rate (%)"
            panelType   = "LineChart"
            targets = [
              {
                expr = "((sum by (server_address) (rate(http_client_request_duration_bucket{service_name=\"${var.router_service_name}\",http_response_status_code=~\"[45]..\"}[5m])) or on() vector(0))) / ((sum by (server_address) (rate(http_client_request_duration_bucket{service_name=\"${var.router_service_name}\"}[5m])) or on() vector(1))) * 100"
              }
            ]
          }
        }
      ]
    }
  })
}

# Query Planning & Cache Dashboard
resource "dash0_dashboard" "query_planning" {
  dataset = var.dataset

  dashboard_yaml = yamlencode({
    apiVersion = "v1"
    kind       = "Dashboard"
    metadata = {
      name = "${var.project_name}-query-planning"
    }
    spec = {
      displayName = "${var.project_name} - Query Planning & Cache"
      description = "GraphQL query planning duration and cache metrics"
      variables   = []
      layouts = [
        {
          key     = "grid"
          type    = "grid"
          columns = 24
        }
      ]
      panels = [
        {
          kind = "Panel"
          spec = {
            displayName = "Query Plan Duration (ms)"
            panelType   = "LineChart"
            targets = [
              {
                expr = "histogram_quantile(0.95, rate(apollo_router_query_planning_duration_bucket{service_name=\"${var.router_service_name}\"}[5m])) * 1000"
              }
            ]
          }
        },
        {
          kind = "Panel"
          spec = {
            displayName = "Cache Hit Ratio (%)"
            panelType   = "LineChart"
            targets = [
              {
                expr = "((sum(rate(apollo_router_cache_hit_total{service_name=\"${var.router_service_name}\"}[5m])) or on() vector(0))) / ((sum(rate(apollo_router_cache_hit_total{service_name=\"${var.router_service_name}\"}[5m])) or on() vector(0)) + (sum(rate(apollo_router_cache_miss_total{service_name=\"${var.router_service_name}\"}[5m])) or on() vector(0))) * 100"
              }
            ]
          }
        }
      ]
    }
  })
}

# Resource Utilization Dashboard
resource "dash0_dashboard" "resource_utilization" {
  dataset = var.dataset

  dashboard_yaml = yamlencode({
    apiVersion = "v1"
    kind       = "Dashboard"
    metadata = {
      name = "${var.project_name}-resource-utilization"
    }
    spec = {
      displayName = "${var.project_name} - Resource Utilization"
      description = "CPU, memory, and system resource usage"
      variables   = []
      layouts = [
        {
          key     = "grid"
          type    = "grid"
          columns = 24
        }
      ]
      panels = [
        {
          kind = "Panel"
          spec = {
            displayName = "CPU Usage (%)"
            panelType   = "LineChart"
            targets = [
              {
                expr = "rate(process_cpu_seconds_total{service_name=\"${var.router_service_name}\"}[1m]) * 100"
              }
            ]
          }
        },
        {
          kind = "Panel"
          spec = {
            displayName = "Memory Usage (MB)"
            panelType   = "LineChart"
            targets = [
              {
                expr = "process_resident_memory_bytes{service_name=\"${var.router_service_name}\"} / 1024 / 1024"
              }
            ]
          }
        },
        {
          kind = "Panel"
          spec = {
            displayName = "Heap Memory (MB)"
            panelType   = "LineChart"
            targets = [
              {
                expr = "process_virtual_memory_bytes{service_name=\"${var.router_service_name}\"} / 1024 / 1024"
              }
            ]
          }
        }
      ]
    }
  })
}

# GraphQL Errors Dashboard
resource "dash0_dashboard" "graphql_errors" {
  dataset = var.dataset

  dashboard_yaml = yamlencode({
    apiVersion = "v1"
    kind       = "Dashboard"
    metadata = {
      name = "${var.project_name}-graphql-errors"
    }
    spec = {
      displayName = "${var.project_name} - GraphQL Errors"
      description = "GraphQL request errors and error distribution"
      variables   = []
      layouts = [
        {
          key     = "grid"
          type    = "grid"
          columns = 24
        }
      ]
      panels = [
        {
          kind = "Panel"
          spec = {
            displayName = "GraphQL Error Rate"
            panelType   = "LineChart"
            targets = [
              {
                expr = "sum(rate(graphql_errors_total{service_name=\"${var.router_service_name}\"}[5m])) or on() vector(0)"
              }
            ]
          }
        },
        {
          kind = "Panel"
          spec = {
            displayName = "Errors by Type"
            panelType   = "BarChart"
            targets = [
              {
                expr = "sum by (error_type) (rate(graphql_errors_total{service_name=\"${var.router_service_name}\"}[5m])) or on() vector(0)"
              }
            ]
          }
        }
      ]
    }
  })
}
