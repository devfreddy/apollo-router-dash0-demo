module "checks" {
  source = "./modules/checks"
  count  = var.enable_checks ? 1 : 0

  dataset             = var.dataset
  router_service_name = var.router_service_name
  subgraph_services   = var.subgraph_service_names
  environment         = var.environment
  project_name        = var.project_name

  error_rate_threshold   = var.alert_thresholds.error_rate_threshold_percent
  latency_p95_threshold  = var.alert_thresholds.latency_p95_ms
  latency_p99_threshold  = var.alert_thresholds.latency_p99_ms
}

module "dashboards" {
  source = "./modules/dashboards"
  count  = var.enable_dashboards ? 1 : 0

  dataset             = var.dataset
  router_service_name = var.router_service_name
  subgraph_services   = var.subgraph_service_names
  environment         = var.environment
  project_name        = var.project_name
}

module "synthetic_checks" {
  source = "./modules/synthetic_checks"
  count  = var.enable_synthetic_checks ? 1 : 0

  dataset             = var.dataset
  router_service_name = var.router_service_name
  environment         = var.environment
  project_name        = var.project_name

  check_interval_seconds = var.synthetic_check_interval_seconds
  check_timeout_seconds  = var.synthetic_check_timeout_seconds
}

module "views" {
  source = "./modules/views"
  count  = var.enable_views ? 1 : 0

  dataset             = var.dataset
  router_service_name = var.router_service_name
  subgraph_services   = var.subgraph_service_names
  environment         = var.environment
  project_name        = var.project_name
}
