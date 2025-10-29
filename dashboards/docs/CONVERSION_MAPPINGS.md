# Conversion Mapping Tables

This document provides structured reference tables for converting Datadog dashboards to Dash0/PromQL. Use these tables as quick lookups when building conversion rules.

---

## Table 1: Metric Type Detection Rules

**Purpose**: Determine if a metric is histogram, gauge, or sum based on metric name.

| Rule # | Pattern | Type | Confidence | Examples | Why |
|--------|---------|------|------------|----------|-----|
| H1 | Contains "duration" | histogram | High | `http.server.request.duration`, `query_planning.duration` | Time-series metrics are always histograms in OpenTelemetry |
| H2 | Contains "latency" or "time" | histogram | High | `request.latency`, `response.time` | Time-series measurements |
| H3 | Contains "size" | histogram | Medium | `request.body.size`, `response.body.size` | Distribution of payload sizes |
| G1 | Contains "cache.size" | gauge | High | `apollo.router.cache.size` | **Exception**: Cache size is gauge, not histogram |
| G2 | Contains "active" | gauge | High | `active_connections`, `active_requests` | Instantaneous values that go up/down |
| G3 | Contains "queued" or "queue" | gauge | High | `compute_job_queue_length`, `queued_requests` | Current queue depth |
| G4 | Contains "open_connections" | gauge | High | `open_connections`, `active_subscriptions` | Connections are instantaneous |
| G5 | Contains "count" (not total) | gauge | Medium | `cache.entry.count`, `session.count` | Current counts (may be exceptions) |
| S1 | Contains "operations" | sum | High | `apollo.router.operations`, `graphql.operations` | Monotonic operation counters |
| S2 | Contains ".total" | sum | High | `request.count.total`, `error.total` | Explicit counter naming |
| S3 | Contains "requests" (plural) | sum | High | `http.requests`, `graphql.requests` | Request counts are cumulative |
| S4 | Contains "errors" or "failures" | sum | High | `graphql_errors`, `execution_failures` | Error counts accumulate |
| S5 | Contains "state.change" | sum | High | `federation.state.change.total` | State transition events |

**Decision Logic**:
1. Check if metric name matches any rule in order (H→G→S)
2. Return type from first matching rule
3. Default to gauge if no rule matches
4. Document any exceptions for future reference

---

## Table 2: Aggregation Translation Patterns

**Purpose**: Convert Datadog aggregation to PromQL based on metric type.

### For Histogram Metrics

| Datadog Agg | Full Name | PromQL Pattern | Notes |
|-------------|-----------|-----------------|-------|
| `count` | Count (point-in-time) | `histogram_sum(increase({...}[5m]))` | Total count in time window |
| `count...as_rate()` | Count as rate | `histogram_sum(sum(rate({...}[5m])))` | Per-second rate |
| `count...as_count()` | Count (explicit) | `histogram_sum(increase({...}[5m]))` | Same as plain count |
| `avg` | Average | `histogram_avg(rate({...}[5m]))` | Average of histogram |
| `sum` | Sum | `histogram_sum(rate({...}[5m]))` | Sum of histogram |
| `max` | Maximum | `max(rate({...}[5m]))` | Maximum bucket value |
| `min` | Minimum | `min(rate({...}[5m]))` | Minimum bucket value |
| `p50` | 50th percentile | `histogram_quantile(0.50, rate({...}_bucket[5m]))` | Median |
| `p75` | 75th percentile | `histogram_quantile(0.75, rate({...}_bucket[5m]))` | 75th percentile |
| `p95` | 95th percentile | `histogram_quantile(0.95, rate({...}_bucket[5m]))` | 95th percentile |
| `p99` | 99th percentile | `histogram_quantile(0.99, rate({...}_bucket[5m]))` | 99th percentile |
| `p999` | 99.9th percentile | `histogram_quantile(0.999, rate({...}_bucket[5m]))` | 99.9th percentile |

**Histogram Pattern Template**:
```
When metric is histogram AND metric has no grouping:
  - count: histogram_sum(increase(...[5m]))
  - avg/sum: histogram_*(rate(...[5m]))
  - pXX: histogram_quantile(X%, sum(rate(..._bucket[5m])))

When metric is histogram AND metric has grouping by {labels}:
  - count: histogram_sum(sum by (labels) (increase(...[5m])))
  - avg/sum: histogram_*(sum by (labels) (rate(...[5m])))
  - pXX: histogram_quantile(X%, sum by (labels, le) (rate(..._bucket[5m])))
```

### For Gauge Metrics

| Datadog Agg | PromQL Pattern | Notes |
|-------------|-----------------|-------|
| `avg` | `avg({...})` | Average current value |
| `sum` | `sum({...})` | Sum current values |
| `max` | `max({...})` | Maximum current value |
| `min` | `min({...})` | Minimum current value |
| `count` | `count({...})` | Count of series |
| `p50/p95/p99` | N/A | Percentiles don't apply to gauges |

**Gauge Pattern Template**:
```
When metric is gauge:
  - avg by (labels): avg by (labels) ({...})
  - sum by (labels): sum by (labels) ({...})
  - Simple aggregation: operator({...})
  - No rate() function
```

### For Sum/Counter Metrics

| Datadog Agg | PromQL Pattern | Notes |
|-------------|-----------------|-------|
| `count` | `sum(rate({...}[5m]))` | Per-second rate |
| `count...as_count()` | `sum(increase({...}[5m]))` | Total increase |
| `count...as_rate()` | `sum(rate({...}[5m]))` | Per-second rate |
| `avg` | `avg(rate({...}[5m]))` | Average per-second rate |
| `sum` | `sum(rate({...}[5m]))` | Total per-second rate |
| `max` | `max(rate({...}[5m]))` | Maximum per-second rate |
| `min` | `min(rate({...}[5m]))` | Minimum per-second rate |
| `p50/p95/p99` | N/A | Percentiles don't apply to counters |

**Counter Pattern Template**:
```
When metric is sum (counter):
  - as_rate(): rate({...}[5m])
  - as_count(): increase({...}[5m])
  - Aggregation operators: operator(rate(...[5m]))
```

---

## Table 3: Attribute Name Mapping

**Purpose**: Convert Datadog label names to Dash0/PromQL label names.

| Datadog Attribute | Dash0 Label | Type | Example Values | Usage |
|------------------|-------------|------|------------------|-------|
| `http.response.status_code` | `http_status_code` | string | "200", "404", "500", "2xx", "5xx" | Filter by HTTP status |
| `http.request.method` | `http_method` | string | "GET", "POST", "PUT", "DELETE" | Filter by HTTP method |
| `http.route` | `http_route` | string | "/graphql", "/api/users" | Filter by route/path |
| `subgraph.name` | `subgraph_name` | string | "users", "products", "inventory" | Filter by backend service |
| `graphql.operation.name` | `graphql_operation_name` | string | "GetUser", "ListProducts" | Filter by operation name |
| `graphql.operation.type` | `graphql_operation_type` | string | "query", "mutation", "subscription" | Filter by operation type |
| `apollo_router_cache_kind` | `kind` | string | "query", "schema", "full_response" | Filter by cache type |
| `cache.type` | `storage` | string | "redis", "in_memory", "disk" | Filter by storage backend |
| `cache.storage` | `storage` | string | (same as above) | Alternative cache storage label |
| `host` | `dash0_resource_name` | string | "router-1", "router-prod-1" | Filter by host/instance |
| `pod_name` | `dash0_resource_name` | string | "apollo-router-1", "apollo-router-2" | Filter by pod (K8s) |
| `container_id` | `dash0_resource_id` | string | Container hash | Filter by container |
| `service.name` | `service_name` | string | "apollo-router" | Filter by service |
| `service.version` | `service_version` | string | "1.0.0", "1.1.0" | Filter by version |
| `service.namespace` | `service_namespace` | string | "default", "production" | Filter by namespace |
| `deployment` | `deployment` | string | "apollo-router", "router-prod" | Filter by deployment |
| `job_outcome` | `job_outcome` | string | "success", "failure", "timeout" | Filter by job result |
| `source` | `source` | string | "client", "subgraph", "cache" | Filter by source |
| `environment` | `env` | string | "prod", "staging", "dev" | Filter by environment |

**Conversion Rules**:
1. Replace all dots (`.`) with underscores (`_`)
2. Use exact case as shown in table for Dash0 labels
3. If mapping not in table, apply rule: `datadog_name.replace(/\./g, '_')`
4. Template variables (`$service`, `$env`) → remove or replace with fixed value

---

## Table 4: Panel Type Mapping

**Purpose**: Convert Datadog widget types to Dash0 panel plugin types.

| Datadog Type | Dash0 Type | Description | Best For |
|--------------|-----------|-------------|----------|
| `timeseries` | `TimeSeriesChart` | Line graph, area chart | Time-series metrics, trends |
| `query_value` | `StatChart` | Big number, gauge | Single values, percentages |
| `pie` | `PieChart` | Pie chart | Proportional breakdown |
| `heatmap` | `TimeSeriesChart` | (aggregate/summarize) | Can't directly, use aggregated line |
| `table` | (not supported) | (convert to visual) | Use TimeSeriesChart or StatChart |
| `number` | `StatChart` | Single number | Counters, gauges |
| `gauge` | `GaugeChart` | Gauge with thresholds | Current status with range |
| `bar` | `BarChart` | Bar chart | Categorical comparison |
| `histogram` | `BarChart` | Distribution | Use BarChart instead |

**Notes**:
- Most Datadog dashboards use `timeseries` and `query_value`
- Convert `heatmap` by aggregating to line (sum, avg, p95, etc.)
- Convert `table` by selecting key metrics as time series
- `BarChart` used for categorical/grouped comparisons

---

## Table 5: Modifier Translation

**Purpose**: Convert Datadog query modifiers to PromQL patterns.

| Datadog Modifier | Effect | PromQL Equivalent | When Used |
|-----------------|--------|-------------------|-----------|
| `.as_count()` | Point-in-time count | `increase({...}[window])` | With count aggregation |
| `.as_rate()` | Per-second rate | `rate({...}[window])` | With count/sum aggregation |
| `.rollup(avg, 60)` | Custom rollup | Manual aggregation | Specific intervals (rare) |
| `.fill(linear)` | Linear interpolation | (not explicit in PromQL) | Sparse data |
| `.fill(zero)` | Fill zeros | (PromQL: explicit zeros) | Missing data handling |
| None (default) | Default aggregation | Depends on aggregation | Most queries |

**Translation Rules**:
- `.as_count()` without explicit window → `increase({...}[5m])`
- `.as_rate()` without explicit window → `rate({...}[5m])`
- `.rollup()` → might need PromQL subqueries
- `.fill()` → often ignored in Dash0 (handles automatically)

---

## Table 6: Time Window Mapping

**Purpose**: Recommended time windows for different query types.

| Query Type | Recommended Window | Rationale |
|------------|-------------------|-----------|
| Histogram rate/percentile | `5m` | Balances smoothness with responsiveness |
| Histogram increase/count | `5m` | Good for bucket data |
| Counter rate (operations/sec) | `5m` | Standard for throughput metrics |
| Counter increase (total) | `5m` | Total count in reasonable window |
| Gauge average/sum | (no window) | Gauges are instant values |
| High-frequency metrics | `1m` | More responsive |
| Low-frequency metrics | `10m` or `15m` | Needs more samples for smoothing |
| Long-term trends | `30m` or `1h` | More stable, less noise |

**Dashboard Guidelines**:
- Use consistent window across all queries (default: 5m)
- Shorter window (1m): Need more responsive dashboards
- Longer window (15m+): Need smooth stable trends
- No window: For gauge metrics (instant values)

---

## Table 7: Dash0 Metric Selector Format

**Purpose**: Construct correct metric selectors for Dash0.

### Selector Components

| Component | Format | Example | Required |
|-----------|--------|---------|----------|
| Metric name | `{otel_metric_name="name"}` | `{otel_metric_name="http_server_request_duration"}` | Yes |
| Metric type | `{otel_metric_type="type"}` | `{otel_metric_type="histogram"}` | Usually |
| Custom labels | `{label="value"}` | `{http_status_code="200"}` | Optional |
| Label regex | `{label=~"pattern"}` | `{http_status_code=~"4xx\|5xx"}` | Optional |
| Multiple conditions | Comma-separated | `{otel_metric_name="...", http_status_code="200"}` | AND logic |

### Examples

```promql
# Basic selector (metric name only)
{otel_metric_name="http_server_request_duration"}

# With type (recommended)
{otel_metric_name="http_server_request_duration", otel_metric_type="histogram"}

# With label filter
{otel_metric_name="http_server_request_duration", http_status_code="200"}

# With regex (error codes)
{otel_metric_name="http_server_request_duration", http_status_code=~"4xx|5xx"}

# With type and multiple labels
{
  otel_metric_name="apollo_router_cache_hit_time",
  otel_metric_type="histogram",
  kind="query"
}
```

---

## Table 8: Query Decision Tree

**Purpose**: Quick decision guide for choosing PromQL pattern.

```
START: You have a Datadog query
│
├─ Step 1: Extract metric name
│  └─ Write it down (e.g., "http.server.request.duration")
│
├─ Step 2: Determine metric type (Table 1)
│  ├─ Is it in "duration/latency/time" rules? → HISTOGRAM
│  ├─ Is it "cache.size" or "active" or "queue"? → GAUGE
│  ├─ Is it "operations" or ".total" or "errors"? → SUM
│  └─ Default if unsure → GAUGE
│
├─ Step 3: Extract aggregation
│  ├─ p50/p95/p99 → Percentile (histogram only)
│  ├─ count → Count aggregation
│  ├─ avg/sum/max/min → Stat aggregation
│  └─ Check for modifiers: .as_rate(), .as_count()
│
├─ Step 4: Check for grouping
│  ├─ "by {labels}" in query? → Note the labels
│  └─ No grouping? → Aggregate to single series
│
├─ Step 5: Select pattern (Table 2)
│  ├─ Metric type: HISTOGRAM
│  │  ├─ Aggregation: count
│  │  │  └─ Pattern: histogram_sum(increase(...))
│  │  ├─ Aggregation: avg
│  │  │  └─ Pattern: histogram_avg(rate(...))
│  │  ├─ Aggregation: pXX
│  │  │  └─ Pattern: histogram_quantile(X%, rate(..._bucket))
│  │  └─ (etc.)
│  ├─ Metric type: GAUGE
│  │  └─ Pattern: operator({...}) with NO rate()
│  └─ Metric type: SUM
│     ├─ Modifier: .as_rate()
│     │  └─ Pattern: rate({...})
│     └─ Modifier: .as_count()
│        └─ Pattern: increase({...})
│
├─ Step 6: Map attribute names (Table 3)
│  └─ Replace each "dot.name" with "dot_name"
│
└─ Step 7: Build PromQL
   └─ Combine: pattern + selector + grouping
```

---

## Quick Lookup Examples

### Example 1: "What PromQL for p95 histogram with grouping?"

1. Find "p95" in Table 2, Histogram section
2. Pattern: `histogram_quantile(0.95, sum by (labels, le) (rate({...}_bucket[5m])))`
3. Remember: Must include `le` in grouping
4. Map label names using Table 3

### Example 2: "Is cache.size a histogram?"

1. Look in Table 1
2. Find rule G1: "cache.size" → gauge (exception)
3. Use gauge pattern from Table 2

### Example 3: "What's the Dash0 label for http.response.status_code?"

1. Look in Table 3
2. Find mapping: `http.response.status_code` → `http_status_code`
3. Replace dot with underscore

### Example 4: "Which panel type for throughput metric?"

1. Look in Table 4
2. Datadog type: `timeseries` → Dash0: `TimeSeriesChart`
3. Use TimeSeriesChart plugin

---

## Validation Checklist

Before submitting a converted query:

- [ ] Metric name uses underscores not dots
- [ ] Metric type matches Table 1 rules
- [ ] Aggregation pattern from Table 2 is correct
- [ ] All attribute names mapped using Table 3
- [ ] Time window specified (or none for gauges)
- [ ] Percentile queries include `le` label
- [ ] No `rate()` on gauge metrics
- [ ] Panel type from Table 4 is appropriate
- [ ] Query returns data in Dash0
- [ ] Numbers match expected values

---

## References

- **Metric Types**: Table 1 (Metric Type Detection Rules)
- **Query Patterns**: Table 2 (Aggregation Translation)
- **Label Mapping**: Table 3 (Attribute Name Mapping)
- **Panel Types**: Table 4 (Panel Type Mapping)
- **Full Guides**: See PROMQL_REFERENCE.md and DATADOG_QUERY_REFERENCE.md
