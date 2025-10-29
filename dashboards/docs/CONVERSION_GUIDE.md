# Dashboard Conversion Guide: Datadog → Dash0

## Quick Reference

This guide provides a structured approach to converting monitoring dashboards from Datadog to Dash0 (Perses format).

**For in-depth information, see:**
- [CONVERSION_STRATEGY.md](CONVERSION_STRATEGY.md) - Architectural strategy and planning
- [DATADOG_QUERY_REFERENCE.md](DATADOG_QUERY_REFERENCE.md) - Datadog query syntax
- [PROMQL_REFERENCE.md](PROMQL_REFERENCE.md) - PromQL patterns and functions
- [PERSES_DASHBOARD_FORMAT.md](PERSES_DASHBOARD_FORMAT.md) - Dash0/Perses JSON structure

---

## Conversion Workflow

### Step 1: Understand the Datadog Query

Start with a Datadog query from the template:

```
count:http.server.request.duration{$service} by {http.response.status_code}.as_count()
```

**Analyze**:
- Metric name: `http.server.request.duration`
- Aggregation: `count` + `.as_count()`
- Grouping: By `http.response.status_code`

### Step 2: Determine Metric Type

Look up the metric in the metric type reference:

| Metric | Contains | Type | Why |
|--------|----------|------|-----|
| `http.server.request.duration` | "duration" | histogram | Duration metrics are always histograms |
| `apollo.router.cache.size` | "size" | gauge | Exception: cache.size is gauge, not histogram |
| `apollo.router.operations` | "operations" | sum | Operation counts are counters |

**Decision**: `http.server.request.duration` is a **histogram**

### Step 3: Select PromQL Pattern

Based on metric type and aggregation:

| Datadog Agg | Histogram Pattern | Gauge Pattern | Counter Pattern |
|-------------|------------------|---------------|-----------------|
| `count` | `histogram_sum(increase(...))` | N/A | `sum(rate(...))` |
| `avg` | `histogram_avg(rate(...))` | `avg(...)` | `avg(rate(...))` |
| `sum` | `histogram_sum(rate(...))` | `sum(...)` | `sum(rate(...))` |
| `p95` | `histogram_quantile(0.95, rate(...))` | N/A | N/A |

**For our example**:
- Metric type: histogram
- Aggregation: count
- Pattern: `histogram_sum(increase(...))`

### Step 4: Build PromQL Query

```promql
histogram_sum(
  sum by (http_status_code) (
    increase({
      otel_metric_name="http_server_request_duration",
      otel_metric_type="histogram"
    }[5m])
  )
)
```

**Components**:
- `histogram_sum()` - Extract sum from histogram buckets
- `sum by (http_status_code)` - Group by status code
- `increase(...[5m])` - Total count over 5-minute window
- Metric selector: `{otel_metric_name="...", otel_metric_type="..."}`

### Step 5: Create Perses Panel

```json
{
  "kind": "Panel",
  "spec": {
    "display": {
      "name": "Volume of Requests Per Status Code",
      "description": "Total HTTP requests to router by response status"
    },
    "plugin": {
      "kind": "TimeSeriesChart",
      "spec": {
        "legend": {
          "position": "bottom"
        }
      }
    },
    "queries": [
      {
        "kind": "TimeSeriesQuery",
        "spec": {
          "display": {
            "name": "Requests by Status"
          },
          "plugin": {
            "kind": "PrometheusTimeSeriesQuery",
            "spec": {
              "query": "histogram_sum(sum by (http_status_code) (increase({otel_metric_name=\"http_server_request_duration\",otel_metric_type=\"histogram\"}[5m])))",
              "seriesNameFormat": "{{http_status_code}}"
            }
          }
        }
      }
    ]
  }
}
```

---

## Metric Type Reference Table

### Determining Metric Type from Metric Name

```
Pattern in Name          Type       Reason
────────────────────────────────────────────────────
duration, latency, time  histogram  Time-series distributions
body.size, response.size histogram  Distribution of sizes
plans, paths evaluated   histogram  Count distributions

cache.size               gauge      EXCEPTION: Current value
*active*, *queued*       gauge      Current instantaneous values
*count*, *total*         sum        Monotonic counter
operations, requests     sum        Counts that only increase
```

### Quick Reference Table

| Metric Name | Type | Example Aggregation | PromQL Pattern |
|-------------|------|---------------------|-----------------|
| `http.server.request.duration` | histogram | `count` | `histogram_sum(increase(...))` |
| `http.server.request.duration` | histogram | `avg` | `histogram_avg(rate(...))` |
| `http.server.request.duration` | histogram | `p95` | `histogram_quantile(0.95, rate(...))` |
| `apollo.router.cache.size` | gauge | `avg` | `avg(...)` |
| `apollo.router.cache.size` | gauge | `sum` | `sum(...)` |
| `apollo.router.operations` | sum | `count` | `sum(rate(...))` |
| `apollo.router.operations` | sum | `avg` | `avg(rate(...))` |

---

## Common Query Patterns & Examples

### Pattern 1: Histogram Count with Grouping

**Datadog**:
```
count:metric{$service} by {label}.as_count()
```

**PromQL**:
```promql
histogram_sum(sum by (label_name) (increase({
  otel_metric_name="metric_name",
  otel_metric_type="histogram"
}[5m])))
```

**Example - Request Volume by Status**:
```promql
histogram_sum(sum by (http_status_code) (increase({
  otel_metric_name="http_server_request_duration",
  otel_metric_type="histogram"
}[5m])))
```

### Pattern 2: Histogram Percentile with Grouping

**Datadog**:
```
p95:metric{$service} by {label}
```

**PromQL**:
```promql
histogram_quantile(0.95, sum by (label_name, le) (rate({
  otel_metric_name="metric_name",
  otel_metric_type="histogram"
}[5m])))
```

**Example - P95 Latency by Subgraph**:
```promql
histogram_quantile(0.95, sum by (subgraph_name, le) (rate({
  otel_metric_name="http_client_request_duration",
  otel_metric_type="histogram"
}[5m])))
```

### Pattern 3: Gauge Average (No Rate)

**Datadog**:
```
avg:metric{$service} by {label}
```

**PromQL**:
```promql
avg by (label_name) ({
  otel_metric_name="metric_name",
  otel_metric_type="gauge"
})
```

**Example - Cache Size by Type**:
```promql
avg by (kind) ({
  otel_metric_name="apollo_router_cache_size",
  otel_metric_type="gauge"
})
```

### Pattern 4: Histogram Rate (Throughput)

**Datadog**:
```
count:metric{$service}.as_rate()
```

**PromQL**:
```promql
histogram_sum(sum(rate({
  otel_metric_name="metric_name",
  otel_metric_type="histogram"
}[5m])))
```

**Example - Request Throughput**:
```promql
histogram_sum(sum(rate({
  otel_metric_name="http_server_request_duration",
  otel_metric_type="histogram"
}[5m])))
```

### Pattern 5: Counter Rate (Operations/sec)

**Datadog**:
```
sum:metric{$service}.as_rate()
```

**PromQL**:
```promql
sum(rate({
  otel_metric_name="metric_name",
  otel_metric_type="sum"
}[5m]))
```

### Pattern 6: Error Rate Percentage

**Datadog**:
```
(count:metric{...} by {status:"error"} / count:metric{...}) * 100
```

**PromQL**:
```promql
(sum(rate({
  otel_metric_name="metric_name",
  http_status_code=~"4xx|5xx"
}[5m])) / sum(rate({
  otel_metric_name="metric_name"
}[5m]))) * 100
```

---

## Attribute/Label Mapping

Datadog label names → Dash0/PromQL label names:

| Datadog | Dash0/PromQL | Notes |
|---------|--------------|-------|
| `$service` | (remove or add fixed) | Template variable - replace with specific service |
| `$env` | (remove or add fixed) | Template variable - replace with specific env |
| `$version` | (remove or add fixed) | Template variable - replace with specific version |
| `http.response.status_code` | `http_status_code` | Dots → underscores |
| `http.request.method` | `http_method` | Dots → underscores |
| `subgraph.name` | `subgraph_name` | Dots → underscores |
| `graphql.operation.name` | `graphql_operation_name` | Dots → underscores |
| `graphql.operation.type` | `graphql_operation_type` | Dots → underscores |
| `apollo_router_cache_kind` | `kind` | Shortened in Dash0 |
| `cache.type` | `storage` | Cache storage backend |
| `host` / `pod_name` | `dash0_resource_name` | Instance identifier |

---

## Panel Type Selection

Choose the right Dash0 panel type for your visualization:

| Datadog Type | Dash0 Type | Use Case |
|--------------|-----------|----------|
| `timeseries` | `TimeSeriesChart` | Line graphs, multi-series over time |
| `query_value` | `StatChart` | Big numbers, percentages, single values |
| `pie` | `PieChart` | Proportional breakdown |
| `heatmap` | `TimeSeriesChart` | (Use line for aggregated view) |
| `table` | Not supported | (Convert to TimeSeriesChart or StatChart) |

---

## Step-by-Step Conversion Checklist

For each Datadog widget:

- [ ] Extract the metric query
- [ ] Identify metric name
- [ ] Determine metric type (histogram/gauge/sum)
- [ ] Identify aggregation function
- [ ] Find grouping (by clause)
- [ ] Select PromQL pattern based on type + aggregation
- [ ] Build PromQL query
- [ ] Map attribute names (dots to underscores)
- [ ] Choose panel plugin type
- [ ] Create Perses panel JSON
- [ ] Add query display name for legend
- [ ] Test query in Dash0
- [ ] Verify data appears

---

## Common Pitfalls & Fixes

### Pitfall 1: Forgetting Histogram Type in Selector

❌ **Wrong**:
```promql
rate(http_server_request_duration[5m])
```

✅ **Correct**:
```promql
rate({
  otel_metric_name="http_server_request_duration",
  otel_metric_type="histogram"
}[5m])
```

### Pitfall 2: Using rate() on Gauge Metrics

❌ **Wrong**:
```promql
rate(cache_size[5m])  # Gauges don't have rate!
```

✅ **Correct**:
```promql
avg(cache_size)
```

### Pitfall 3: Missing `le` Label in Percentile

❌ **Wrong**:
```promql
histogram_quantile(0.95, sum by (subgraph_name) (rate(...)))
```

✅ **Correct**:
```promql
histogram_quantile(0.95, sum by (subgraph_name, le) (rate(...)))
```

### Pitfall 4: Not Converting Metric Names

❌ **Wrong**:
```promql
{otel_metric_name="http.server.request.duration"}  # Dots!
```

✅ **Correct**:
```promql
{otel_metric_name="http_server_request_duration"}  # Underscores
```

### Pitfall 5: Forgetting Label Name Mapping

❌ **Wrong**:
```promql
sum by (http.response.status_code) (...)  # Datadog name
```

✅ **Correct**:
```promql
sum by (http_status_code) (...)  # Dash0 name
```

---

## Testing Your Conversion

### 1. Validate PromQL Syntax

In Dash0 query editor:
- Paste your PromQL expression
- Check for red error indicators
- Verify "Execute query" returns data

### 2. Compare Results

Run both Datadog and Dash0 queries on same time range:
- Do the numbers match?
- Is the trend the same?
- Do you see expected time-series pattern?

### 3. Check Legend

Does the legend show expected labels?
- Should see metric name or grouped attribute
- Should be readable and distinct

### 4. Validate Display

Does the panel look right?
- Correct chart type?
- Readable axis labels?
- Appropriate scale (linear, log)?

---

## Documentation Reference

### For Reference Lookups

1. **"How do I write this Datadog query in PromQL?"**
   → See [DATADOG_QUERY_REFERENCE.md](DATADOG_QUERY_REFERENCE.md)

2. **"What PromQL functions do I need?"**
   → See [PROMQL_REFERENCE.md](PROMQL_REFERENCE.md)

3. **"How do I structure a Perses dashboard?"**
   → See [PERSES_DASHBOARD_FORMAT.md](PERSES_DASHBOARD_FORMAT.md)

4. **"What's the overall strategy?"**
   → See [CONVERSION_STRATEGY.md](CONVERSION_STRATEGY.md)

---

## Real Example: Converting a Full Widget

### Datadog Widget Definition

```json
{
  "definition": {
    "title": "Request Duration Percentiles",
    "type": "timeseries",
    "requests": [
      {
        "queries": [
          {
            "query": "p95:http.server.request.duration{$service}"
          }
        ]
      }
    ]
  }
}
```

### Step-by-Step Conversion

1. **Extract query**: `p95:http.server.request.duration{$service}`
2. **Metric name**: `http.server.request.duration`
3. **Metric type**: histogram (contains "duration")
4. **Aggregation**: `p95` (95th percentile)
5. **PromQL pattern**: `histogram_quantile(0.95, rate(...[5m]))`
6. **Convert metric name**: `http_server_request_duration`
7. **Panel type**: TimeSeriesChart
8. **Build PromQL**:
   ```promql
   histogram_quantile(0.95, rate({
     otel_metric_name="http_server_request_duration",
     otel_metric_type="histogram"
   }[5m]))
   ```

### Perses Panel Result

```json
{
  "kind": "Panel",
  "spec": {
    "display": {
      "name": "Request Duration Percentiles",
      "description": "95th percentile of request duration"
    },
    "plugin": {
      "kind": "TimeSeriesChart",
      "spec": {}
    },
    "queries": [
      {
        "kind": "TimeSeriesQuery",
        "spec": {
          "display": {
            "name": "P95 Latency"
          },
          "plugin": {
            "kind": "PrometheusTimeSeriesQuery",
            "spec": {
              "query": "histogram_quantile(0.95, rate({otel_metric_name=\"http_server_request_duration\",otel_metric_type=\"histogram\"}[5m]))"
            }
          }
        }
      }
    ]
  }
}
```

---

## Next Steps

1. **Review the reference documents** to understand each piece
2. **Pick one widget** from the Datadog template
3. **Follow the 5-step workflow** to convert it
4. **Test in Dash0** to verify it works
5. **Document any edge cases** you encounter
6. **Repeat for all widgets**

---

## Getting Help

- **Query syntax issues?** Check DATADOG_QUERY_REFERENCE.md and PROMQL_REFERENCE.md
- **Dashboard structure?** Check PERSES_DASHBOARD_FORMAT.md
- **Overall approach?** Check CONVERSION_STRATEGY.md
- **Need a pattern example?** Look in convert.js for similar queries

Good luck with your conversions!
