# Check Rules Module

## Status: ✅ Working

This module creates PrometheusRule-based alert checks for monitoring the Apollo Router and its subgraphs.

## Overview

The module creates **12 alert checks** in total:

### Router Checks (4)
- **Error Rate** - Alerts when error rate exceeds 5%
- **P95 Latency** - Alerts when 95th percentile latency exceeds 500ms
- **P99 Latency** - Alerts when 99th percentile latency exceeds 1000ms
- **Availability** - Critical alert when router instance is down

### Subgraph Checks (8)
For each of the 4 subgraphs (accounts, products, reviews, inventory):
- **Error Rate Check** - Per-subgraph error rate monitoring
- **Latency Check** - Per-subgraph P95 latency monitoring

## Format

The module uses the **PrometheusRule** format for check_rule_yaml:

```hcl
resource "dash0_check_rule" "example" {
  dataset         = var.dataset
  check_rule_yaml = <<-EOF
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: example-check
spec:
  groups:
    - name: AlertGroup
      interval: 1m0s
      rules:
        - alert: ExampleAlert
          expr: some_metric > threshold
          for: 2m
          annotations:
            summary: "Alert summary"
            description: "Alert description"
            dash0-threshold-critical: "10"
            dash0-threshold-degraded: "5"
            dash0-enabled: "true"
          labels:
            severity: warning
            env: demo
EOF
}
```

## Key Features

- **PrometheusRule Format**: Uses standard Kubernetes monitoring format
- **Per-Subgraph Monitoring**: Independent checks for each subgraph
- **Configurable Thresholds**: Error rates and latency thresholds via `.env`
- **Dash0 Annotations**: Includes `dash0-threshold-*` annotations for UI integration

## Configuration

Edit alert thresholds in `.env`:

```bash
# Error rate threshold (percentage)
TERRAFORM_ERROR_RATE_THRESHOLD="5.0"

# Latency thresholds (milliseconds)
TERRAFORM_LATENCY_P95_MS="500"
TERRAFORM_LATENCY_P99_MS="1000"
```

Then re-apply:
```bash
./terraform.sh apply
```

## Files

- [main.tf](./main.tf) - All check rule definitions
- [variables.tf](./variables.tf) - Input variables
- [outputs.tf](./outputs.tf) - Resource IDs
- [README.md](./README.md) - This file

## Related Resources

- 📊 [Dashboards Module](../dashboards/) - Visual monitoring dashboards
- 🔍 [Synthetic Checks Module](../synthetic_checks/) - External endpoint monitoring
- 👁️ [Views Module](../views/) - Custom log/trace views

## Disable

To disable check creation:
```bash
TERRAFORM_ENABLE_CHECKS="false"
./terraform.sh apply
```
