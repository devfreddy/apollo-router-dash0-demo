output "checks" {
  description = "Created alert checks"
  value       = var.enable_checks ? module.checks[0].check_ids : {
    router_error_rate     = ""
    router_latency_p95    = ""
    router_latency_p99    = ""
    router_availability   = ""
    subgraph_latency      = {}
    subgraph_error_rates  = {}
  }
}

output "dashboards" {
  description = "Created dashboards"
  value       = var.enable_dashboards ? module.dashboards[0].dashboard_ids : {}
}

output "synthetic_checks" {
  description = "Created synthetic checks (placeholder - to be implemented)"
  value       = {}
}

output "views" {
  description = "Created views (placeholder - to be implemented)"
  value       = {}
}
