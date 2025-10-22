output "dashboard_ids" {
  description = "IDs of created dashboards"
  value = {
    router_performance   = try(dash0_dashboard.router_performance.origin, "")
    subgraph_performance = try(dash0_dashboard.subgraph_performance.origin, "")
    query_planning       = try(dash0_dashboard.query_planning.origin, "")
    resource_utilization = try(dash0_dashboard.resource_utilization.origin, "")
    graphql_errors       = try(dash0_dashboard.graphql_errors.origin, "")
  }
}
