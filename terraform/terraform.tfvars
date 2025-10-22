# Dash0 Configuration
# Get your auth token from https://app.dash0.com/settings/api
dash0_auth_token = "auth_omA2NwByCkjj0CHJ58L9fJABUBGEyRCf"

# Project Configuration
project_name = "apollo-router"
environment  = "demo"

# Service Names (must match your Dash0 configured service names)
router_service_name = "apollo-router-demo"
subgraph_service_names = [
  "accounts-subgraph",
  "products-subgraph-python",
  "reviews-subgraph",
  "inventory-subgraph"
]

# Feature Toggles
enable_checks           = true
enable_dashboards       = true
enable_synthetic_checks = true
enable_views            = true

# Alert Thresholds
alert_thresholds = {
  error_rate_threshold_percent = 5.0   # Alert if error rate > 5%
  latency_p95_ms              = 500    # Alert if P95 latency > 500ms
  latency_p99_ms              = 1000   # Alert if P99 latency > 1000ms
}

# Synthetic Check Configuration
synthetic_check_interval_seconds = 60  # Check every 60 seconds
synthetic_check_timeout_seconds  = 10  # Timeout after 10 seconds
