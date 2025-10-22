output "check_ids" {
  description = "IDs of created check rules"
  value = {
    router_error_rate     = try(dash0_check_rule.router_error_rate.origin, "")
    router_latency_p95    = try(dash0_check_rule.router_latency_p95.origin, "")
    router_latency_p99    = try(dash0_check_rule.router_latency_p99.origin, "")
    router_availability   = try(dash0_check_rule.router_availability.origin, "")
    subgraph_latency      = { for k, v in dash0_check_rule.subgraph_latency : k => v.origin }
    subgraph_error_rates  = { for k, v in dash0_check_rule.subgraph_errors : k => v.origin }
  }
}
