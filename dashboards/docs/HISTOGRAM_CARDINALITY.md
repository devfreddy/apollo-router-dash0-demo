# Understanding Histogram Cardinality Issues

## Problem: "Why am I seeing 300 time series for a single percentile query?"

When querying histogram percentiles without an explicit GROUP BY clause, you might see multiple time series instead of a single aggregated line. This document explains why and how to fix it.

## How Histograms Work in OpenTelemetry/Prometheus

OpenTelemetry histograms are represented as multiple "bucket" metrics, each with a special `le` (less-than-or-equal) label:

```
http_server_request_duration_bucket{le="0.001", service="apollo-router", graphql_operation_name="GetUser"}
http_server_request_duration_bucket{le="0.01", service="apollo-router", graphql_operation_name="GetUser"}
http_server_request_duration_bucket{le="0.1", service="apollo-router", graphql_operation_name="GetUser"}
...
http_server_request_duration_bucket{le="+Inf", service="apollo-router", graphql_operation_name="GetUser"}

http_server_request_duration_bucket{le="0.001", service="apollo-router", graphql_operation_name="ListUsers"}
http_server_request_duration_bucket{le="0.01", service="apollo-router", graphql_operation_name="ListUsers"}
...
```

**Key point**: Each unique combination of labels creates a SEPARATE set of buckets.

## The Cardinality Explosion

For `http.server.request.duration` in the Apollo Router demo, we have:

| Label | Unique Values | Examples |
|-------|---------------|----------|
| `graphql_operation_name` | ~30+ | AccountsMe, AccountsUsers, Large, Products0, Reviews1, ... |
| `graphql_errors` | 2 | true, false |
| `http_response_status_code` | 2 | 200, 400 |
| `error_type` | 2 | "Bad Request", empty |
| `le` (bucket) | ~10-15 | 0.001, 0.01, 0.1, 1.0, +Inf |
| Other labels | 1 each | service, version, etc. |

**Total time series = 30 operations × 2 errors × 2 statuses × 2 error_types × 12 buckets = ~2,880 combinations**

(You're seeing ~300 because not all combinations are represented in the actual data)

## PromQL Query Approaches

### ❌ WRONG: `sum without (le)` - Keeps all other labels

```promql
histogram_quantile(0.99, sum without (le) (rate({...}[2m])))
```

Result: One percentile line per unique (graphql_operation_name, graphql_errors, http_response_status_code, error_type) combination = ~240+ time series

This is what you were seeing!

### ✅ CORRECT: `sum(...)` - Aggregates everything

```promql
histogram_quantile(0.99, sum(rate({...}[2m])))
```

Result: Single time series with aggregated percentile across all dimensions

**How it works**:
1. `rate(...)` calculates per-second rate for each bucket-label combination
2. `sum(...)` aggregates all those rates together, collapsing all labels
3. The result is a single set of bucket values that spans all label combinations
4. `histogram_quantile()` calculates the 99th percentile from this aggregated data

### ⚠️ CONDITIONAL: `sum by (labels, le)` - Keeps specific dimensions

```promql
histogram_quantile(0.99, sum by (graphql_operation_name, le) (rate({...}[2m])))
```

Result: One percentile line per graphql_operation_name = ~30 time series

Use this when you WANT to see percentiles broken down by a specific dimension.

## Datadog Behavior

When Datadog sees a query like:
```
p99:http.server.request.duration{$service,$env}
```

With **no `by` clause**, it automatically aggregates across ALL other dimensions. The equivalent PromQL is:

```promql
histogram_quantile(0.99, sum(rate({otel_metric_name = "http.server.request.duration", otel_metric_type = "histogram"}[2m])))
```

## Current Implementation

The converter now uses:

**With GROUP BY:**
```promql
histogram_quantile(0.99, sum by (label, le) (rate(...)))
```
→ Breaks down by the specified label(s)

**Without GROUP BY:**
```promql
histogram_quantile(0.99, sum(rate(...)))
```
→ Single aggregated percentile

## Potential Issues in Dash0

If you're still seeing multiple series:

1. **Dash0 might not support `sum(rate())` on delta-temporality histograms**
   - Dash0 documented support for `histogram_sum()`, `histogram_avg()`, `histogram_quantile()`
   - But might not support intermediate `sum()` aggregations on raw histogram data

2. **Check the metric temporality in your router config**
   - If using delta temporality, the aggregation behavior changes
   - Confirm `router.yaml` has temporality settings

3. **Try using Dash0 native functions**
   - Instead of `histogram_quantile(0.99, sum(rate(...)))`
   - Try just `histogram_quantile(0.99, rate(...))`
   - Let Dash0 handle the aggregation internally

## Testing

To debug this in Dash0:

1. Run a simple count query to see how many series exist:
   ```promql
   count({otel_metric_name = "http.server.request.duration", otel_metric_type = "histogram"})
   ```

2. Run with aggregation:
   ```promql
   sum(rate({otel_metric_name = "http.server.request.duration", otel_metric_type = "histogram"}[2m]))
   ```
   - Should produce a single time series

3. Then wrap with histogram_quantile:
   ```promql
   histogram_quantile(0.99, sum(rate({otel_metric_name = "http.server.request.duration", otel_metric_type = "histogram"}[2m])))
   ```
   - Should still be a single time series

## See Also

- [MODULE_REFERENCE.md](MODULE_REFERENCE.md) - Understanding the converter code
- [PROMQL_REFERENCE.md](PROMQL_REFERENCE.md) - PromQL function documentation
- [CONVERSION_MAPPINGS.md](CONVERSION_MAPPINGS.md) - How Datadog patterns map to PromQL
