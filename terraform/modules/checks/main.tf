# Router Error Rate Check
resource "dash0_check_rule" "router_error_rate" {
  dataset = var.dataset
  check_rule_yaml = templatefile("${path.module}/rules/router-error-rate.yaml", {
    router_service_name           = var.router_service_name
    error_rate_threshold          = var.error_rate_threshold
    error_rate_threshold_critical = var.error_rate_threshold * 2
    environment                   = var.environment
  })

  lifecycle {
    ignore_changes = [check_rule_yaml]
  }
}

# Router P95 Latency Check
resource "dash0_check_rule" "router_latency_p95" {
  dataset = var.dataset
  check_rule_yaml = templatefile("${path.module}/rules/router-latency-p95.yaml", {
    router_service_name             = var.router_service_name
    latency_p95_threshold           = var.latency_p95_threshold
    latency_p95_threshold_critical  = var.latency_p95_threshold * 2
    environment                     = var.environment
  })

  lifecycle {
    ignore_changes = [check_rule_yaml]
  }
}

# Router P99 Latency Check
resource "dash0_check_rule" "router_latency_p99" {
  dataset = var.dataset
  check_rule_yaml = templatefile("${path.module}/rules/router-latency-p99.yaml", {
    router_service_name             = var.router_service_name
    latency_p99_threshold           = var.latency_p99_threshold
    latency_p99_threshold_critical  = var.latency_p99_threshold * 2
    environment                     = var.environment
  })

  lifecycle {
    ignore_changes = [check_rule_yaml]
  }
}

# Router Availability Check
resource "dash0_check_rule" "router_availability" {
  dataset = var.dataset
  check_rule_yaml = templatefile("${path.module}/rules/router-availability.yaml", {
    router_service_name = var.router_service_name
    environment         = var.environment
  })

  lifecycle {
    ignore_changes = [check_rule_yaml]
  }
}

# Subgraph Latency Checks
resource "dash0_check_rule" "subgraph_latency" {
  for_each = toset(var.subgraph_services)

  dataset = var.dataset
  check_rule_yaml = templatefile("${path.module}/rules/subgraph-latency.yaml", {
    router_service_name             = var.router_service_name
    subgraph_name                   = each.value
    subgraph_alert_name             = replace(upper(each.value), "-", "_")
    latency_p95_threshold           = var.latency_p95_threshold
    latency_p95_threshold_critical  = var.latency_p95_threshold * 2
    environment                     = var.environment
  })

  lifecycle {
    ignore_changes = [check_rule_yaml]
  }
}

# Subgraph Error Rate Checks
resource "dash0_check_rule" "subgraph_errors" {
  for_each = toset(var.subgraph_services)

  dataset = var.dataset
  check_rule_yaml = templatefile("${path.module}/rules/subgraph-error-rate.yaml", {
    router_service_name             = var.router_service_name
    subgraph_name                   = each.value
    subgraph_alert_name             = replace(upper(each.value), "-", "_")
    error_rate_threshold            = var.error_rate_threshold
    error_rate_threshold_critical   = var.error_rate_threshold * 2
    environment                     = var.environment
  })

  lifecycle {
    ignore_changes = [check_rule_yaml]
  }
}
